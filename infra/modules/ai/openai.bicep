param sku string = 'S0'
param aiName string 
param location string 
param model string 
param modelversion string 
param customDomainName string 
param modeldeploymentname string 
param capacity int 
param podIdentityPrincipalId string

resource openAIService 'Microsoft.CognitiveServices/accounts@2025-10-01-preview' = {
  name: aiName
  location: location
  sku: {
    name: sku
  }
  kind: 'OpenAI'
  properties: {
    customSubDomainName: customDomainName
  }
}

resource azopenaideployment 'Microsoft.CognitiveServices/accounts/deployments@2025-10-01-preview' = {
    parent: openAIService
    name: modeldeploymentname
    properties: {
        model: {
            format: 'OpenAI'
            name: model
            version: modelversion
        }
    }
    sku: {
      name: 'GlobalStandard'
      capacity: capacity
    }
}


resource roleAssignmentPodAccessAi 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: openAIService
  name: guid(openAIService.id, podIdentityPrincipalId, 'Cognitive Services OpenAI User')
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd'
    ) 
    principalId: podIdentityPrincipalId
    principalType: 'ServicePrincipal'
  }
}

output openAIServiceEndpoint string = openAIService.properties.endpoint
