import azure.functions as func
import json
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient
import requests
from datetime import datetime
from azure.storage.blob import BlobServiceClient
app = func.FunctionApp()

# Azure function app sees this and retains when the function is supossed to run based on the schedule
# Function brings in "credential" to authenticate identity (used to get key vault secret for Alpha vantage API, )
@app.timer_trigger(schedule="0 0 21 * * *", arg_name="myTimer", run_on_startup=False, use_monitor=False) 
def AlphaVantageIngest(myTimer: func.TimerRequest) -> None:
    credential = DefaultAzureCredential()
    client = SecretClient(vault_url = "https://gurbosvault.vault.azure.net", credential = credential)
    secret = client.get_secret("AlphaVantageAPI")
    
    upload_blob(secret, credential)
    
# API call to Alpha Vantage, creates clients to access blob storage 
def upload_blob(secret, credential):
    url = f"https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=IBM&apikey={secret.value}"
    r = requests.get(url)
    # parse to Json 
    data = json.dumps(r.json())
    filename = f"AV-{datetime.now().strftime('%Y-%m-%d-%H-%M')}.json"
    
    accountUrl = "https://gurbostorage.blob.core.windows.net"
    
    bsc = BlobServiceClient(account_url=accountUrl, credential=credential)
    container_client = bsc.get_container_client(container="bronze")
    container_client.upload_blob(name=filename, data=data)

    
# if __name__ == "__main__":
#     AlphaVantageIngest(None)