using 'main.bicep'

// Main RG params
param name = 'rgFindashDev'
param location = 'eastus'

// Budget params
param budgetName = 'devBudget'
param budgetAmount = 15
param contactEmails = ['gurvir-k@hotmail.com']
param startDate = '2026-08-01T00:00:00Z'

// storage params
param storageName = 'gurbostorage'
param storageLocation = location
param funcStorageName= 'gurbofuncstorageaccount'
    

// Key Vault
param keyVaultName = 'gurboVault'
param secretName = 'storageConnectionString'



// sql server params
param sqlServerName = 'gurbosSqlServer'
param sqlDatabaseName = 'gurbosSqlDb'
param firewallName = 'sqlFirewall'
param sqlLocation = 'westus2'

// functionapp params
param functionAppName = 'gurbosFunctionApp'
param planName = 'serviceAppPlan'
param funcAppLocation = 'westus2'

// ACR param
param acrName = 'gurbosContainerRegistry'
param acrSkuName = 'Basic'

// AKS Param
param dnsPrefix = 'findash-dev'
param clusterName = 'findash-aks-dev'

// pod identiy params
param podIdentity = 'podIdentity'

param aiName = 'gurbosopenai'
param aiModel = 'gpt-5-mini'
param aiVersion = '2025-08-07'
param aiModelDeploymentName = 'gpt-5-mini'
param aiCdn = 'gurbosopenai'
param aiCapacity = 10

// APIM
param apimName = 'gurbosAPIM'
param aksIngressHost = '40.121.118.182'
param entraTenantId = '87e450d8-9ee3-4538-a4b3-3cb61e605824'
param apiAppClientId = '62599e34-c893-4653-92c2-218aeb8c3741'

// swa
param swaName = 'findash-swa'
