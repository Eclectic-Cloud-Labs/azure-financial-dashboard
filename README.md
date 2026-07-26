# azure-financial-dashboard
React dashboard providing information about public investment markets with Bicep IaC from day one. 

# Status
- Phase 2 in progress - Setting up environment resources (ADLS Gen2, SQL, Key Vault, data ingestion)

## Phase 1
- Created Entra app registration with service principal (scoped to subscription), 2 federated credentials implemented for 'Pull request' and Deploy for Github Actions OIDC
- [Main](./infra/main.bicep) - Scoped to subscription to deploy resource group, budget, and log analytics workspace
- CI/CD 
    - 'infra-pr.yml' - runs `bicep-deploy` what-if check on every PR
    - 'infra-deploy.yml' - deploys to azure automatically on merge to 'main'
