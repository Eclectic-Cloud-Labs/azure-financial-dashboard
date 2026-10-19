param apimName string
param location string
param publisherEmail string
param publisherName string

// AKS backend
param aksIngressHost string

// For JWT validation
param entraTenantId string
param apiAppClientId string
param keyVaultName string
param apimAksSharedKeySecretUri string // full URI of the apim-aks-shared-key secret

resource service 'Microsoft.ApiManagement/service@2024-05-01' = {
  name: apimName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  sku: {
    name: 'Consumption'
    capacity: 0
  }
  properties: {
    publisherEmail: publisherEmail
    publisherName: publisherName
  }
}

resource nvTenantId 'Microsoft.ApiManagement/service/namedValues@2024-05-01' = {
  parent: service
  name: 'tenant-id'
  properties: {
    displayName: 'tenant-id'
    value: entraTenantId
    secret: false
  }
}

resource nvApiAppClientId 'Microsoft.ApiManagement/service/namedValues@2024-05-01' = {
  parent: service
  name: 'api-app-client-id'
  properties: {
    displayName: 'api-app-client-id'
    value: apiAppClientId
    secret: false
  }
}

// the AKS ingress APIM forwards requests to
resource backend 'Microsoft.ApiManagement/service/backends@2024-05-01' = {
  parent: service
  name: 'aks-findash-backend'
  properties: {
    protocol: 'http'
    url: 'http://${aksIngressHost}'
  }
}

// API - groups all your routes under /v1
resource api 'Microsoft.ApiManagement/service/apis@2024-05-01' = {
  parent: service
  name: 'findash-v1'
  properties: {
    displayName: 'Findash v1'
    path: 'v1'
    protocols: ['https']
    apiType: 'http'
    subscriptionRequired: false
    serviceUrl: 'http://${aksIngressHost}'
  }
}

// API-level policy - validate-jwt on every operation in this API
resource apiPolicy 'Microsoft.ApiManagement/service/apis/policies@2024-05-01' = {
  parent: api
  name: 'policy'
  properties: {
    format: 'xml'
    value: '''
    <policies>
      <inbound>
        <base />
        <cors allow-credentials="false">
          <allowed-origins>
            <origin>https://blue-sand-0d706770f.4.azurestaticapps.net</origin>
            <origin>http://localhost:5173</origin>
          </allowed-origins>
          <allowed-methods>
            <method>GET</method>
            <method>POST</method>
            <method>OPTIONS</method>
          </allowed-methods>
          <allowed-headers>
            <header>*</header>
          </allowed-headers>
        </cors>
        <validate-jwt header-name="Authorization" failed-validation-httpcode="401" require-expiration-time="true" require-signed-tokens="true" output-token-variable-name="jwt">
          <openid-config url="https://login.microsoftonline.com/{{tenant-id}}/v2.0/.well-known/openid-configuration" />
          <audiences>
            <audience>api://{{api-app-client-id}}</audience>
            <audience>{{api-app-client-id}}</audience>
          </audiences>
          <issuers>
            <issuer>https://sts.windows.net/{{tenant-id}}/</issuer>
            <issuer>https://login.microsoftonline.com/{{tenant-id}}/v2.0</issuer>
          </issuers>
        </validate-jwt>
                <set-variable name="userId" value="@(((Jwt)context.Variables[&quot;jwt&quot;]).Claims.GetValueOrDefault(&quot;oid&quot;, &quot;anon&quot;))" />
        <set-variable name="userRole" value="@{
          var jwt = (Jwt)context.Variables[&quot;jwt&quot;];
          if (jwt.Claims.ContainsKey(&quot;roles&quot;)) {
            var roles = jwt.Claims[&quot;roles&quot;];
            if (roles.Contains(&quot;Advisor&quot;)) { return &quot;Advisor&quot;; }
            if (roles.Contains(&quot;Client&quot;)) { return &quot;Client&quot;; }
          }
          return &quot;none&quot;;
        }" />
        <set-header name="X-APIM-Trusted" exists-action="override">
          <value>{{apim-aks-shared-key}}</value>
        </set-header>
      </inbound>
      <backend><base /></backend>
      <outbound><base /></outbound>
      <on-error><base /></on-error>
    </policies>
    '''
  }
  dependsOn: [
    nvTenantId
    nvApiAppClientId
  ]
}

resource opMarket 'Microsoft.ApiManagement/service/apis/operations@2024-05-01' = {
  parent: api
  name: 'get-market'
  properties: {
    displayName: 'Get market data'
    method: 'GET'
    urlTemplate: '/market/{symbol}'
    templateParameters: [
      {
        name: 'symbol'
        required: true
        type: 'string'
      }
    ]
  }
}

resource opHistory 'Microsoft.ApiManagement/service/apis/operations@2024-05-01' = {
  parent: api
  name: 'get-market-history'
  properties: {
    displayName: 'Get market history'
    method: 'GET'
    urlTemplate: '/market/{symbol}/history'
    templateParameters: [
      {
        name: 'symbol'
        required: true
        type: 'string'
      }
    ]
  }
}

resource opBrief 'Microsoft.ApiManagement/service/apis/operations@2024-05-01' = {
  parent: api
  name: 'get-advice-brief'
  properties: {
    displayName: 'Get AI brief'
    method: 'GET'
    urlTemplate: '/advice/brief/{symbol}'
    templateParameters: [
      {
        name: 'symbol'
        required: true
        type: 'string'
      }
    ]
  }
}

resource opAsk 'Microsoft.ApiManagement/service/apis/operations@2024-05-01' = {
  parent: api
  name: 'get-advice-ask'
  properties: {
    displayName: 'Ask AI'
    method: 'GET'
    urlTemplate: '/advice/ask/{question}'
    templateParameters: [
      {
        name: 'question'
        required: true
        type: 'string'
      }
    ]
  }
}

resource nvSharedKey 'Microsoft.ApiManagement/service/namedValues@2024-05-01' = {
  parent: service
  name: 'apim-aks-shared-key'
  properties: {
    displayName: 'apim-aks-shared-key'
    secret: true
    keyVault: {
      secretIdentifier: apimAksSharedKeySecretUri
    }
  }
  dependsOn: [
    apimKvRole
  ]
}

// Reference existing Key Vault (needed for role scope)
resource existingKv 'Microsoft.KeyVault/vaults@2024-11-01' existing = {
  name: keyVaultName
}

// Key Vault Secrets User role
resource apimKvRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: existingKv
  name: guid(existingKv.id, service.id, '4633458b-17de-408a-b874-0445c86b69e6')
  properties: {
    principalId: service.identity.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      '4633458b-17de-408a-b874-0445c86b69e6'
    )
  }
}

output apimName string = service.name
output apimPrincipalId string = service.identity.principalId
output apimGatewayUrl string = service.properties.gatewayUrl
