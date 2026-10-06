import azure.functions as func
import json
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient
import requests
from datetime import datetime
from azure.storage.blob import BlobServiceClient
import time

app = func.FunctionApp()

# runtime detection
from bronze_to_silver import bronze_to_silver
from silver_to_gold import silver_to_gold

tickers = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "IBM", "JPM", "V", "WMT", "DIS", "KO", "NFLX"]

# Azure function app sees this and retains when the function is supossed to run based on the schedule
# Function brings in "credential" to authenticate identity (used to get key vault secret for Alpha vantage API, )
@app.timer_trigger(schedule="0 0 21 * * *", arg_name="myTimer", run_on_startup=False, use_monitor=False) 
def AlphaVantageIngest(myTimer: func.TimerRequest) -> None:
    credential = DefaultAzureCredential()
    client = SecretClient(vault_url = "https://gurbovault.vault.azure.net", credential = credential)
    secret = client.get_secret("AlphaVantageAPI")
    
    upload_blob(secret, credential)
    
# API call to Alpha Vantage, creates clients to access blob storage 
def upload_blob(secret, credential):
    accountUrl = "https://gurbostorage.blob.core.windows.net"
        
    # upload to bronze storage
    bsc = BlobServiceClient(account_url=accountUrl, credential=credential)
    container_client = bsc.get_container_client(container="bronze")
    for ticker in tickers:
        url = f"https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol={ticker}&apikey={secret.value}"
        r = requests.get(url)

        # parse to Json 
        jsonData = r.json()
        if "Time Series (Daily)" not in jsonData:
            print(f"Skipping {ticker} - no data (likely rate limited): {jsonData}")
            continue   # skip this ticker

        data = json.dumps(jsonData)
        filename = f"AlphaVantage/AV-{ticker}-{datetime.now().strftime('%Y-%m-%d-%H-%M')}.json"

        # send data to bronze
        container_client.upload_blob(name=filename, data=data, overwrite=True)
        print(f"Raw Data for {ticker} been sent to bronze.")  
        time.sleep(15)


##FOR LOCAL TESTING##
# if __name__ == "__main__":
#     AlphaVantageIngest(None)


# publish to azure functionapp so it runs on a timer (based on environment)(need to have timer trigger active not commented out)
    # func azure functionapp publish gurbosFunctionApp
    
# check if functionapp functions have been deployed
    # az functionapp function list --name gurbosFunctionApp --resource-group rgFindashDev -o table
    
# start venv (while in the correct folder in directoryd)
    # source .venv/Scripts/activate