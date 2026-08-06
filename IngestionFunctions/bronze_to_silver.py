from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobServiceClient
import azure.functions as func

containerName = "bronze"
blobName = "AlphaVantage"
credential = DefaultAzureCredential()
accountUrl = "https://gurbostorage.blob.core.windows.net"

bsc =  BlobServiceClient(credential=credential, account_url=accountUrl)
container_client = bsc.get_container_client(container=containerName)
blob_client = container_client.get_blob_client(blob=blobName)
blob_client = bsc.get_blob_client(container=containerName, blob="AlphaVantage")

# @app.timer_trigger(schedule="0 15 21 * * *", arg_name="myTimer", run_on_startup=False, use_monitor=False) 
def bronze_to_silver(myTimer: func.TimerRequest) -> None:
    blobs = container_client.list_blobs()
    newBlob = None
    for blob in blobs:
        if newBlob is None or blob.last_modified > newBlob.last_modified:
            newBlob = blob
    
    data = container_client.download_blob(newBlob).readall().decode("utf-8")
    print(data)


if __name__ == "__main__":
    bronze_to_silver(None)
