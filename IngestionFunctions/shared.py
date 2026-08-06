import azure.functions as func
import json
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient
import requests
from datetime import datetime
from azure.storage.blob import BlobServiceClient
app = func.FunctionApp()

filename = f"AlphaVantage/AV-{datetime.now().strftime('%Y-%m-%d-%H-%M')}.json"
accountUrl = "https://gurbostorage.blob.core.windows.net"
credential = DefaultAzureCredential()
client = SecretClient(vault_url = "https://gurbosvault.vault.azure.net", credential = credential)

bsc = BlobServiceClient(account_url=accountUrl, credential=credential)
container_client = bsc.get_container_client(container="bronze")
container_client.upload_blob(name=filename, data=data)


secret = client.get_secret("AlphaVantageAPI")