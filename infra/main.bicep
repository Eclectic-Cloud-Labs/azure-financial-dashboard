targetScope = 'subscription'

param name string
param location string 

// Cost Params
param budgetName string 
param budgetAmount int
param contactEmails string[]
param startDate string

// storage params
param storageName string
param storageLocation string

// KeyVault Params
param keyVaultName string

// sql server params
param sqlServerName string 
param sqlDatabaseName string
param firewallName string
param sqlLocation string

// function app params
param functionAppName string
param planName string
param funcStorageName string
param funcAppLocation string
param applicationInsightsName string = 'applicationInsights'



resource newRG 'Microsoft.Resources/resourceGroups@2025-04-01' = {
  name: name
  location: location
}

// Set up Log Analytics in RG
// (infra\modules\observability\loganalytics.bicep)
module logAnalytics './modules/observability/loganalytics.bicep' = {
  name: 'gurbosAnalytics'
  scope: resourceGroup(newRG.name)
  params:{
    name: 'gurbosAnalytics'
    location: location
  }
}

// Set up Cost in RG (not subscription)
// (infra\modules\Cost\budget.bicep)
module cost 'modules/Cost/budget.bicep' = {
  name: budgetName
  scope: resourceGroup(newRG.name)
  params: {
    budgetName: budgetName
    budgetAmount: budgetAmount
    contactEmails: contactEmails
    startDate: startDate
  }
}

// Create ADLS Gen2 with Medallion containers
module storageAccount 'modules/data/storage.bicep' = {
  name: storageName
  scope: resourceGroup(newRG.name)
  params:{
    storageName: storageName
    storageLocation: storageLocation
  }

}

module vault 'modules/security/keyvault.bicep' = {
  name: keyVaultName
  scope: resourceGroup(newRG.name)
  params: {
    keyVaultName: keyVaultName
    keyVaultLocation: location
  }
}

module sqlServer 'modules/data/sql.bicep' = {
  name: sqlServerName
  scope: resourceGroup(newRG.name)
  params:{
    sqlServerName: sqlServerName
    sqlLocation: sqlLocation
    sqlDatabaseName: sqlDatabaseName
    firewallName: firewallName
  }
}

module functionApp 'modules/compute/functionapp.bicep' = {
  name: functionAppName
  scope: resourceGroup(newRG.name)
  params:{
    functionAppName: functionAppName
    planName: planName
    funcStorageName: funcStorageName
    location: funcAppLocation
    storageName: storageName
    applicationInsightsName: applicationInsightsName
    logAnalyticsName: logAnalytics.name
    keyVaultName: vault.name
  }
  dependsOn: [
    storageAccount
  ]
}

// CLI Deployment CMD (--parameters value depends on prod or dev env)
// az deployment sub create  --location eastus --template-file "azure-financial-dashboard\infra\main.bicep" --parameters "azure-financial-dashboard\infra\main.dev.bicepparam"
