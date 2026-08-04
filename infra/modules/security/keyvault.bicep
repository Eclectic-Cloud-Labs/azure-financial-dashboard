param keyVaultName string
param keyVaultLocation string
param secretName string
param funcStorageName string

resource vault 'Microsoft.KeyVault/vaults@2025-05-01' = {
  name: keyVaultName
  location: keyVaultLocation 
  properties: {
    createMode: 'default'
    enableRbacAuthorization: true
    enabledForTemplateDeployment: true
    sku: {
      family: 'A'
      name: 'standard'
    }
    softDeleteRetentionInDays: 7
    tenantId: tenant().tenantId
  }
}

resource storageSecret 'Microsoft.KeyVault/vaults/secrets@2024-11-01' = {
  parent: vault
  name: secretName
  properties: {
    value: 'DefaultEndpointsProtocol=https;AccountName=${funcStorage.name};AccountKey=${listKeys(funcStorage.id, funcStorage.apiVersion).keys[0].value};EndpointSuffix=core.windows.net'
  }
}

resource funcStorage 'Microsoft.Storage/storageAccounts@2025-06-01' existing = {
  name: funcStorageName
}

output funcStorageConnectionString string = storageSecret.properties.secretUri
