# IngestionFunctions
Python Azure Function App (v2 model, Linux Consumption) - pulls Alpha Vantage market data into the 'bronze' container of the ADLS Gen2 data lake.

## What it does
- [Ingestion File](./function_app.py) ingests API data into 'bronze' and is timer triggered daily at '0 0 21 * * *' (~1hr EDT after markets close). Reads Alpha Vantage API key from Key Vault via 'DefaultAzureCredential', calls 'TIME_SERIES_DAILY', writes raw JSON to 'bronze' as one timestamped file per run.
- [Transformation file](./bronze_to_silver.py) reads data from 'bronze' container using DefaultAzureCredential. Using a simple if statement and comparing 'last_modified' datetime obj from the list of blobs, the correct blob is consistently being pulled.

## Auth
Uses 'DefaultAzureCredential' throughout. No connection strings or keys in code. System assigned MI in Azure. See 'infra/README.md' for the RBAC role assignments granted to the Function App's MI.

## Setup 
1. Installed Azure Functions Core Tools ('func')
2. 'func init IngestionFunctions --python' - chose newer Python model
3. 'func new --template "Timer Trigger" --name AlphaVantageIngest' - generated the timer stub
4. Added 'local.settings.json', 'bin/', 'obj/', '.python_packages/' to '.gitignore'
5. Set CRON schedule '0 0 21 * * *' for daily post-market-close ingestion
6. func new --template "Timer Trigger" --name "bronze_to_silver" (for transformation of data)
7. Created new [shared.py](./shared.py) file to store all recurring variables 

## Local dev
Requires Azure Functions Core Tools. 'local.settings.json' holds local-only config (gitignored). 'DefaultAzureCredential' falls back to your 'az login' locally; MI only exists once deployed.

## Dependencies
See 'requirements.txt' - 'azure-functions', 'azure-identity', 'azure-keyvault-secrets', 'requests'.

## Deployment troubleshooting log (resolved)
- 'func azure functionapp publish' initially failed - app doesn't support remote build on some paths. '--build local' surfaced a deeper issue
- Local build failed - publish's upload step needed key-based storage auth, but funcStorage had 'allowSharedKeyAccess: false' (matching zero-key design). Blocked the upload
- Root cause: 'func publish' looks for a plain AzureWebJobsStorage connection-string app setting for its own package-staging step, separate from the app's identity-based runtime auth (which was already correctly configured)
- Fixed by adding 'AzureWebJobsStorage' as a connection string in the app setting using 'listKeys()' on funcStorage
- Connection string was directly in the app setting but it now lives as a Key Vault secret (created via Bicep 'listKeys()'), referenced by the app setting with '@Microsoft.KeyVault(SecretUri=...)'. Function App's MI already had Key Vault Secrets User so no new RBAC needed
- Also hit and fixed: a Bicep circular dependency (functionApp ↔ vault) caused by a role assignment sitting in the wrong module - moved it into functionapp.bicep so the dependency only flows one direction
- Confirmed working end-to-end: 'func publish' succeeds, 'AlphaVantageIngest' registered and enabled on the deployed Function App

## Misc
- Local Python is 3.13, deployed runtime is Python 3.11 (Azure Functions doesn't yet support 3.13 for this consumption plan - checked through the Portal) - publishing the code and 
