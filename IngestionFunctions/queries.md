query 1 
CREATE USER [gurbosFunctionApp] FROM EXTERNAL PROVIDER;
ALTER ROLE db_datawriter ADD MEMBER [gurbosFunctionApp];
ALTER ROLE db_datareader ADD MEMBER [gurbosFunctionApp];

query 2 
CREATE TABLE Technical_indicators (
    Symbol VARCHAR(10) NOT NULL,
    Stock_date DATE NOT NULL,
    Symbol_open FLOAT,
    Symbol_High FLOAT,
    Symbol_low FLOAT,
    Symbol_close FLOAT,
    Symbol_volume FLOAT,
    Sma_five FLOAT,
    Sma_ten FLOAT,
    Sma_twenty FLOAT,
    Rsi FLOAT,
    Volatility FLOAT,
    PRIMARY KEY (Symbol, Stock_date)  
);

query 3 
SELECT * FROM Technical_indicators ORDER BY Stock_date DESC;