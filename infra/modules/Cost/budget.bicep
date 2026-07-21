param budgetName string 
param budgetAmount int
param contactEmails string[]
param startDate string

resource budget 'Microsoft.Consumption/budgets@2024-08-01' = {
  name: budgetName
  properties:{
    category: 'Cost'
    amount: budgetAmount
    timeGrain: 'Monthly'
    timePeriod: {startDate:startDate}
    notifications: {
      Actual80Percent: { enabled: true, operator: 'GreaterThan', threshold: 80, contactEmails: contactEmails, thresholdType: 'Actual' }
      Forecasted100Percent: { enabled: true, operator: 'GreaterThan', threshold: 100, contactEmails: contactEmails, thresholdType: 'Forecasted' }
    }
  }
}
