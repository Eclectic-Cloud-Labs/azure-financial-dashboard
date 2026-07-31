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

## Incidents
- **Error 1** - Github Actions was giving me failed workflow runs saying an object id (which I later realized was the App Reg) didn't have permissions to assign roles to resources. 
    - A role assignment - f58310d9-a9f6-439a-9e8d-f62e7b41a168 - was then assigned to the App Reg which resolved the error
- **Error 2** (after fixing 1) -  "details":[{"code":"RoleAssignmentUpdateNotPermitted","message":"Tenant ID, application ID, principal ID, and scope are not allowed to be updated."}]}]}]}} on the scope of Function App
    - Looked into the Function App's MI's role assignments and there was a role assignment on my ADLS Gen2 storage account for Storage Table Data Contributor when that should have been on the Function Apps's runtime storage account. My initial reasoning was that Bicep deployments don't allow previous and new deployments to be merged (almost like a GitHub merge conflict). After digging, the real cause was that ARM saw the same (principal, role) already existed at a different scope and interpreted my new role assignment as trying to change an existing assignment's scope which isn't allowed, since role assignment scopes are immutable