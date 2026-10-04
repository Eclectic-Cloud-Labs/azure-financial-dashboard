using 'main.bicep'

// Main RG params
param name = 'rgFindashProd'
param location = 'eastus'

// Budget params
param budgetName = 'prodBudget'
param budgetAmount = 30
param contactEmails = ['gurvir-k@hotmail.com']
param startDate = '2026-08-01T00:00:00Z'

// storage params
param storageName = 'gurbostorageprod'
param storageLocation = location
param funcStorageName = 'gurbofuncstorageprod'

// Key Vault
param keyVaultName = 'gurboVaultProd'
param secretName = 'storageConnectionString'

// sql server params
param sqlServerName = 'gurbosSqlServerProd'
param sqlDatabaseName = 'gurbosSqlDbProd'
param firewallName = 'sqlFirewall'
param sqlLocation = 'eastus2'

// functionapp params
param functionAppName = 'gurbosFunctionAppProd'
param planName = 'serviceAppPlanProd'
param funcAppLocation = 'westus2'

// ACR param
param acrName = 'gurboscontainerregistryprod'
param acrSkuName = 'Basic'

// AKS Param
param dnsPrefix = 'findash-prod'
param clusterName = 'findash-aks-prod'

// pod identity param
param podIdentity = 'podIdentityProd'
