import { useState } from 'react'
import './App.css'

function App() {

  const [data, setData] = useState<any>(null)

  const getData = async () => {
    const response = await fetch("http://127.0.0.1:8000/market/IBM")
    const json = await response.json()
    setData(json)
  }

  const rows = [
    { label: "Symbol", value: data?.Symbol },
    { label: "Date", value: data ? new Date(data.Stock_date).toLocaleDateString() : "" },
    { label: "Open", value: data ? "$" + data.Symbol_open.toFixed(2) : "" },
    { label: "High", value: data ? "$" + data.Symbol_High.toFixed(2) : ""},
    { label: "Low", value: data ? "$" + data.Symbol_High.toFixed(2) : ""},
    { label: "Close", value: data ? "$" + data.Symbol_High.toFixed(2) : ""},
    { label: "Volume", value: data ? data.Symbol_volume : ""},
    { label: "SMA (5-day)", value: data ? "$" + data.sma_five.toFixed(2) : ""},
    { label: "SMA (10-day)", value: data ? "$" + data.sma_ten.toFixed(2) : ""},
    { label: "SMA (20-day)", value: data ? "$" + data.sma_twenty.toFixed(2) : ""},
    { label: "RSI (14-day)", value: data ? data.rsi.toFixed(2) : ""},
    { label: "Volatility", value: data ? (data.volatility * 100).toFixed(4)+ "%" : ""}
  ]

  return (
    <>
      <section id="center">
        <div>
          <h1>Findash Front End</h1>
          <p>
            Click below for an api call 
          </p>
        </div>
        <button
          type="button"
          className="counter"
          onClick={getData}
        >
          <p>Click Here!</p>
        </button>
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
      </section>

    </>
  )
}
//  
export default App
