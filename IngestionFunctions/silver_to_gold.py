from function_app import app
from azure.storage.blob import BlobServiceClient
from azure.identity import DefaultAzureCredential
import azure.functions as func
import pandas as pd
from io import BytesIO


# @app.timer_trigger(schedule="0 20 21 * * *", arg_name="myTimer", run_on_startup=False, use_monitor=False) 
def silver_to_gold(myTimer: func.TimerRequest) -> None:
    credential = DefaultAzureCredential()
    accountUrl = "https://gurbostorage.blob.core.windows.net"

    bsc = BlobServiceClient(accountUrl, credential=credential)
    silverContName = 'silver'
    goldContName = 'gold'
    silver_container_client = bsc.get_container_client(silverContName)
    blobs = silver_container_client.list_blobs()
    gold_container_client = bsc.get_container_client(goldContName)
    
    df = read_silver(blobs, silver_container_client)
    df = transform_silver_to_gold(df)
    sendBlob(df, gold_container_client)


# Helper Functions
def read_silver(blobs, silver_container_client):
    newBlob = None
    for blob in blobs:
        if ".parquet" in blob.name:
            newBlob = blob

    data_blob_client = silver_container_client.get_blob_client(blob=newBlob.name)
    df = data_blob_client.download_blob().readall()
    
    df = pd.read_parquet(BytesIO(df))
    
    return df

def transform_silver_to_gold(df):
    # list is backwards in reference to pandas functions so i flipped it 
    df = df.sort_index(ascending=True)
    
    # SMA calculation
    df["sma_five"] = df["close"].rolling(5).mean()
    df["sma_ten"] = df["close"].rolling(10).mean()
    df["sma_twenty"] = df["close"].rolling(20).mean()
    
    # RSI calculation
    difference = df["close"].diff()
    gain_diff = difference.where(difference > 0, 0)
    loss_diff = difference.where(difference < 0, 0).abs()
    gain_avg = gain_diff.rolling(14).mean()
    loss_avg  = loss_diff.rolling(14).mean()
    rs = gain_avg / loss_avg
    df["rsi"] = 100 - (100 / (1 + rs))
    
    # Volatility
    df["volatility"] = df["close"].pct_change().rolling(20).std()
    
    # reflipped
    df = df.sort_index(ascending=False)
    
    return df
    
def sendBlob(df, gold_container_client):
    filename = "AlphaVantage/technical_indicators.parquet"
    buffer = BytesIO()
    df.to_parquet(buffer, engine="pyarrow")
    buffer.seek(0)
    gold_container_client.upload_blob(name=filename, data= buffer, overwrite=True)



# FOR LOCAL TESTING##
# if __name__ == "__main__":
#     silver_to_gold(None)