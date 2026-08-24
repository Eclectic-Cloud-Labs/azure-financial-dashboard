# azure-financial-dashboard
React dashboard providing information about public investment markets with Bicep IaC from day one. 

# Status
- Phase 2 complete - full bronze → silver → gold → SQL pipeline built and working. Planning Phase 3

## Phase 1
- Created Entra app registration with service principal (scoped to subscription), 2 federated credentials implemented for 'Pull request' and Deploy for Github Actions OIDC
- [Main](./infra/main.bicep) - Scoped to subscription to deploy resource group, budget, and log analytics workspace
- CI/CD 
    - 'infra-pr.yml' - runs 'bicep-deploy' what-if check on every PR
    - 'infra-deploy.yml' - deploys to azure automatically on merge to 'main'

## Phase 2 
- Deployed ADLS Gen2 storage (bronze/silver/gold containers), Key Vault (RBAC-mode), Azure SQL serverless (Entra-only auth) via Bicep, region adjusted for PAYG subscription restrictions (SQL + Function App on 'westus2', rest on 'eastus')
- [IngestionFunctions](./IngestionFunctions) - Python Function App (v2 model on Linux Consumption plan), system-assigned MI, zero connection strings
    - 'AlphaVantageIngest' - timer-triggered daily, pulls Alpha Vantage daily OHLCV, lands raw JSON in 'bronze/AlphaVantage/' blob storage
    - 'bronze_to_silver' - cleans raw JSON into structured OHLCV using pandas, lands Parquet in 'silver/AlphaVantage/'
    - 'silver_to_gold' - computes SMA/RSI/volatility from silver, writes to 'gold/AlphaVantage/technical_indicators.parquet' and Azure SQL (Entra auth, no passwords)
    - Full RBAC permissions given using least privilege principle: Blob/Queue/Table Data Contributor, Key Vault Secrets User, Monitoring Metrics Publisher, all scoped to the Function App's MI. SQL access granted via 'CREATE USER ... FROM EXTERNAL PROVIDER' + db_datawriter/db_datareader roles
    - Storage connection string auto-generated via 'listKeys()' and stored as a Key Vault secret. Its being referenced by the app via '@Microsoft.KeyVault(SecretUri=...)' so no raw secrets on the resource itself
