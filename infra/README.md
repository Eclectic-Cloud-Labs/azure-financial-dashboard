## What's deployed
- **RG** ('rgFindashDev') + **Log Analytics** ('gurbosAnalytics') + **$20 budget alert**
- **ADLS Gen2 storage** ('gurbostorage') - hierarchical namespace, bronze/silver/gold containers, public blob access disabled
- **Key Vault** ('gurbosVault') - RBAC-authorization mode, no access policies
- **Azure SQL serverless** ('gurboSqlServer'/'gurboSqlDb') - Entra-only auth, 60-min auto-pause, firewall allowing Azure services (0.0.0.0)
- **Function App** (Python, Linux Consumption) - system-assigned MI, separate runtime storage account, identity-based 'AzureWebJobsStorage' (no connection string)
- **App Insights** - 'DisableLocalAuth: true', Entra-auth via 'APPLICATIONINSIGHTS_AUTHENTICATION_STRING'
- **RBAC** - Function App's MI granted Blob Data Contributor (data lake + runtime), Queue/Table Data Contributor (runtime), Key Vault Secrets User, Monitoring Metrics Publisher

## Setup (how this was bootstrapped)
1. Ran 'scripts/bootstrap.sh' - created Entra app registration, service principal, Contributor RBAC at subscription scope, two federated credentials (PR + main-branch)
2. Added 'AZURE_CLIENT_ID', 'AZURE_TENANT_ID', 'AZURE_SUBSCRIPTION_ID' to GitHub Secrets

## Design principles
- Bicep from first commit - nothing created in portal except initial subscription bootstrap
- Managed identity everywhere - zero connection strings, RBAC role assignments instead
- Public network access + RBAC + firewall rules

## CI/CD
- '.github/workflows/infra-pr.yml' - runs 'what-if' commands on PR via 'azure/bicep-deploy@v2'
- '.github/workflows/infra-deploy.yml' - deploys on merge to 'main'
- Auth via OIDC federated credentials - no stored secrets, two credentials scoped separately for PR and main-branch 

## Regional notes
- Most resources: 'eastus'
- **SQL server + Function App**: 'westus2' (PAYG subscription blocks SQL provisioning in 'eastus'. VM quota also affected Consumption plan there)