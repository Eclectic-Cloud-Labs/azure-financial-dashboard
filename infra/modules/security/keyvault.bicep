param keyVaultName string
param keyVaultLocation string
param secretName string
param funcStorageName string
@secure()
param apimAksSharedKeyValue string
param podIdentityPrincipalId string




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

resource APIMSecret 'Microsoft.KeyVault/vaults/secrets@2024-11-01' = {
  parent: vault
  name: 'apim-aks-shared-key'
  properties:{value:apimAksSharedKeyValue}
}

resource funcStorage 'Microsoft.Storage/storageAccounts@2025-06-01' existing = {
  name: funcStorageName

}

resource podKvRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: vault
  name: guid(vault.id, podIdentityPrincipalId, '4633458b-17de-408a-b874-0445c86b69e6')
  properties: {
    principalId: podIdentityPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
  }
}

output funcStorageConnectionString string = storageSecret.properties.secretUri
output apimAksSharedKeySecretUri string = APIMSecret.properties.secretUri
