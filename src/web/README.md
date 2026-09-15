# Findash Frontend - React + TypeScript

React/TypeScript single-page application (SPA) for the Findash dashboard. Displays market data from the FastAPI backend with Microsoft Entra authentication.

## What it is
- SPA built with React + TypeScript, scaffolded via Vite
- Fetches market data from the backend '/market/{symbol}' endpoint
- Authenticated via MSAL (Microsoft Authentication Library) using OAuth2 Authorization Code + PKCE flow
- Unauthenticated users see a login button - authenticated users see the dashboard with a symbol search box and data table

## Setup
- 'npm create vite@latest' - React, TypeScript, ESLint
- 'npm run dev' to start the Vite dev server on http://localhost:5173
- Portal App Registrations
  - 'api-app' (API registration) - exposes a scope 'access_as_user' via its Application ID URI, which gets baked into the token's 'aud' claim
  - 'spa-app' (SPA registration) - has a redirect URI of http://localhost:5173 and delegated permission to request the API's scope
  - Both are single-tenant, registered in the same Entra directory

### Auth packages
- '@azure/msal-browser' - core MSAL library handling the OAuth2 token flow (redirects, token acquisition, caching)
- '@azure/msal-react' - React wrapper providing hooks ('useMsal', 'useIsAuthenticated') and the 'MsalProvider' context

## How it works
### Data flow
- User types a symbol in the search box and clicks Search (or presses Enter)
- 'getData' acquires an access token silently via 'instance.acquireTokenSilent' from MSAL's cache
- Fetch sends the token as an 'Authorization: Bearer <token>' header to the backend
- Backend validates the token (signature, audience, issuer, expiry) and returns data or 401
- Data is stored in React state via 'useState' and rendered as a formatted table using '.map()'

### Auth flow (OAuth2 Authorization Code + PKCE) [link](https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow-with-pkce#how-to-implement-it)
- SPA is a public client - it can't securely store a client secret because everything is available in the browser
- PKCE solves this: the app creates a code verifier (a random secret), transforms it into a code challenge, and sends the challenge over HTTPS
- After login, the authorization server returns an auth code that can only be exchanged using the original code verifier - an attacker intercepting the auth code alone cannot use it
- MSAL handles this entire flow via 'loginRedirect'

### Security
- Client side auth ('isAuthenticated') is purely UX convenience - it controls what the user sees, not what they can access
- There is real security on server side. FastAPI validates every token's signature, audience, issuer, and expiry before returning any data with 401 code if any claim is incorrect
- React prevents XSS by default (escapes all rendered content) - tokens stored in sessionStorage (which is cleared on tab close)
- Client IDs and tenant IDs are visible in frontend code by design - SPAs are public clients, these are identifiers not credentials

## Config Files
- 'authConfig.ts' - MSAL configuration (SPA client ID, tenant authority, redirect URI, API scope)
- 'main.tsx' - creates the MSAL instance and wraps the app in 'MsalProvider'
- 'App.tsx' - main component with login flow, search, fetch with auth headers, data display

## Issues resolved from Front end console
- CORS: browser blocks cross-origin requests (frontend on 5173, API on 8000) - fixed by adding 'CORSMiddleware' in FastAPI with 'allow_origins=["http://localhost:5173"]'
- MSAL popup flow: popup opened the React app again instead of processing the auth response and closing - switched to 'loginRedirect' which avoids popup-detection complexity entirely
- 'interaction_in_progress' error: stale MSAL state in sessionStorage from failed popup attempts - cleared by wiping session storage or using incognito
- 'no_account_error': 'acquireTokenSilent' needs an explicit account reference - fixed by passing 'instance.getActiveAccount() || instance.getAllAccounts()[0]'
- 'authority_mismatch': token request authority didn't match the login authority - fixed by explicitly passing 'msalConfig.auth.authority' in the silent token request
- Audience mismatch (401 from own API): token's 'aud' claim is 'api://62599e34-...' (the Application ID URI) but validation was checking against the bare client ID '62599e34-...' - fixed by matching the full 'api://' prefixed URI in auth.py