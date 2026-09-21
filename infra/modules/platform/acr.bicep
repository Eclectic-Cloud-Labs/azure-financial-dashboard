param acrName string 
param location string 
param acrSkuName string 

resource acr 'Microsoft.ContainerRegistry/registries@2025-11-01' = {
  location: location
  name: acrName
  properties: {
    adminUserEnabled: false
  }
  sku: {
    name: acrSkuName
  }
}

output acrLoginServer string = acr.properties.loginServer
output acrId string = acr.id
