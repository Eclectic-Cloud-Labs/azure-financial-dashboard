"""
Connects to a SQL database using mssql-python
"""

from mssql_python import connect
from pandas import pd
from sqlalchemy import create_engine

connection_string = "Server=gurboSqlServer.database.windows.net;Database=gurboSqlDb;Authentication=ActiveDirectoryDefault;Encrypt=yes;"

def get_conn():
    return connect(connection_string)

# engine = create_engine("mssql+pyodbc://", creator=get_conn)

try:
    # Establish connection
    with connect(connection_string) as conn:
        print("Successfully connected to SQL Server!")
        
        engine = create_engine("    ", echo=False)
        engine.execute("SELECT * FROM users").fetchall()
        # df = pd.DataFrame({'name' : ['User P', 'User Q', 'User R']})
        # print(df)
        # df.to_sql('users', con=conn)
        # conn.execute("SELECT * FROM users").fetchall()
        
except Exception as e:
    print(f"An error occurred: {e}")



# from os import getenv
# from typing import Union
# from dotenv import load_dotenv
# from fastapi import FastAPI
# from pydantic import BaseModel
# from mssql_python import connect

# load_dotenv()

# class Person(BaseModel):
#     first_name: str
#     last_name: Union[str, None] = None

# connection_string = getenv("AZURE_SQL_CONNECTIONSTRING")

# app = FastAPI()

# @app.get("/")
# def root():
#     print("Root of Person API")
#     try:
#         conn = get_conn()
#         cursor = conn.cursor()

#         # Table should be created ahead of time in production app.
#         cursor.execute("""
#             IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Persons')
#             CREATE TABLE Persons (
#                 ID int NOT NULL PRIMARY KEY IDENTITY,
#                 FirstName varchar(255),
#                 LastName varchar(255)
#             );
#         """)

#         conn.commit()
#         conn.close()
#     except Exception as e:
#         # Table might already exist
#         print(e)
#     return "Person API"

# @app.get("/all")
# def get_persons():
#     rows = []
#     with get_conn() as conn:
#         cursor = conn.cursor()
#         cursor.execute("SELECT * FROM Persons")

#         for row in cursor.fetchall():
#             print(row.FirstName, row.LastName)
#             rows.append(f"{row.ID}, {row.FirstName}, {row.LastName}")
#     return rows

# @app.get("/person/{person_id}")
# def get_person(person_id: int):
#     with get_conn() as conn:
#         cursor = conn.cursor()
#         cursor.execute("SELECT * FROM Persons WHERE ID = ?", (person_id,))

#         row = cursor.fetchone()
#         return f"{row.ID}, {row.FirstName}, {row.LastName}"

# @app.post("/person")
# def create_person(item: Person):
#     with get_conn() as conn:
#         cursor = conn.cursor()
#         cursor.execute("INSERT INTO Persons (FirstName, LastName) VALUES (?, ?)",
#                        (item.first_name, item.last_name))
#         conn.commit()

#     return item

# def get_conn():
#     """Connect using mssql-python with built-in Microsoft Entra authentication."""
#     conn = connect(connection_string)
#     conn.setautocommit(True)
#     return conn

