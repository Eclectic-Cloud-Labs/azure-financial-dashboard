# IngestionFunctions
Python Azure Function App (v2 model, Linux Consumption) - pulls Alpha Vantage market data into the 'bronze' container of the ADLS Gen2 data lake.

## What it does
- [Ingestion file](./function_app.py) ingests API data into 'bronze' and is timer triggered daily at '0 0 21 * * *' (~1hr EDT after markets close). Reads Alpha Vantage API key from Key Vault via 'DefaultAzureCredential', calls 'TIME_SERIES_DAILY', writes raw JSON to 'bronze' as one timestamped file per run.
- [Transformation file](./bronze_to_silver.py) reads data from 'bronze' container using DefaultAzureCredential. Using a simple if statement and comparing 'last_modified' datetime obj from the list of blobs, the correct blob is consistently being pulled. Cleans and casts the data with pandas, writes structured Parquet to 'silver'.
- [Gold file](./silver_to_gold.py) reads silver's Parquet, computes SMA (5/10/20-day), RSI (14-day), and rolling volatility with pandas. Writes the result to 'gold' as Parquet and to Azure SQL ('Technical_indicators' table), Entra-authenticated, no passwords.

## Auth
Uses 'DefaultAzureCredential' throughout. No connection strings or keys in code. System assigned MI in Azure. See 'infra/README.md' for the RBAC role assignments granted to the Function App's MI.

## Setup
1. Installed Azure Functions Core Tools ('func')
2. 'func init IngestionFunctions --python' - chose newer Python model
3. 'func new --template "Timer Trigger" --name AlphaVantageIngest' - generated the timer stub
4. Added 'local.settings.json', 'bin/', 'obj/', '.python_packages/' to '.gitignore'
5. Set CRON schedule '0 0 21 * * *' for daily post-market-close ingestion
6. 'func new --template "Timer Trigger" --name "bronze_to_silver"' (for transformation of data)
8. Added SQL server access: enabled Microsoft Entra authentication on the server, assigned an Entra admin, added local machine's IP to the firewall list, set 'minimalTlsVersion' to 1.2
9. Created the 'Technical_indicators' table via SQL query - primary key is composite ('Symbol', 'Stock_date') since 'Symbol' repeats for every trading day

## Local dev
Requires Azure Functions Core Tools. 'local.settings.json' holds local-only config (gitignored). 'DefaultAzureCredential' falls back to your 'az login' locally; MI only exists once deployed.

## Dependencies
See [Requirements](./requirements.txt) - 'azure-functions', 'azure-identity', 'azure-keyvault-secrets', 'azure-storage-blob', 'requests', 'pandas', 'pyarrow', 'sqlalchemy', 'pyodbc'.

## Deployment troubleshooting log (resolved)
- 'func azure functionapp publish' initially failed - app doesn't support remote build on some paths. Using '--build local' gave a deeper issue
- Local build failed - publish's upload step needed key-based storage auth, but funcStorage had 'allowSharedKeyAccess: false' (matching zero-key design) which blocked the upload
- 'func publish' looks for a plain AzureWebJobsStorage connection-string app setting, separate from the app's identity based runtime auth (which was already correctly configured)
- Fixed by adding 'AzureWebJobsStorage' as a connection string in the app setting using 'listKeys()' on funcStorage within the Bicep code
- Connection string was directly in the app setting but was moved as a Key Vault secret (created via Bicep using 'listKeys()'), referenced by the app setting with '@Microsoft.KeyVault(SecretUri=...)'. Function App's MI already had Key Vault Secrets User so no new RBAC needed
- Also hit and fixed: a Bicep circular dependency (functionApp ↔ vault) caused by a role assignment sitting in the wrong module - moved it into functionapp.bicep so the dependency only flows one direction
- Confirmed working end to end: 'func publish' succeeds, 'AlphaVantageIngest' registered and enabled on the deployed Function App

## Silver → Gold → SQL (the hard part)
- Chose not to use ADF here - too heavy for this data volume, and this project purposely covers new ground (app-tier identity) rather than reusing prior ADF experience
- Tried 'mssql-python' (Microsoft's newer driver) first. Hit TLS errors across multiple tools (Python, VS Code). Diagnosed via 'openssl s_client' (confirmed TLS 1.2 itself was fine) and 'Get-OdbcDriver' (found only a legacy driver installed, not a real ODBC driver) - installed [ODBC Driver 18 for SQL Server](https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server?view=sql-server-ver17) directly
- Tried using  SQLAlchemy with mssql-python's dialect ('mssql+mssqlpython'). This only exists in SQLAlchemy 2.1.0b2 which is a pre-release and too new for a project recreating a production env. Reverted to 'pyodbc'. It is older, but mature and well documented
- 'pandas.to_sql()' needs a SQLAlchemy 'Engine', not a raw connection - bridged the two with SQLAlchemy's 'creator' parameter [Link](https://docs.sqlalchemy.org/en/21/core/engines.html)
- Built Entra token auth manually for 'pyodbc'. Followed Microsoft's documented ODBC access-token attribute format (SQL_COPT_SS_ACCESS_TOKEN): needed to fetch a token scoped to 'https://database.windows.net/.default', encode 'utf-16-le', pack into a length-prefixed binary struct per Microsoft's spec [link](docs.microsoft.com/en-us/sql/connect/odbc/using-azure-active-directory)
- SQL data-plane access is not Azure RBAC so I granted FunctionApp the role via 'CREATE USER ... FROM EXTERNAL PROVIDER' + 'db_datawriter'/'db_datareader' inside the database itself
- Noted: the "Allow Azure services and resources to access this server" firewall rule is convenient for dev but explicitly not recommended for production - worth revisiting for hardening later
- First deployed version registered zero functions. The cause of this was 'pyodbc' missing from 'requirements.txt', which broke the whole file's import chain, not just the SQL step
- Portal's Test/Run failed ('Failed to fetch'). This turned out to be a CORS issue, fixed by adding 'https://portal.azure.com' to the Function App's allowed origins
- First real deployed run of 'silver_to_gold' threw an error with no detail in Log Stream - traced it properly via Application Insights:
```kql
  exceptions
  | where timestamp > ago(1h)
  | order by timestamp desc
```
- Root cause: primary-key violation - 'to_sql(if_exists="append")' was resending the full ~100-day history every run, and SQL Server rejects the entire batch on any single duplicate row. Fixed by writing only the newest row each run, matching the actual once-daily cadence

## Misc
- Local Python is 3.13, deployed runtime is Python 3.11 (Azure Functions doesn't yet support 3.13 for this consumption plan - checked through the Portal). Remote build handles this correctly regardless of local version.