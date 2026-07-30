param functionAppName string
param planName string
param funcStorageName string
param location string
param storageName string 
param logAnalyticsName string 
param applicationInsightsName string 
param keyVaultName string

resource functionApp 'Microsoft.Web/sites@2023-12-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    reserved: true
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'Python|3.11'
      appSettings: [
        { name: 'FUNCTIONS_WORKER_RUNTIME', value: 'python' }
        { name: 'FUNCTIONS_EXTENSION_VERSION', value: '~4' }
        { name: 'AzureWebJobsStorage__accountName', value: funcStorage.name }
        { name: 'AzureWebJobsStorage__credential', value: 'managedidentity' }
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: applicationInsights.properties.ConnectionString }
        { name: 'APPLICATIONINSIGHTS_AUTHENTICATION_STRING', value: 'Authorization=AAD' }
      ]
    }
  }
}

resource appServicePlan 'Microsoft.Web/serverfarms@2024-04-01' = {
  name: planName
  kind: 'linux'
  location: location
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
  properties: {
    reserved: true
  }
}

resource funcStorage 'Microsoft.Storage/storageAccounts@2023-05-01'= {
  name: funcStorageName
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
}


resource applicationInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: applicationInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
    DisableLocalAuth: true
  }
}
// For writing to the bronze storage acc
resource dataLakeStorage 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: storageName
}

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' existing = {
  name: logAnalyticsName
}

resource keyVault 'Microsoft.KeyVault/vaults@2025-05-01' existing = {
  name: keyVaultName
}

// Role Assignments 

// Role for MI to interact with function app background storage for AzWebJobStorage 
resource roleAssignmentStorageBlobContribFunctionApp 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: funcStorage
  name: guid(funcStorage.id, functionApp.id, 'Storage Blob Data Contributor')
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe') // Storage Blob Data Contributor
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// Role so that MI has access to Bronze storage
resource roleAssignmentBlobContributor 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(dataLakeStorage.id, functionApp.id, 'Storage Blob Data Contributor')
  scope: dataLakeStorage
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe') 
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource roleAssignmentQueueStorage 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(funcStorage.id, functionApp.id, 'Storage Queue Data Contributor')
  scope: funcStorage
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '974c5e8b-45b9-4653-ba55-5f855dd0fb88')
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource roleAssignmentTableStorage 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(funcStorage.id, functionApp.id,  'Storage Table Data Contributor')
  scope: funcStorage
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3')
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource roleAssignmentAppInsights 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(applicationInsights.id, functionApp.id, 'Monitoring Metrics Publisher')
  scope: applicationInsights
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '3913510d-42f4-4e42-8a64-420c390055eb')
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource roleAssignmentKeyVault 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, functionApp.id, 'Key Vault Secrets User')
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}
