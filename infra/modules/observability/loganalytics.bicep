param name string
param location string

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01'  = {
  name: name
  location: location
  properties:{
    features:{
      disableLocalAuth: false
      enableLogAccessUsingOnlyResourcePermissions: true
    }
    retentionInDays:30
    sku:{
      name:'PerGB2018 '
    }
  }
}
