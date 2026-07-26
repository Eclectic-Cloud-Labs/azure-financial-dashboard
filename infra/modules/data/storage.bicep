param storageName string
param storageLocation string 

// Create Storage Account
resource storageAccount 'Microsoft.Storage/storageAccounts@2025-06-01' = {
  name: storageName
  location: storageLocation
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    encryption: {
      keySource: 'Microsoft.Storage'
      services: {
        blob:{
          enabled: true
        }
      }
    }
    isHnsEnabled: true
    minimumTlsVersion: 'TLS1_2'
    publicNetworkAccess: 'Enabled'
    supportsHttpsTrafficOnly: true
  }
  
  // Nested Blob Service
  resource blobService 'blobServices' = {
    name: 'default'
    
    // Nested Containers
    resource bronzeContainer 'containers' = { name: 'bronze' }
    resource silverContainer 'containers' = { name: 'silver' }
    resource goldContainer 'containers' = { name: 'gold' }
  }
}
