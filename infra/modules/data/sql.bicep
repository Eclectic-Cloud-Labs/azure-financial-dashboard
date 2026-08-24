param sqlServerName string 
param sqlLocation string 
param sqlDatabaseName string
param firewallName string 


resource sqlServer 'Microsoft.Sql/servers@2025-01-01' = {
    identity: {
      type: 'SystemAssigned'
    }
    location: sqlLocation
    name: sqlServerName
  properties: {
    administrators: {
      login: 'gurvir-k@hotmail.com'
      administratorType: 	'ActiveDirectory'
      azureADOnlyAuthentication: true
      principalType: 'User'
      sid: '3d40e85c-924e-4f7f-9f30-28f57d36de37'
      tenantId: tenant().tenantId
    }
    createMode: 'normal'
    minimalTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled'
    retentionDays: 7
    version: '12.0'
  }
}

resource database 'Microsoft.Sql/servers/databases@2025-01-01' = {
  name: sqlDatabaseName
  location: sqlLocation
  parent: sqlServer
  sku: {
    name: 'GP_S_Gen5'
    tier: 'GeneralPurpose'
    family: 'Gen5'
    capacity: 1
  }
  properties: {
    autoPauseDelay: 60
    createMode: 'Default'
    licenseType: 'LicenseIncluded'
    minCapacity: 1
    requestedBackupStorageRedundancy: 'local'
    zoneRedundant: false
  }
}

resource firewallRule 'Microsoft.Sql/servers/firewallRules@2025-01-01' = {
  name: firewallName
  parent: sqlServer
  properties: {
    endIpAddress: '0.0.0.0'
    startIpAddress: '0.0.0.0'
  }
}
