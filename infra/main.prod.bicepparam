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
param storageName = 'gurbostorage'
param storageLocation = location

// Key Vault
param keyVaultName = 'gurbosVault'

// sql server params
param sqlServerName = 'gurboSqlServer'
param sqlDatabaseName = 'gurboSqlDb'
param firewallName = 'sqlFirewall'
param sqlLocation = 'eastus2'

// functionapp params
param functionAppName = 'gurbosFunctionApp'
param planName = 'serviceAppPlan'
param funcStorageName= 'gurbofuncstorageaccount'
param funcAppLocation = 'westus2'
