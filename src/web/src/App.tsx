import { useState } from 'react'
import './App.css'
import { useMsal, useIsAuthenticated } from '@azure/msal-react'
import { loginRequest } from './authConfig';

function App() {

  const [data, setData] = useState<any>(null)
  const [symbol, setSymbol] = useState<string>("")
  const [error, setError] = useState<string>("")

  const { instance } = useMsal()
  const isAuthenticated = useIsAuthenticated()

  const getData = async () => {
    const getAccount = instance.getActiveAccount() || instance.getAllAccounts()[0]
    const getToken = await instance.acquireTokenSilent({
      ...loginRequest, 
      account:getAccount
    }) 
    const response = await fetch(`http://127.0.0.1:8000/market/${symbol}`, {
      headers: {
        Authorization: `Bearer ${(getToken).accessToken}`
      }
    })
    if(!response.ok){
      setData(null)
      setError("Please enter valid symbol")
      return
    }
    const json = await response.json()
    setData(json)
    setError("")
  }

  const rows = [
    { label: "Symbol", value: data?.Symbol },
    { label: "Date", value: data ? new Date(data.Stock_date).toLocaleDateString() : "" },
    { label: "Open", value: data ? "$" + data.Symbol_open.toFixed(2) : "" },
    { label: "High", value: data ? "$" + data.Symbol_High.toFixed(2) : "" },
    { label: "Low", value: data ? "$" + data.Symbol_low.toFixed(2) : "" },
    { label: "Close", value: data ? "$" + data.Symbol_close.toFixed(2) : "" },
    { label: "Volume", value: data ? data.Symbol_volume : "" },
    { label: "SMA (5-day)", value: data ? "$" + data.sma_five.toFixed(2) : "" },
    { label: "SMA (10-day)", value: data ? "$" + data.sma_ten.toFixed(2) : "" },
    { label: "SMA (20-day)", value: data ? "$" + data.sma_twenty.toFixed(2) : "" },
    { label: "RSI (14-day)", value: data ? data.rsi.toFixed(2) : "" },
    { label: "Volatility", value: data ? (data.volatility * 100).toFixed(4) + "%" : "" }
  ]

  

  const handleLogin = () => {
    instance.loginRedirect(loginRequest)
  }

  return (
    <>
      <section id="center">
        {!isAuthenticated ? (<button onClick={handleLogin}>Sign in with Microsoft!</button>) : (
          <>
            <div>
              <h1>Findash Front End</h1>
              <p>
                Click below for an api call
              </p>
            </div>
            <div>
              <input type='text' required placeholder="Enter symbol" onChange={(e) => setSymbol(e.target.value)} onKeyDown={(e) => {if (e.key == "Enter") getData();}}>
              </input>
              {error && <p>{error}</p>}
            </div>
            <div>
              <button
                type="submit"
                className="counter"
                onClick={getData}
              >
                <p>Search Symbol</p>
              </button>
            </div>

            <table>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label}>
                    <th>{row.label}</th>
                    <td>{row.value}</td>
                  </tr>

                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

    </>
  )
}
//  
export default App
