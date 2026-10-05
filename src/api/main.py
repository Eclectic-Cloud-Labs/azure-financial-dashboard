from fastapi import FastAPI, HTTPException, Depends
from azure.identity import DefaultAzureCredential, get_bearer_token_provider
import struct
import pyodbc
import time
from fastapi.middleware.cors import CORSMiddleware
from auth import validate_token
import openai
import json

## LOCAL TESTING ##
# import asyncio

# allows CORS to work (this allows App.tsx to access the API endpoints below locally)
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins = ["*"],
    allow_methods = ["*"],
    allow_headers = ["*"]
)

def get_conn():
    SQL_COPT_SS_ACCESS_TOKEN = 1256
    credential = DefaultAzureCredential()
    token = credential.get_token("https://database.windows.net/.default")
    token_bytes = token.token.encode("utf-16-le")
    token_struct = struct.pack(f'<I{len(token_bytes)}s', len(token_bytes), token_bytes)
    
    conn_str = (
        "Driver={ODBC Driver 18 for SQL Server};Server=gurbosSqlServer.database.windows.net;Database=gurbosSqlDb;Encrypt=yes;"
    )
    max_attempts = 5
    for attempt in range(max_attempts):
        try:
            print(f"Attempt {attempt+1} to connect to SQL Server")
            return pyodbc.connect(conn_str, attrs_before={SQL_COPT_SS_ACCESS_TOKEN: token_struct}, timeout=60)
            
        except pyodbc.Error as er:
            print(f"Connection error: {str(er)}")
            if "40613" in str(er):
                time.sleep(60)  
                continue
            elif str(er):
                raise Exception(str(er))
    raise Exception(f"Failed to connect after {max_attempts} attempts")



# helper funcs
def aiSetup():
    credential = DefaultAzureCredential()
    token_provider = get_bearer_token_provider(credential, "https://cognitiveservices.azure.com/.default")
    openai_client = openai.AzureOpenAI(
        azure_endpoint="https://gurbosopenai.openai.azure.com",
        azure_ad_token_provider=token_provider,
        api_version="2024-10-21",
    )
    return openai_client

def getChatResp(client, msg, tools=None):
    resp = client.chat.completions.create(
        model="gpt-5-mini",
        messages=msg,
        tools=tools
    )
    return resp

def get_metrics(symbol: str) -> dict:
    with get_conn() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT TOP 1 * FROM Technical_indicators WHERE Symbol = ?", symbol)
        row = cursor.fetchone()
        if row is None:
            return {"error": f"No data for {symbol}"}
        titles = [t[0] for t in cursor.description]
        return dict(zip(titles, row))



# ENDPOINTS
@app.get("/")
async def root(user = Depends(validate_token)):
    with get_conn() as conn:
        cursor: pyodbc.cursor = conn.cursor()
        cursor.execute("SELECT TOP 1 * FROM Technical_indicators")
        row = cursor.fetchone()

        titles = []
        for title in cursor.description:
            titles.append(title[0])

        return dict(zip(titles, row))


@app.get("/market/{symbol}")
async def getSymbol(symbol: str, user = Depends(validate_token)):
    # roles = user.get("roles", [])
    # if not roles:
    #     raise HTTPException(status_code=403, detail="No Role Assigned.")
    data = get_metrics(symbol)
    if "error" in data:
        raise HTTPException(status_code=404, detail=data["error"])
    return data




# AI ENDPOINTS
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_metrics",
            "description": "Get the latest technical indicators (price, RSI, SMAs, volatility) for a given stock symbol.",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "The stock ticker symbol, e.g. IBM"
                    }
                },
                "required": ["symbol"]
            }
        }
    }
]

# AI calls 
@app.get("/advice/brief/{symbol}")
async def aiClient(symbol: str):

    data = get_metrics(symbol)
    if "error" in data:
        raise HTTPException(status_code=404, detail=data["error"])

    msg = [
        {"role": "system", "content": """You are a financial data assistant. Describe the technical posture of a stock using ONLY the metrics provided and standard technical-analysis conventions:
        - RSI > 70 = overbought, RSI < 30 = oversold, 30-70 = neutral momentum
        - Price above its SMAs = uptrend, below = downtrend
        - SMA ordering (5 > 10 > 20) = short-term bullish alignment, reverse = bearish
        - Higher volatility = larger price swings

        Rules you must follow:
        - Use only the numbers given. Never invent or estimate values.
        - Never predict future prices or give buy/sell/hold recommendations.
        - Describe what the indicators show, nothing more.
        - Keep it to 3-4 sentences."""}, 
        {"role": "user", "content": f"""Technical indicators for {data['Symbol']} as of {data['Stock_date']}: Close: ${data['Symbol_close']}, RSI (14): {round(data['rsi'], 2)}, SMA5: {round(data['sma_five'], 2)}, SMA10: {round(data['sma_ten'], 2)}, SMA20: {round(data['sma_twenty'], 2)}, Volatility (20d): {round(data['volatility'], 2)}. Describe the technical posture."""}
    ]
    client = aiSetup()
    response = getChatResp(client, msg)
    
    return {
        "symbol": symbol,
        "as_of": data['Stock_date'],
        "brief": response.choices[0].message.content,
        "disclaimer": "This is an automated technical summary, not financial advice. Data as of the date shown."
    }

@app.get("/advice/ask/{question}")
async def askAdvice(question: str):

    messages = [
        {"role": "system", "content": "You are a financial data assistant. Use the getMetrics function to fetch data when you need it. Describe technical posture using standard conventions. Only ever give the metrics available via get_metrics. Never invent numbers or give buy/sell advice."},
        {"role": "user", "content": question}
    ]
    client = aiSetup()
    response = getChatResp(client, messages, tools)

    # once response is received, we go into gpt message (which is an assistant call saying i need getMetrics for {Symbol} and append that to messages)
    response_message = response.choices[0].message
    messages.append(response_message)
    
    if response_message.tool_calls:
    # get the symbol gpt needs to run getMetrics
    # symbol and data are only within the scope of FOR loop - fix later 
        for toolCall in response_message.tool_calls:
            args = json.loads(toolCall.function.arguments)
            data = get_metrics(args["symbol"])          # returns dict OR {"error": ...}
            # append the result as a tool message, referencing the call id
            messages.append({
                "role": "tool",
                "tool_call_id": toolCall.id,
                "content": json.dumps(data, default=str)  # error dict gets sent to GPT too
            })
    else:
        return response_message.content

    # second call. GPT now has the data, writes the final answer
    final_response = getChatResp(client, messages)
    return {
    "answer": final_response.choices[0].message.content,
    "disclaimer": "This is an automated technical summary, not financial advice."
}


# for cors 


# @app.get("/market/symbols")
# async def getAllSymbols(symbol: str):
#     with get_conn() as conn:
#         cursor: pyodbc.cursor = conn.cursor()
#         cursor.execute("SELECT TOP 1 * FROM All_Symbols")
#         row = cursor.fetchone()


# asyncio.run(getSymbol("IBM"))
        