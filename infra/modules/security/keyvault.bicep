param keyVaultName string
param keyVaultLocation string

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
