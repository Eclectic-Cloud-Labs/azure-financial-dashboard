# API Backend (FastAPI)
Containerized FastAPI service (Python 3.11, Docker) that serves gold-layer technical indicator data from Azure SQL as JSON for the frontend to consume.

## Setup
1. 'pip install fastapi uvicorn'
2. Wrote a minimal "Hello World" 'main.py', ran it with 'uvicorn main:app --reload'
3. Extended 'main.py' to read from the Azure SQL 'Technical_indicators' table (reusing the pyodbc + Entra token pattern from IngestionFunctions)
4. Wrote a Dockerfile ('python:3.11-slim-bookworm' base) with '--host 0.0.0.0 --port 8000' so the container is reachable via port mapping

## How it works
'main.py' runs a FastAPI app served by Uvicorn. Endpoints authenticate to Azure SQL via 'DefaultAzureCredential' (Entra token, no passwords), query the table, and return JSON. Column names are pulled from 'cursor.description' and zipped with the row values so responses are labeled objects, not bare arrays.

## How to run
- Locally: 'uvicorn main:app --reload', then 'http://127.0.0.1:8000' (or '/docs' for auto-generated Swagger UI)
- In Docker: 'docker build -t findash-api .' then 'docker run -p 8000:8000 findash-api'

## Reasoning
- **Backend first** so building the frontend later is just sending requests to a working API.
- **Auth**: 'DefaultAzureCredential' uses 'az login' locally. A container off-Azure has no identity source, so real container auth is deferred to the AKS phase, where workload identity provides a token with no stored secret.

## Issues resolved
- **Soft-deleted SQL resources**: deleting/recreating the SQL server left it soft-deleted. Restored from the portal, then enabled the soft-delete preview setting.
- **Function App redeploy failure**: recreating the Function App made a new managed identity, leaving 6 orphaned role assignments pointing at the dead identity ('RoleAssignmentUpdateNotPermitted'). Deleted them (found via 'az role assignment list --all', blank principal) so Bicep could recreate them.
- **ODBC driver missing in container**: 'import pyodbc' crashed with 'libodbc.so.2 not found' - the base image has no ODBC driver. Fixed by installing 'unixodbc-dev' + 'msodbcsql18' in the Dockerfile via 'apt-get' before 'pip install'. On Debian 13 this hit a Microsoft key-bundle bug, so pinned the base image to 'bookworm' (Debian 12), which Microsoft's signing key correctly covers.
- **Container has no Azure identity**: running the container locally, 'DefaultAzureCredential' fails (no 'az login' inside it) - expected; resolved properly by AKS workload identity later.