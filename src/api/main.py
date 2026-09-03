from fastapi import FastAPI
from azure.identity import DefaultAzureCredential
import struct
import pyodbc
import time
import asyncio


def get_conn():
    SQL_COPT_SS_ACCESS_TOKEN = 1256
    credential = DefaultAzureCredential()
    token = credential.get_token("https://database.windows.net/.default")
    token_bytes = token.token.encode("utf-16-le")
    token_struct = struct.pack(f'<I{len(token_bytes)}s', len(token_bytes), token_bytes)
    
    conn_str = (
        "Driver={ODBC Driver 18 for SQL Server};Server=gurbosqlserver.database.windows.net;Database=gurboSqlDb;Encrypt=yes;"
    )
    max_attempts = 5
    for attempt in range(max_attempts):
        try:
            print(f"Attempt {attempt+1} to connect to SQL Server")
            return pyodbc.connect(conn_str, attrs_before={SQL_COPT_SS_ACCESS_TOKEN: token_struct}, timeout=60)
            
        except pyodbc.Error as er:
            if "40613" in str(er):
                time.sleep(60)  
                continue
            elif str(er):
                raise Exception(str(er))
    raise Exception(f"Failed to connect after {max_attempts} attempts")


app = FastAPI()

@app.get("/")
async def root():
    with get_conn() as conn:
        cursor: pyodbc.cursor = conn.cursor()
        cursor.execute("SELECT TOP 1 * FROM Technical_indicators")
        row = cursor.fetchone()
            
        titles = []
        for title in cursor.description:
            print(title[0])

        return dict(zip(titles, row))


## LOCAL TESTING ##
asyncio.run(root())
        