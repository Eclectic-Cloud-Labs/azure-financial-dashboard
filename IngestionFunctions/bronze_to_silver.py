from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobServiceClient
import azure.functions as func
import json
import pandas as pd
import io
from function_app import app

bronzeContainer = "bronze"
silverContainer = "silver"

@app.timer_trigger(schedule="0 15 21 * * *", arg_name="myTimer", run_on_startup=False, use_monitor=False) 
def bronze_to_silver(myTimer: func.TimerRequest) -> None:
    credential = DefaultAzureCredential()
    accountUrl = "https://gurbostorage.blob.core.windows.net"
    bsc = BlobServiceClient(credential=credential, account_url=accountUrl)
    container_client = bsc.get_container_client(container=bronzeContainer)
    blobs = list(container_client.list_blobs())
    
    # find the newest blob PER symbol
    newest_per_symbol = {}   # {symbol: blob}
    for blob in blobs:
        # filename format: AlphaVantage/AV-{SYMBOL}-{timestamp}.json
        parts = blob.name.split("-")
        if len(parts) < 2:
            print(f"Skipping incorrect blob name {blob.name}")
            continue
        
        symbol = parts[1]
        if symbol not in newest_per_symbol or blob.last_modified > newest_per_symbol[symbol].last_modified:
            newest_per_symbol[symbol] = blob

    # process each symbol's newest blob
    for symbol, blob in newest_per_symbol.items():
        df = transform(blob, container_client, symbol)
        sendToSilver(df, bsc, symbol)



##HELPER FUNCTIONS##
# cleans raw data from Time Series (Daily) key, add new titles, make all applicable values into float types, index/date column turns into real datetime obj's, and returns df for next function to use 
def transform(newBlob, container_client, symbol):
    data = container_client.download_blob(newBlob).readall().decode("utf-8")
    data = json.loads(data) 
    data = data["Time Series (Daily)"]
    
    df = pd.DataFrame.from_dict(data, orient='index')
    df.rename(columns={"1. open": "Symbol_open","2. high": "Symbol_High","3. low": "Symbol_low","4. close": "Symbol_close","5. volume": "Symbol_volume"}, inplace=True)
    df = df.astype(float)
    df.index = pd.to_datetime(df.index, format="%Y-%m-%d")
    df.index.name = "Stock_date"
    df["Symbol"] = symbol 
    return df

# sends parquet file to silver storage 
def sendToSilver(df, bsc, symbol):
    # create in memory byte file location
    buffer = io.BytesIO()
    
    # creates parquet file at in memory buffer location. Pointer ends at the end of the file, so seek resets it back to the beginning
    df.to_parquet(buffer, engine="pyarrow")
    buffer.seek(0)
    
    # get silver + upload
    silver_Container_client = bsc.get_container_client(container=silverContainer)
    silver_Container_client.upload_blob(name=f"AlphaVantage/{symbol}-ohlc.parquet", data=buffer, overwrite=True)



# FOR LOCAL TESTING##
# if __name__ == "__main__":
#     bronze_to_silver(None)
