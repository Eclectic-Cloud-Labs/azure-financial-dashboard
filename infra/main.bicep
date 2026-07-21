targetScope = 'subscription'

param name string
param location string 

// Cost Params
param budgetName string 
param budgetAmount int
param contactEmails string[]
param startDate string


resource newRG 'Microsoft.Resources/resourceGroups@2025-04-01' = {
  name: name
  location: location
}

// Set up Log Analytics in RG
// (infra\modules\observability\loganalytics.bicep)
module logAnalytics './modules/observability/loganalytics.bicep' = {
  name: 'logspace'
  scope: resourceGroup(newRG.name)
  params:{
    name: 'gurbosAnalytics'
    location: location
  }
}

// Set up Cost in RG (not subscription)
// (infra\modules\Cost\budget.bicep)
module cost 'modules/Cost/budget.bicep' = {
  name: budgetName
  scope: resourceGroup(newRG.name)
  params: {
    budgetName: budgetName
    budgetAmount: budgetAmount
    contactEmails: contactEmails
    startDate: startDate
  }
}

// CLI Deployment CMD (--parameters value depends on prod or dev env)
// az deployment sub create  --location eastus --template-file "azure-financial-dashboard\infra\main.bicep" --parameters "azure-financial-dashboard\infra\main.dev.bicepparam"
