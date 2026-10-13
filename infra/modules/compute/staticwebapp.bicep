param swaName string
param location string = 'eastus2'

resource swa 'Microsoft.Web/staticSites@2024-04-01' = {
  name: swaName
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    allowConfigFileUpdates: true
  }
}

output defaultHostname string = swa.properties.defaultHostname
output name string = swa.name
