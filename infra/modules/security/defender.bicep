targetScope = 'subscription'

// Enable Foundational CSPM (free tier) at subscription scope
resource cspm 'Microsoft.Security/pricings@2024-01-01' = {
  name: 'CloudPosture'
  properties: {
    pricingTier: 'Free'
  }
}

// Also keep VirtualMachines plan on Free (default, but explicit)
resource vmPlan 'Microsoft.Security/pricings@2024-01-01' = {
  name: 'VirtualMachines'
  properties: {
    pricingTier: 'Free'
  }
}
