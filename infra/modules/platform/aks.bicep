
param clusterName string = 'aks101cluster'
param location string
param dnsPrefix string

@minValue(0)
@maxValue(1023)
param osDiskSizeGB int = 0
param agentCount int = 1
param agentVMSize string = 'standard_d2s_v3'


resource aks 'Microsoft.ContainerService/managedClusters@2024-02-01' = {
  name: clusterName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    dnsPrefix: dnsPrefix
    agentPoolProfiles: [
      {
        name: 'agentpool'
        osDiskSizeGB: osDiskSizeGB
        count: agentCount
        vmSize: agentVMSize
        osType: 'Linux'
        mode: 'System'
      }
    ]
  }
}

output controlPlaneFQDN string = aks.properties.fqdn
