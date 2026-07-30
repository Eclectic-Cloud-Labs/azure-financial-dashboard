import azure.functions as func
import datetime
import json
import logging
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient
import requests

app = func.FunctionApp()
credential = DefaultAzureCredential()
client = SecretClient(vault_url = "https://gurbosvault.vault.azure.net", credential = credential)
secret = client.get_secret("AlphaVantageAPI")

url = f'https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=IBM&apikey={secret.value}'
r = requests.get(url)
data = r.json()

filename = ""

@app.timer_trigger(schedule="0 0 21 * * *", arg_name="myTimer", run_on_startup=False, use_monitor=False) 
def AlphaVantageIngest(myTimer: func.TimerRequest) -> None:
    None
    # if myTimer.past_due:
    #     logging.info('The timer is past due!')

    # logging.info('Python timer trigger function executed.')
    
def testFunc():
    print(data)

    
if __name__ == "__main__":
    testFunc()