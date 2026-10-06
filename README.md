# azure-financial-dashboard
React dashboard providing information about public investment markets with Bicep IaC from day one. 

# Status
- Phases 1 to 4 complete. Full data pipeline, authenticated API, React frontend, containerized API on AKS with workload identity, and an AI insights layer (Azure OpenAI).

## Phase 1
- Created Entra app registration with service principal (scoped to subscription), 2 federated credentials implemented for 'Pull request' and Deploy for Github Actions OIDC
- [Main](./infra/main.bicep) - Scoped to subscription to deploy resource group, budget, and log analytics workspace
- CI/CD 
    - 'infra-pr.yml' - runs 'bicep-deploy' what-if check on every PR
    - 'infra-deploy.yml' - deploys to azure automatically on merge to 'main'

## Phase 2 
- Deployed ADLS Gen2 storage (bronze/silver/gold containers), Key Vault (RBAC-mode), Azure SQL serverless (Entra-only auth) via Bicep, region adjusted for PAYG subscription restrictions (SQL + Function App on 'westus2', rest on 'eastus')
- [IngestionFunctions](./IngestionFunctions) - Python Function App (v2 model on Linux Consumption plan), system-assigned MI, zero connection strings
    - Ingests a watchlist of 14 tickers (AAPL, MSFT, GOOGL, AMZN, NVDA, META, TSLA, IBM, JPM, V, WMT, DIS, KO, NFLX). The pipeline maintains the data in SQL where
    - 'AlphaVantageIngest' - timer-triggered daily, loops through the ticker list to retrieve symbols OHLC, lands raw JSON in 'bronze/AlphaVantage/' blob storage
    - 'bronze_to_silver' - cleans raw JSON into structured OHLCV using pandas, lands Parquet in 'silver/AlphaVantage/{ticker}'
    - 'silver_to_gold' - computes SMA/RSI/volatility from silver, writes to 'gold/AlphaVantage/{ticker}_technical_indicators.parquet' and Azure SQL (Entra auth, no passwords)
    - Data lake organization: one Parquet file per symbol at each layer. The SQL serving table is a single 'Technical_indicators' table with all symbols stacked with primary key bring Symbol and Stock_date
    - Full RBAC permissions given using least privilege principle: Blob/Queue/Table Data Contributor, Key Vault Secrets User, Monitoring Metrics Publisher, all scoped to the Function App's MI. SQL access granted via 'CREATE USER ... FROM EXTERNAL PROVIDER' + db_datawriter/db_datareader roles
    - Storage connection string auto-generated via 'listKeys()' and stored as a Key Vault secret. Its being referenced by the app via '@Microsoft.KeyVault(SecretUri=...)' so no raw secrets on the resource itself

## Phase 3 - frontend dashboard rebuild in progress (proper charts, multi ticker fix, AI panel)
- [Web](./src/web) React + TypeScript frontend scaffolded with Vite
    - Symbol search box (controlled input), error handling, and a formatted table of prices, RSI, and volatility
    - MSAL wired in for Microsoft login (loginRedirect + PKCE flow), acquires access tokens and sends them as Bearer tokens on API requests
- [API](./src/api) containerized FastAPI service serving gold layer technical indicators from Azure SQL as JSON
    - '/market/{symbol}' endpoint with parameterized queries (SQL injection safe), error handling (404), and Entra token auth to SQL via 'DefaultAzureCredential' (no passwords)
    - Dockerfile hardened with multi stage build (builder + runtime stages) and non root user, pinned to 'python:3.11-slim-bookworm' with ODBC Driver 18
    - 'auth.py' validates incoming JWT tokens with python-jose: signature (using Entra's JWKS keys), audience, issuer, and expiry are used to AUTHORIZE. Unauth'd requests return 401
- Identity
    - 2 app registrations: 'api-app' (exposes the 'access_as_user' scope) and 'spa-app' (granted that scope as a delegated permission)(both configured on entra)
    - App roles 'Advisor' and 'Client' defined on 'api-app' for future role-based data filtering

## Phase 4 
- [ACR](./infra/modules/platform/acr.bicep) Basic tier container registry (admin user disabled), stores the API image
- [AKS](./infra/modules/platform/aks.bicep) cluster 'findash-aks-dev' on the Free tier, one node, OIDC issuer and workload identity enabled, managed NGINX ingress via the app routing add on
    - AKS kubelet identity granted AcrPull on the registry so the cluster pulls images with no stored credentials
- [Kubernetes manifests](./deploy) Deployment, Service (ClusterIP), and Ingress (public IP). The API runs as a pod reachable from the internet through the ingress
- [Workload identity](./infra/modules/security/workloadidentity.bicep) user assigned managed identity 'podIdentity' federated to the Kubernetes service account 'findash-api-sa'. The pod authenticates to Azure SQL with a federated token and zero secrets in the cluster, using the same 'DefaultAzureCredential' pattern
- CI/CD
    - 'aks-autostop.yml' nightly GitHub Actions workflow (cron, OIDC login) that runs 'az aks stop' to control cost

## Phase 5
- [Azure OpenAI](./infra/modules/ai/openai.bicep) account 'gurbosopenai' deployed via Bicep with a gpt 5 mini model deployment
    - 'podIdentity' granted the 'Cognitive Services OpenAI User' role, so the API calls the model passwordless via 'DefaultAzureCredential'
- AI endpoints in [the API](./src/api)
    - '/advice/brief/{symbol}' gives a symbol's computed metrics to the model, which describes the stock's technical posture. Returns the message with up to date date and a not financial advice disclaimer
    - '/advice/ask/{question}' natural language Q and A using OpenAI function calling. Based on the question, the model decides when it needs data. When it does, it calls the 'get_metrics' tool and the API runs the SQL query and provides the result back.
- Design principle: the AI only tells users about numbers the pipeline computed. It never creates its own values, predicts prices, or gives buy/sell advice. Disclaimers are on every AI response