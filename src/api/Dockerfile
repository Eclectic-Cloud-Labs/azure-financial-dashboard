# Building
FROM python:3.11-slim-bookworm AS builder

WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt --target /app/dependencies

# Runtime
FROM python:3.11-slim-bookworm

# ODBC driver install (needed at runtime)
RUN apt-get update && apt-get install -y \
    curl gnupg unixodbc-dev \
    && mkdir -p /usr/share/keyrings \
    && curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg \
    && curl https://packages.microsoft.com/config/debian/12/prod.list > /etc/apt/sources.list.d/mssql-release.list \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y msodbcsql18 \
    && apt-get purge -y curl gnupg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/dependencies /usr/local/lib/python3.11/site-packages
RUN useradd --create-home appuser
USER appuser
COPY . .
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]