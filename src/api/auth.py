import requests
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError

# Your Entra values
TENANT_ID = "87e450d8-9ee3-4538-a4b3-3cb61e605824"
CLIENT_ID = "api://62599e34-c893-4653-92c2-218aeb8c3741"
AUTHORITY = f"https://login.microsoftonline.com/{TENANT_ID}"
JWKS_URL = f"{AUTHORITY}/discovery/v2.0/keys"

# This tells FastAPI to look for a "Bearer <token>" header
security_scheme = HTTPBearer()

def get_signing_keys():
    # Fetch Entra's public signing keys
    response = requests.get(JWKS_URL)
    return response.json()

def validate_token(credentials: HTTPAuthorizationCredentials = Depends(security_scheme)):
    # Validate the JWT token from the Authorization header
    token = credentials.credentials
    jwks = get_signing_keys()

    try:
        payload = jwt.decode( # validates the token coming in
            token,
            jwks,
            algorithms=["RS256"],
            audience=CLIENT_ID,
            issuer=f"https://sts.windows.net/{TENANT_ID}/"
        )
        return payload
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")