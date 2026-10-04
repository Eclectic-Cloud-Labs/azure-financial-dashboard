param location string
param podIdentity string
param aksOidcIssuerUrl string
param serviceAccountName string = 'findash-api-sa'
param serviceAccountNamespace string = 'default'


resource userAssignedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: podIdentity
  location: location
}

resource federatedCredential 'Microsoft.ManagedIdentity/userAssignedIdentities/federatedIdentityCredentials@2023-01-31' = {
  parent: userAssignedIdentity
  name: 'findash-aks-federated'
  properties: {
    issuer: aksOidcIssuerUrl
    subject: 'system:serviceaccount:${serviceAccountNamespace}:${serviceAccountName}'
    audiences: ['api://AzureADTokenExchange']
  }
}

output clientId string = userAssignedIdentity.properties.clientId
output principalId string = userAssignedIdentity.properties.principalId
output identityId string = userAssignedIdentity.id
