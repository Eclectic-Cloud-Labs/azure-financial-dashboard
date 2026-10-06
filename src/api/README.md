# API Backend (FastAPI)
Containerized FastAPI service (Python 3.11, Docker) that serves gold layer technical indicator data from Azure SQL as JSON for the frontend to consume.

## Setup
1. 'pip install fastapi uvicorn'
2. Wrote a minimal "Hello World" 'main.py', ran it with 'uvicorn main:app --reload'
3. Extended 'main.py' to read from the Azure SQL 'Technical_indicators' table (reusing the pyodbc + Entra token pattern from IngestionFunctions)
4. Wrote a Dockerfile ('python:3.11-slim-bookworm' base) with '--host 0.0.0.0 --port 8000' so the container is reachable via port mapping
5. Created auth.py to ensure token validation based on user works. Looks at the token bearer token (created from entra sending the app the token signed with MS's private key from session storage from MSAL)

## How it works
'main.py' runs a FastAPI app served by Uvicorn. Endpoints authenticate to Azure SQL via 'DefaultAzureCredential' (Entra token, no passwords), query the table, and return JSON. Column names are pulled from 'cursor.description' and zipped with the row values so responses are labeled objects, not bare arrays.

Every endpoint is protected by 'validate_token' via FastAPI's 'Depends' - this runs before the endpoint logic and validates the JWT from the 'Authorization: Bearer <token>' header. If the token is missing, forged, expired, or meant for a different API, the request gets a 401 before any SQL query runs.

## Endpoints

### Data
- 'GET /market/{symbol}' returns the latest technical indicators (OHLCV, SMA 5/10/20, RSI, volatility) for a symbol from Azure SQL. Parameterized query (SQL injection safe), 404 on unknown symbol, requires a valid Entra token.

### AI (Azure OpenAI, gpt-5-mini)
- 'GET /advice/brief/{symbol}' pulls a symbol's metrics and has the model describe its technical posture using standard technical-analysis conventions (RSI over 70 overbought, price vs SMAs, SMA alignment). Returns a structured response with the brief, the data-as-of date, and a 'not financial advice' disclaimer.
- 'GET /advice/ask/{question}' natural-language Q and A using OpenAI function calling. The model decides when it needs data, requests the 'get_metrics' tool, the API runs the SQL and feeds the result back, and the model answers grounded in real values.

Design principle: the AI only ever describes numbers the pipeline computed. It never invents values, predicts prices, or gives buy/sell advice. Guardrails (disclaimer, data-as-of timestamp, strict system prompts) are on every AI response.

### How the AI auth works
The API calls Azure OpenAI with no API key. 'DefaultAzureCredential' builds a token provider scoped to 'https://cognitiveservices.azure.com/.default', which the 'AzureOpenAI' client uses to fetch and refresh Entra tokens automatically. On AKS the identity is 'podIdentity' (workload identity); locally it is the developer's 'az login'. The OpenAI account grants that identity the 'Cognitive Services OpenAI User' role, so RBAC on the resource decides access. Same passwordless pattern as the SQL connection.

### How function calling works ('/advice/ask')
1. The API sends the question and a tool definition for 'get_metrics' to the model.
2. Based on the question, the model might need data and responds with a assistant response along with a tool call.
3. The API runs its own 'get_metrics' (own SQL query), gets the data, and appends it to the conversation as a 'tool' message referencing the call id.
4. The API calls the model a second time with the full conversation. The model now has the data and writes the final answer with the AI never touching the database directly.

## How auth.py works
- 'HTTPBearer()' extracts the Bearer token from the request header automatically - no header means instant 401
- 'get_signing_keys()' fetches Entra's public signing keys from the JWKS endpoint ('https://login.microsoftonline.com/{tenant}/discovery/v2.0/keys') - these are the public counterparts to the private key Microsoft used to sign the token
- 'jwt.decode()' from 'python-jose' does five checks in one call: signature validity (using the JWKS keys), audience matches the API's Application ID URI ('api://62599e34-...'), issuer matches the tenant, algorithm is RS256, and the token is not expired
- If all checks pass, returns the token's payload (user identity, scopes, claims) which flows into the endpoint via 'Depends' as a 'user' parameter
- If any check fails, raises a 401 with the specific error

## Dockerfile
Multi-stage build, AKS-ready:
- Builder stage: installs Python dependencies into a target directory
- Runtime stage: clean python:3.11-slim-bookworm image with only ODBC Driver 18 and the installed packages copied from the builder
- curl/gnupg purged after ODBC install to reduce image size
- Runs as non-root 'appuser' (required for AKS runAsNonRoot policies)
- CMD uses 'python -m uvicorn' instead of bare 'uvicorn' because multi-stage --target install doesn't place executables on PATH
- Container has no Azure identity locally - SQL calls will fail. This is expected and resolved by AKS workload identity in Phase 3.

### How to run
- 'pip install -r requirements.txt' (fastapi, uvicorn, pyodbc, azure-identity, python-jose, openai)
- Locally: 'uvicorn main:app --reload', then 'http://127.0.0.1:8000' ('/docs' for Swagger)
- In Docker: 'docker build -t findash-api .' then 'docker run -p 8000:8000 findash-api'

## Reasoning
- **Backend first** so building the frontend later is just sending requests to a working API.
- **Auth**: 'DefaultAzureCredential' uses 'az login' locally. A container off Azure has no identity source, so real container auth is deferred to the AKS phase, where workload identity provides a token with no stored secret.
- **python-jose over PyJWT**: both validate JWTs, but pythonjose accepts a JWKS key set directly in 'jwt.decode()' and finds the matching signing key automatically

## Issues resolved
- **Soft-deleted SQL resources**: deleting/recreating the SQL server left it soft-deleted. Restored from the portal, then enabled the soft-delete preview setting.
- **Function App redeploy failure**: recreating the Function App made a new managed identity, leaving 6 orphaned role assignments pointing at the dead identity ('RoleAssignmentUpdateNotPermitted'). Deleted them (found via 'az role assignment list --all', blank principal) so Bicep could recreate them.
- **ODBC driver missing in container**: 'import pyodbc' crashed with 'libodbc.so.2 not found' - the base image has no ODBC driver. Fixed by installing 'unixodbc-dev' + 'msodbcsql18' in the Dockerfile via 'apt-get' before 'pip install'. On Debian 13 this hit a Microsoft key-bundle bug, so pinned the base image to 'bookworm' (Debian 12), which Microsoft's signing key correctly covers.
- **Container has no Azure identity**: running the container locally, 'DefaultAzureCredential' fails (no 'az login' inside it) - expected; resolved properly by AKS workload identity later.
- **Audience mismatch on token validation**: 'jwt.decode()' rejected valid tokens because 'audience' was set to the bare client ID ('62599e34-...') but Entra stamps the token's 'aud' claim with the full Application ID URI ('api://62599e34-...'). Fixed by matching the full URI in auth.py.
- **ODBC driver missing in container**: installed 'unixodbc-dev' plus 'msodbcsql18'; pinned base image to 'bookworm' (Debian 12) to avoid a Microsoft signing-key bug on Debian 13.
- **Azure OpenAI model choice**: the planned gpt-4o-mini was deprecated with zero quota; switched to gpt-5-mini (had quota on GlobalStandard). Model availability and quota vary by region and change over time.
- **Oct 6 fix**: Added a ORDER BY sql query to main.py to ensure the correct data is being posted on the react app (was filtered by oldest data first which provided NULL values for some data indicators)