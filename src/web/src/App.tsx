import { useState, useMemo } from 'react'
import './App.css'
import { useMsal, useIsAuthenticated } from '@azure/msal-react'
import { loginRequest } from './authConfig'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COMPARE_COLORS = ['#e74c3c', '#1abc9c', '#9b59b6', '#f39c12', '#3498db']

function App() {
  const [data, setData] = useState<any>(null)
  const [symbol, setSymbol] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [history, setHistory] = useState<any[]>([])
  const [pinnedKey, setPinnedKey] = useState<string | undefined>(undefined)
  const [page, setPage] = useState<'home' | 'about'>('home')
  const [showAI, setShowAI] = useState(false)
  const [brief, setBrief] = useState<string>("")
  const [briefLoading, setBriefLoading] = useState(false)
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([])
  const [input, setInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")

  const [compareSymbols, setCompareSymbols] = useState<string[]>([])
  const [compareData, setCompareData] = useState<{ [k: string]: any[] }>({})
  const [showSMA5, setShowSMA5] = useState(true)
  const [showSMA10, setShowSMA10] = useState(true)
  const [showSMA20, setShowSMA20] = useState(true)
  const [showRSI, setShowRSI] = useState(false)
  const [showVolatility, setShowVolatility] = useState(false)

  const [filterOpen, setFilterOpen] = useState(false)
  const [draftCompareSymbols, setDraftCompareSymbols] = useState<string[]>([])
  const [draftCompareData, setDraftCompareData] = useState<{ [k: string]: any[] }>({})
  const [draftShowSMA5, setDraftShowSMA5] = useState(true)
  const [draftShowSMA10, setDraftShowSMA10] = useState(true)
  const [draftShowSMA20, setDraftShowSMA20] = useState(true)
  const [draftShowRSI, setDraftShowRSI] = useState(false)
  const [draftShowVolatility, setDraftShowVolatility] = useState(false)
  const [compareInput, setCompareInput] = useState("")

  const { instance } = useMsal()
  const isAuthenticated = useIsAuthenticated()
  const hasSearched = history.length > 0

  const getToken = async () => {
    const account = instance.getActiveAccount() || instance.getAllAccounts()[0]
    const token = await instance.acquireTokenSilent({ ...loginRequest, account })
    return token.accessToken
  }

  const getData = async () => {
    if (!symbol) return
    const token = await getToken()
    const response = await fetch(`http://127.0.0.1:8000/market/${symbol}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!response.ok) {
      setData(null)
      setHistory([])
      setError("Please enter valid symbol")
      return
    }
    setData(await response.json())
    const response2 = await fetch(`http://127.0.0.1:8000/market/${symbol}/history`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    setHistory(await response2.json())
    setError("")
  }

  const openAI = async () => {
    if (!data?.Symbol) return
    setBriefLoading(true)
    const accessToken = await getToken()
    const res = await fetch(`http://127.0.0.1:8000/advice/brief/${data.Symbol}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    const resData = await res.json()
    setBrief(resData.brief)
    setBriefLoading(false)
  }

  const toggleAI = () => {
    const next = !showAI
    setShowAI(next)
    if (next && data?.Symbol && !brief) openAI()
  }

  const sendChat = async () => {
    const q = input.trim()
    if (!q || !data?.Symbol) return
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

  const openFilter = () => {
    setDraftCompareSymbols([...compareSymbols])
    setDraftCompareData({ ...compareData })
    setDraftShowSMA5(showSMA5)
    setDraftShowSMA10(showSMA10)
    setDraftShowSMA20(showSMA20)
    setDraftShowRSI(showRSI)
    setDraftShowVolatility(showVolatility)
    setFilterOpen(true)
  }

  const addDraftCompare = async () => {
    const sym = compareInput.trim().toUpperCase()
    if (!sym || draftCompareSymbols.includes(sym) || sym === data?.Symbol) return
    const token = await getToken()
    const res = await fetch(`http://127.0.0.1:8000/market/${sym}/history`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) {
      setCompareInput("")
      return
    }
    const d = await res.json()
    setDraftCompareData(prev => ({ ...prev, [sym]: d }))
    setDraftCompareSymbols(prev => [...prev, sym])
    setCompareInput("")
  }

  const removeDraftCompare = (sym: string) => {
    setDraftCompareSymbols(prev => prev.filter(s => s !== sym))
    setDraftCompareData(prev => {
      const next = { ...prev }
      delete next[sym]
      return next
    })
  }

  const applyFilter = () => {
    setCompareSymbols([...draftCompareSymbols])
    setCompareData({ ...draftCompareData })
    setShowSMA5(draftShowSMA5)
    setShowSMA10(draftShowSMA10)
    setShowSMA20(draftShowSMA20)
    setShowRSI(draftShowRSI)
    setShowVolatility(draftShowVolatility)
    setFilterOpen(false)
  }

  const handleLogin = () => instance.loginRedirect(loginRequest)

  const handleLegendClick = (payload: any) => {
    setPinnedKey(prev => prev === payload.dataKey ? undefined : payload.dataKey)
  }

  const lineOpacity = (key: string) =>
    pinnedKey === undefined || pinnedKey === key ? 1 : 0.15

  const earliestDate = history.length > 0 ? history[0].Stock_date.slice(0, 10) : ''
  const latestDate = history.length > 0 ? history[history.length - 1].Stock_date.slice(0, 10) : ''

  const filteredHistory = useMemo(() => {
    if (!startDate && !endDate) return history
    return history.filter(h => {
      const d = new Date(h.Stock_date)
      if (startDate && d < new Date(startDate)) return false
      if (endDate && d > new Date(endDate)) return false
      return true
    })
  }, [history, startDate, endDate])

  const chartData = useMemo(() => {
    const base = filteredHistory.map(h => ({ ...h }))
    for (const sym of compareSymbols) {
      const d = compareData[sym] || []
      const byDate: { [k: string]: any } = {}
      d.forEach((r: any) => { byDate[r.Stock_date] = r })
      base.forEach(row => {
        if (byDate[row.Stock_date]) {
          row[`${sym}_close`] = byDate[row.Stock_date].Symbol_close
        }
      })
    }
    return base
  }, [filteredHistory, compareSymbols, compareData])

  const useSecondaryAxis = showRSI || showVolatility

  const rows = [
    { label: "Symbol", value: data?.Symbol },
    { label: "Date", value: data ? new Date(data.Stock_date).toLocaleDateString() : "" },
    { label: "Open", value: data ? "$" + data.Symbol_open.toFixed(2) : "" },
    { label: "High", value: data ? "$" + data.Symbol_High.toFixed(2) : "" },
    { label: "Low", value: data ? "$" + data.Symbol_low.toFixed(2) : "" },
    { label: "Close", value: data ? "$" + data.Symbol_close.toFixed(2) : "" },
    { label: "Volume", value: data ? data.Symbol_volume : "" },
    { label: "SMA 5", value: data ? "$" + data.sma_five.toFixed(2) : "" },
    { label: "SMA 10", value: data ? "$" + data.sma_ten.toFixed(2) : "" },
    { label: "SMA 20", value: data ? "$" + data.sma_twenty.toFixed(2) : "" },
    { label: "RSI 14", value: data ? data.rsi.toFixed(2) : "" },
    { label: "Volatility", value: data ? (data.volatility * 100).toFixed(2) + "%" : "" }
  ]

  return (
    <>
      <nav className="navbar">
        <div className="nav-left">
          <a className={page === 'home' ? 'active' : ''} onClick={() => setPage('home')}>Home</a>
          <a className={page === 'about' ? 'active' : ''} onClick={() => setPage('about')}>About</a>
        </div>
        <div className="nav-right">
          <button
            className={`ai-toggle ${showAI ? 'active' : ''}`}
            onClick={toggleAI}
            title="Toggle AI panel"
            disabled={!data}
          >
            AI
          </button>
        </div>
      </nav>

      {page === 'home' && (
        <h1 className={`findash-title ${hasSearched ? 'in-nav' : 'in-hero'}`}>Findash</h1>
      )}

      <div className={`dashboard ${showAI ? 'with-ai' : ''}`}>
        <section className="main-col">
          {!isAuthenticated ? (
            <div className="hero">
              <button onClick={handleLogin}>Sign in with Microsoft!</button>
            </div>
          ) : page === 'about' ? (
            <div className="about">
              <h2>About Findash</h2>
              <p>Findash is an AI-powered financial insights dashboard built as a portfolio project to demonstrate end-to-end Azure cloud engineering. It ingests daily market data, computes technical indicators, serves them through an authenticated API, and layers Azure OpenAI on top for grounded commentary.</p>

              <h3>Data pipeline</h3>
              <p>A Python Azure Functions app (v2 model, Linux Consumption, system-assigned managed identity, zero connection strings) ingests a watchlist of 14 tickers from Alpha Vantage on a daily timer. The medallion architecture lands raw JSON in bronze, cleans it to Parquet in silver, and computes SMAs, RSI, and volatility into gold Parquet files plus an Azure SQL serving table. Storage uses ADLS Gen2 with Key Vault in RBAC mode. SQL access is Entra-only with federated tokens, no passwords anywhere in the pipeline.</p>

              <h3>API and identity</h3>
              <p>A containerized FastAPI service runs on AKS. The Dockerfile is multi-stage with a non-root user, pinned to python:3.11-slim-bookworm with ODBC Driver 18. Incoming JWTs are validated with python-jose against Entra's JWKS: signature, audience, issuer, and expiry. Two Entra app registrations split the stack cleanly: api-app exposes an access_as_user scope and defines Advisor and Client app roles for future role-based data filtering, and spa-app consumes that scope as a delegated permission.</p>

              <h3>AKS and workload identity</h3>
              <p>The cluster runs on the Free tier with one node, OIDC issuer enabled, workload identity federated to a Kubernetes service account. The pod authenticates to Azure SQL with a federated token using DefaultAzureCredential, so there are zero secrets inside the cluster. The kubelet identity has AcrPull on the ACR registry so image pulls are also credential-free. A nightly GitHub Actions workflow runs az aks stop for cost control.</p>

              <h3>AI layer</h3>
              <p>Azure OpenAI (gpt-5-mini) is deployed via Bicep. The pod's managed identity has the Cognitive Services OpenAI User role, so the API calls the model passwordless. Two endpoints: /advice/brief/&#123;symbol&#125; feeds the model computed metrics and returns a technical-posture summary with a data-as-of date and a not-financial-advice disclaimer. /advice/ask/&#123;question&#125; uses function calling: GPT decides when it needs data, calls get_metrics, the API runs the SQL query, and GPT writes the final answer grounded in that result. The AI never invents numbers, predicts prices, or recommends trades.</p>

              <h3>Planned hardening</h3>
              <ul>
                <li>APIM in front of the AKS ingress for JWT validation, per-role rate limits, response caching, and versioned /v1 routes</li>
                <li>Kubernetes NetworkPolicies with default-deny between namespaces</li>
                <li>Private endpoint sprint via Bicep deployment stacks: VNet, private endpoints for SQL, storage, and Key Vault, verified via KQL, then torn down (keep the skill, not the bill)</li>
                <li>Microsoft Defender CSPM enabled with findings remediated</li>
                <li>Queue-based ingestion with idempotency keys and poison-queue handling</li>
                <li>App Insights custom events for ingestion lag, AI token usage, per-endpoint latency, plus a KQL workbook tracking p95 latency, error budget burn, freshness, AI cost per user, and node uptime</li>
                <li>SLOs as Bicep alert rules: API p95 under 1s, data freshness under 24h, 99.5% availability while cluster is running</li>
                <li>Azure Policy to deny untagged resources and non-allowed regions</li>
              </ul>

              <h3>Infrastructure as code</h3>
              <p>Everything above is deployed via Bicep from day one. Nothing is created in the portal except the initial subscription bootstrap. GitHub Actions runs what-if on every PR and deploys on merge to main, using OIDC federated credentials. No stored client secrets.</p>

              <p className="about-link"><a href="https://github.com/Eclectic-Cloud-Labs" target="_blank" rel="noreferrer">github.com/Eclectic-Cloud-Labs</a></p>
            </div>
          ) : !hasSearched ? (
            <div className="hero">
              <input
                type="text"
                placeholder="Enter symbol (e.g. AAPL)"
                onChange={(e) => setSymbol(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") getData() }}
              />
              <button type="button" onClick={getData}>Search</button>
              {error && <p className="error">{error}</p>}
            </div>
          ) : (
            <>
              <div className="controls">
                <div className="filter-group">
                  <input
                    type="date"
                    value={startDate}
                    min={earliestDate}
                    max={latestDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <input
                    type="date"
                    value={endDate}
                    min={earliestDate}
                    max={latestDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                  <button onClick={openFilter}>Filter</button>
                  {filterOpen && (
                    <div className="filter-panel">
                      <h3>Compare Stocks</h3>
                      <div className="compare-chips">
                        {draftCompareSymbols.map(sym => (
                          <span key={sym} className="chip">
                            {sym}
                            <button onClick={() => removeDraftCompare(sym)}>×</button>
                          </span>
                        ))}
                      </div>
                      <div className="compare-input">
                        <input
                          type="text"
                          placeholder="Add symbol"
                          value={compareInput}
                          onChange={(e) => setCompareInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") addDraftCompare() }}
                        />
                        <button onClick={addDraftCompare}>Add</button>
                      </div>

                      <h3>Indicators</h3>
                      <label><input type="checkbox" checked={draftShowSMA5} onChange={(e) => setDraftShowSMA5(e.target.checked)} /> SMA 5</label>
                      <label><input type="checkbox" checked={draftShowSMA10} onChange={(e) => setDraftShowSMA10(e.target.checked)} /> SMA 10</label>
                      <label><input type="checkbox" checked={draftShowSMA20} onChange={(e) => setDraftShowSMA20(e.target.checked)} /> SMA 20</label>
                      <label><input type="checkbox" checked={draftShowRSI} onChange={(e) => setDraftShowRSI(e.target.checked)} /> RSI 14 <span className="hint">(right axis)</span></label>
                      <label><input type="checkbox" checked={draftShowVolatility} onChange={(e) => setDraftShowVolatility(e.target.checked)} /> Volatility <span className="hint">(right axis)</span></label>

                      <button className="apply-btn" onClick={applyFilter}>Apply</button>
                    </div>
                  )}
                </div>
                <div className="search-group">
                  <input
                    type="text"
                    placeholder="Enter symbol"
                    onChange={(e) => setSymbol(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") getData() }}
                  />
                  <button type="button" onClick={getData}>Search</button>
                </div>
                <div className="spacer" />
              </div>

              {error && <p className="error">{error}</p>}

              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis dataKey="Stock_date" stroke="#888" />
                    <YAxis yAxisId="left" domain={['auto', 'auto']} tickFormatter={(v: number) => v.toFixed(2)} stroke="#888" />
                    {useSecondaryAxis && (
                      <YAxis yAxisId="right" orientation="right" domain={['auto', 'auto']} tickFormatter={(v: number) => v.toFixed(2)} stroke="#888" />
                    )}
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(26, 26, 34, 0.92)',
                        border: '1px solid #2a2a30',
                        borderRadius: '6px',
                        color: '#fff'
                      }}
                      labelStyle={{ color: '#aaa' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(v) => (typeof v === 'number' ? v.toFixed(2) : String(v ?? ''))}
                    />
                    <Legend onClick={handleLegendClick} />
                    <Line yAxisId="left" type="monotone" dataKey="Symbol_close" stroke="#8884d8" dot={false} name={data?.Symbol || 'Close'} strokeOpacity={lineOpacity('Symbol_close')} isAnimationActive={false} />
                    {showSMA5 && <Line yAxisId="left" type="monotone" dataKey="sma_five" stroke="#82ca9d" dot={false} name="SMA 5" strokeOpacity={lineOpacity('sma_five')} isAnimationActive={false} />}
                    {showSMA10 && <Line yAxisId="left" type="monotone" dataKey="sma_ten" stroke="#ffc658" dot={false} name="SMA 10" strokeOpacity={lineOpacity('sma_ten')} isAnimationActive={false} />}
                    {showSMA20 && <Line yAxisId="left" type="monotone" dataKey="sma_twenty" stroke="#ff7300" dot={false} name="SMA 20" strokeOpacity={lineOpacity('sma_twenty')} isAnimationActive={false} />}
                    {showRSI && <Line yAxisId="right" type="monotone" dataKey="rsi" stroke="#c084fc" dot={false} name="RSI 14" strokeOpacity={lineOpacity('rsi')} isAnimationActive={false} />}
                    {showVolatility && <Line yAxisId="right" type="monotone" dataKey="volatility" stroke="#2ecc71" dot={false} name="Volatility" strokeOpacity={lineOpacity('volatility')} isAnimationActive={false} />}
                    {compareSymbols.map((sym, i) => (
                      <Line
                        key={sym}
                        yAxisId="left"
                        type="monotone"
                        dataKey={`${sym}_close`}
                        stroke={COMPARE_COLORS[i % COMPARE_COLORS.length]}
                        dot={false}
                        name={sym}
                        strokeOpacity={lineOpacity(`${sym}_close`)}
                        isAnimationActive={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {data && (
                <div className="stats-grid">
                  {rows.map(row => (
                    <div key={row.label} className="stat-card">
                      <div className="stat-label">{row.label}</div>
                      <div className="stat-value">{row.value}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        <aside className={`ai-col ${showAI ? 'open' : ''}`}>
          <div className="ai-header">
            <h2>AI Insights: {data?.Symbol || ''}</h2>
          </div>
          <div className="ai-brief">
            {briefLoading ? "Thinking..." : brief || "Click AI in the navbar after searching a symbol."}
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
      </div>
    </>
  )
}

export default App