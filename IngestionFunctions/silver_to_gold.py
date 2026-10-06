from function_app import app
from azure.storage.blob import BlobServiceClient
from azure.identity import DefaultAzureCredential
import azure.functions as func
import pandas as pd
from io import BytesIO
import struct
from sqlalchemy import create_engine, text
import pyodbc
import time


@app.timer_trigger(schedule="0 20 21 * * *", arg_name="myTimer", run_on_startup=False, use_monitor=False) 
def silver_to_gold(myTimer: func.TimerRequest) -> None:
    credential = DefaultAzureCredential()
    accountUrl = "https://gurbostorage.blob.core.windows.net"

    bsc = BlobServiceClient(accountUrl, credential=credential)
    silverContName = 'silver'
    goldContName = 'gold'
    silver_container_client = bsc.get_container_client(silverContName)
    gold_container_client = bsc.get_container_client(goldContName)
    
    blobs = silver_container_client.list_blobs()
    

    for blob in blobs:
        if ".parquet" not in blob.name:
            continue
        raw = silver_container_client.get_blob_client(blob.name).download_blob().readall()
        df = pd.read_parquet(BytesIO(raw))
        symbol = df["Symbol"].iloc[0]
        
        df = transform_silver_to_gold(df)
        sendBlob(df, gold_container_client, symbol)
        toSql(df, credential)


def transform_silver_to_gold(df):
    # list is backwards in reference to pandas functions so i flipped it 
    df = df.sort_index(ascending=True)
    
    # SMA calculation
    df["sma_five"] = df["Symbol_close"].rolling(5).mean()
    df["sma_ten"] = df["Symbol_close"].rolling(10).mean()
    df["sma_twenty"] = df["Symbol_close"].rolling(20).mean()
    
    # RSI calculation
    difference = df["Symbol_close"].diff()
    gain_diff = difference.where(difference > 0, 0)
    loss_diff = difference.where(difference < 0, 0).abs()
    gain_avg = gain_diff.rolling(14).mean()
    loss_avg  = loss_diff.rolling(14).mean()
    rs = gain_avg / loss_avg
    df["rsi"] = 100 - (100 / (1 + rs))
    
    # Volatility
    df["volatility"] = df["Symbol_close"].pct_change().rolling(20).std()
    
    # reflipped
    df = df.sort_index(ascending=False)
    df = df.reset_index()
    
    return df
    
def sendBlob(df, gold_container_client, symbol):
    filename = f"AlphaVantage/{symbol}_technical_indicators.parquet"
    buffer = BytesIO()
    df.to_parquet(buffer, engine="pyarrow")
    buffer.seek(0)
    gold_container_client.upload_blob(name=filename, data= buffer, overwrite=True)
    
def toSql(df, credential):
    SQL_COPT_SS_ACCESS_TOKEN = 1256
    
    def get_conn():
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
                print(f"SQL connection error: {str(er)}")
                if "40613" in str(er):
                    time.sleep(60)  
                    continue
                elif str(er):
                    raise Exception(str(er))
        raise Exception(f"Failed to connect after {max_attempts} attempts")


    symbol = df.iloc[0]["Symbol"]
    # gets the first row from df so i only insert that into the sql table
    # double [[]] so it keep it as a df instead of a series 
    engine = create_engine("mssql+pyodbc://", creator=get_conn)
    # checks if there is data in the sql database and inserts full data if not
    with engine.connect() as connection:
        tableExists = connection.execute(text("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'Technical_indicators'")).scalar() > 0 # table existence checker
        
        if not tableExists:
            print("Table does not exist. create it manually first. Skipping insert.")
            return
        symbolExists = connection.execute(
            text("SELECT COUNT(*) FROM Technical_indicators WHERE Symbol = :sym"), {"sym": symbol}
        ).scalar() > 0

        if not symbolExists:
            print("No previous data exists, inserting full table")
            df.to_sql("Technical_indicators", con=engine, if_exists='append', index=False)
        else:
            # datafram instead of series
            newest = df.iloc[[0]]
            newest_date = newest.iloc[0]["Stock_date"]
            dateExists = connection.execute(
                text("SELECT COUNT(*) FROM Technical_indicators WHERE Symbol = :sym AND Stock_date = :date"),
                {"sym": symbol, "date": newest_date}
            ).scalar() > 0

            if dateExists:
                print(f"{symbol} already has {newest_date}, skipping")
            else:
                newest.to_sql("Technical_indicators", con=engine, if_exists="append", index=False)
                print(f"Added newest row for {symbol} ({newest_date})")

# FOR LOCAL TESTING##

# if __name__ == "__main__":
#     silver_to_gold(None)