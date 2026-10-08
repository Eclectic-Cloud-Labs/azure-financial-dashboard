import { useState } from 'react'
import './App.css'
import { useMsal, useIsAuthenticated } from '@azure/msal-react'
import { loginRequest } from './authConfig';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { LegendPayload } from 'recharts'

function App() {

  const [data, setData] = useState<any>(null)
  const [symbol, setSymbol] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [history, setHistory] = useState<any[]>([])
  const [hoveringDataKey, setHoveringDataKey] = useState<any>(undefined);

  const { instance } = useMsal()
  const isAuthenticated = useIsAuthenticated()
  const [showAI, setShowAI] = useState(false)
  const [brief, setBrief] = useState<string>("")
  const [briefLoading, setBriefLoading] = useState(false)

  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([])
  const [input, setInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)



  const getToken = async () => {
    const account = instance.getActiveAccount() || instance.getAllAccounts()[0]
    const token = await instance.acquireTokenSilent({ ...loginRequest, account })
    return token.accessToken
  }

  const getData = async () => {
    const token = await getToken()

    const response = await fetch(`http://127.0.0.1:8000/market/${symbol}`, {
      headers: {
        Authorization: `Bearer ${(token)}`
      }
    })
    if (!response.ok) {
      setData(null)
      setError("Please enter valid symbol")
      return
    }
    setData(await response.json())

    const response2 = await fetch(`http://127.0.0.1:8000/market/${symbol}/history`, {
      headers: {
        Authorization: `Bearer ${(token)}`
      }
    })
    setHistory(await response2.json())
    setError("")

  }

  const openAI = async () => {
    const symbol = data?.Symbol
    if (!symbol) return
    setShowAI(true)
    setBriefLoading(true)
    const accessToken = await getToken()
    const res = await fetch(`http://127.0.0.1:8000/advice/brief/${data.Symbol}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    const resData = await res.json()
    setBrief(resData.brief)
    setBriefLoading(false)
  }

  const sendChat = async () => {
    const q = input.trim()
    if (!q || !data?.Symbol) return
    // prepending symbol context so GPT knows which ticker without the user retelling
    const fullQ = `About ${data.Symbol}: ${q}`
    setMessages(prev => [...prev, { role: 'user', text: q }])
    setInput("")
    setChatLoading(true)
    const accessToken = await getToken()
    const res = await fetch(`http://127.0.0.1:8000/advice/ask/${encodeURIComponent(fullQ)}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    const answer = await res.json()
    setMessages(prev => [...prev, { role: 'ai', text: answer.answer }])
    setChatLoading(false)
  }

  const handleLogin = () => {
    instance.loginRedirect(loginRequest)
  }
  const handleLegendEnter = (payload: LegendPayload) => {
    setHoveringDataKey(payload.dataKey)
  }

  const handleLegendLeave = () => {
    setHoveringDataKey(undefined)
  }

  const lineOpacity = (key: string) =>
    hoveringDataKey === undefined || hoveringDataKey === key ? 1 : 0.2


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

  return (
    <>
      <div className = "dashboard">
        <section id="main-col">
          {!isAuthenticated ? (
            <button onClick={handleLogin}>Sign in with Microsoft!</button>
          ) : (
            <>
              <div>
                <h1>Findash</h1>
                <input
                  type="text"
                  required
                  placeholder="Enter symbol"
                  onChange={(e) => setSymbol(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") getData(); }}
                />
                <button type="button" onClick={getData}>Search</button>
                {error && <p>{error}</p>}
              </div>

              {/* Dashboard */}
              {history.length > 0 && (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={history}>
                    <XAxis dataKey="Stock_date" />
                    <YAxis domain={['auto', 'auto']} tickFormatter={(v: number) => v.toFixed(2)} />
                    <Tooltip formatter={(v) => (typeof v === 'number' ? v.toFixed(2) : String(v ?? ''))} />
                    <Legend onMouseEnter={handleLegendEnter} onMouseLeave={handleLegendLeave} />
                    <Line type="monotone" dataKey="Symbol_close" stroke="#8884d8" dot={false} name="Close" strokeOpacity={lineOpacity('Symbol_close')} />
                    <Line type="monotone" dataKey="sma_five" stroke="#82ca9d" dot={false} name="SMA 5" strokeOpacity={lineOpacity('sma_five')} />
                    <Line type="monotone" dataKey="sma_ten" stroke="#ffc658" dot={false} name="SMA 10" strokeOpacity={lineOpacity('sma_ten')} />
                    <Line type="monotone" dataKey="sma_twenty" stroke="#ff7300" dot={false} name="SMA 20" strokeOpacity={lineOpacity('sma_twenty')} />
                  </LineChart>
                </ResponsiveContainer>
              )}

              {/* shows AI summary of data/BRIEF */}
              {data && (
                <button type="button" onClick={openAI}>Tell me more with AI</button>
              )}


              {/* {data && (
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
              )} */}
            </>
          )}
        </section>

        {showAI && (
          <aside className="ai-col">
            <div className="ai-header">
              <h2>AI Insights: {data?.Symbol}</h2>
              <button onClick={() => setShowAI(false)}>Close</button>
            </div>

            <div className="ai-brief">
              {briefLoading ? "Thinking..." : brief}
            </div>

            <div className="ai-chat">
              <div className="ai-messages">
                {messages.map((m, i) => (
                  <div key={i} className={`msg msg-${m.role}`}>
                    <strong>{m.role === 'user' ? 'You' : 'AI'}:</strong> {m.text}
                  </div>
                ))}
                {chatLoading && <div className="msg msg-ai">AI: thinking...</div>}
              </div>
              <div className="ai-input">
                <input
                  type="text"
                  value={input}
                  placeholder="Ask about this stock..."
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") sendChat() }}
                />
                <button onClick={sendChat} disabled={chatLoading}>Send</button>
              </div>
            </div>
          </aside>
        )}
      </div>



    </>
  )

}
export default App