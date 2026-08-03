# IngestionFunctions
Python Azure Function App (v2 model, Linux Consumption) - pulls Alpha Vantage market data into the 'bronze' container of the ADLS Gen2 data lake.

## What it does
Timer-triggered daily at '0 0 21 * * *' (~1hr EDT after markets close). Reads Alpha Vantage API key from Key Vault via 'DefaultAzureCredential', calls 'TIME_SERIES_DAILY', writes raw JSON to 'bronze' as one timestamped file per run.

## Auth
Uses 'DefaultAzureCredential' throughout. No connection strings or keys in code. System assigned MI in Azure. See 'infra/README.md' for the RBAC role assignments granted to the Function App's MI.

## Setup 
1. Installed Azure Functions Core Tools ('func')
2. 'func init IngestionFunctions --python' - chose newer Python model
3. 'func new --template "Timer Trigger" --name AlphaVantageIngest' - generated the timer stub
4. Added 'local.settings.json', 'bin/', 'obj/', '.python_packages/' to '.gitignore'
5. Set CRON schedule '0 0 21 * * *' for daily post-market-close ingestion

## Local dev
Requires Azure Functions Core Tools. 'local.settings.json' holds local-only config (gitignored). 'DefaultAzureCredential' falls back to your 'az login' locally; MI only exists once deployed.

## Dependencies
See 'requirements.txt' - 'azure-functions', 'azure-identity', 'azure-keyvault-secrets', 'requests'.



## Deployment troubleshooting log
- 'func azure functionapp publish' failed - app doesn't support remote build. Tried '--build local'
- Local build then failed - publish's upload step needs key-based storage auth, but funcStorage had 'allowSharedKeyAccess: True' (matches the zero-key design). Blocked the upload
- Flipped 'allowSharedKeyAccess: true' on funcStorage only (not the data lake) - pragmatic compromise, func publish doesn't fully support identity-only storage for its own package staging yet
- Still figuring out: do I need a plain 'AzureWebJobsStorage' connection string alongside the identity-based settings, or does CI/CD deploy (GitHub Actions, azure/functions-action) skip this problem entirely