from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobServiceClient
import azure.functions as func
import json
import pandas as pd
import io
from function_app import app

bronzeContainer = "bronze"
silverContainer = "silver"
credential = DefaultAzureCredential()
accountUrl = "https://gurbostorage.blob.core.windows.net"

bsc =  BlobServiceClient(credential=credential, account_url=accountUrl)


@app.timer_trigger(schedule="0 15 21 * * *", arg_name="myTimer", run_on_startup=False, use_monitor=False) 
def bronze_to_silver(myTimer: func.TimerRequest) -> None:
    
    container_client = bsc.get_container_client(container=bronzeContainer)
    blobs = container_client.list_blobs()
    newBlob = None
    newBlob_date = None
    
    # looks for the newest blob file for most recent reports
    for blob in blobs:
        if newBlob is None or blob.last_modified > newBlob.last_modified:
            newBlob = blob
            newBlob_date = blob.last_modified
    
    df = transform(newBlob, newBlob_date, container_client)
    sendToSilver(df)


##HELPER FUNCTIONS##
# cleans raw data from Time Series (Daily) key, add new titles, make all applicable values into float types, index/date column turns into real datetime obj's, and returns df for next function to use 
def transform(newBlob, newBlob_date, container_client):
    print(newBlob_date)
    data = container_client.download_blob(newBlob).readall().decode("utf-8")
    data = json.loads(data) 
    data = data["Time Series (Daily)"]
    df = pd.DataFrame.from_dict(data, orient='index')
    df.rename(columns={"1. open": "Symbol_open","2. high": "Symbol_High","3. low": "Symbol_low","4. close": "Symbol_close","5. volume": "Symbol_volume"}, inplace=True)
    df = df.astype(float)
    df.index = pd.to_datetime(df.index)
    df.index.name = "Stock_date"
    return df

# sends parquet file to silver storage 
def sendToSilver(df):
    # create in memory byte file location
    buffer = io.BytesIO()
    
    # creates parquet file at in memory buffer location. Pointer ends at the end of the file, so seek resets it back to the beginning
    df.to_parquet(buffer, engine="pyarrow")
    buffer.seek(0)
    
    # get silver + upload
    silver_Container_client = bsc.get_container_client(container=silverContainer)
    silver_Container_client.upload_blob(name="AlphaVantage/ohlc.parquet", data=buffer, overwrite=True)



# FOR LOCAL TESTING##
# if __name__ == "__main__":
#     bronze_to_silver(None)
