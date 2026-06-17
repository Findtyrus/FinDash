import { useState, useEffect, useRef } from 'react'
import { fetchYFQuote, fmt } from '../lib/api'

const DEFAULT_WATCHLIST = ['AAPL', 'TSLA', 'MSFT', 'NVDA', 'AMZN']

export default function Sidebar({ activeTicker, onSelect }) {
  const [watchlist, setWatchlist]     = useState(DEFAULT_WATCHLIST)
  const [prices, setPrices]           = useState({})
  const [addInput, setAddInput]       = useState('')
  const [recents, setRecents]         = useState([])
  const [alerts, setAlerts]           = useState(() => JSON.parse(localStorage.getItem('findash-alerts') || '{}'))
  const [alertEditing, setAlertEditing] = useState(null)
  const [alertInput, setAlertInput]   = useState('')
  const alertsRef = useRef(alerts)

  useEffect(() => { alertsRef.current = alerts }, [alerts])

  const handleSelect = (ticker) => {
    setRecents(prev => [ticker, ...prev.filter(t => t !== ticker)].slice(0, 5))
    onSelect(ticker)
  }

  useEffect(() => {
    const fetchAll = async () => {
      const results = await Promise.allSettled(watchlist.map(t => fetchYFQuote(t)))
      const map = {}
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          const q = r.value
          const chg = ((q.regularMarketPrice - q.chartPreviousClose) / q.chartPreviousClose * 100)
          map[watchlist[i]] = { price: q.regularMarketPrice, chg }
        }
      })
      setPrices(map)

      // Check alert conditions
      Object.entries(alertsRef.current).forEach(([t, alert]) => {
        const price = map[t]?.price
        if (!price) return
        const triggered = (alert.above && price >= alert.above) || (alert.below && price <= alert.below)
        if (triggered) {
          const alertPrice = alert.above || alert.below
          if (Notification.permission === 'granted') {
            new Notification(`FinDash Alert: ${t}`, {
              body: `${t} hit your target price of $${alertPrice}`,
            })
          }
          setAlerts(prev => {
            const next = { ...prev }
            delete next[t]
            localStorage.setItem('findash-alerts', JSON.stringify(next))
            return next
          })
        }
      })
    }
    fetchAll()
    const id = setInterval(fetchAll, 60_000)
    return () => clearInterval(id)
  }, [watchlist])

  const addTicker = () => {
    const t = addInput.trim().toUpperCase()
    if (t && !watchlist.includes(t)) setWatchlist(prev => [...prev, t])
    setAddInput('')
  }

  const removeTicker = (t, e) => {
    e.stopPropagation()
    setWatchlist(prev => prev.filter(x => x !== t))
  }

  const toggleAlertEdit = (t, e) => {
    e.stopPropagation()
    setAlertEditing(prev => prev === t ? null : t)
    setAlertInput('')
  }

  const saveAlert = (t) => {
    const price = parseFloat(alertInput)
    if (isNaN(price) || price <= 0) return
    Notification.requestPermission()
    const currentPrice = prices[t]?.price
    const alert = currentPrice && price > currentPrice ? { above: price } : { below: price }
    const newAlerts = { ...alerts, [t]: alert }
    setAlerts(newAlerts)
    localStorage.setItem('findash-alerts', JSON.stringify(newAlerts))
    setAlertEditing(null)
    setAlertInput('')
  }

  const removeAlert = (t) => {
    const newAlerts = { ...alerts }
    delete newAlerts[t]
    setAlerts(newAlerts)
    localStorage.setItem('findash-alerts', JSON.stringify(newAlerts))
  }

  return (
    <aside className="w-56 flex-shrink-0 border-r border-neutral-800 bg-neutral-950 flex flex-col overflow-hidden">
      <div className="px-4 py-4 border-b border-neutral-800">
        <span className="text-sm font-medium text-white tracking-wide">⬡ FinDash</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-3 pb-1">
          <span className="text-xs text-neutral-500 uppercase tracking-widest">Watchlist</span>
        </div>

        {watchlist.map(t => {
          const p = prices[t]
          const pos = p ? p.chg >= 0 : null
          const hasAlert = !!alerts[t]
          const alertPrice = hasAlert ? (alerts[t].above || alerts[t].below) : null
          return (
            <div key={t}>
              <div
                onClick={() => handleSelect(t)}
                className={`sidebar-item group ${activeTicker === t ? 'active' : ''}`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {hasAlert && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />}
                  <span className="font-medium text-sm truncate">{t}</span>
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  {p && (
                    <span className={`text-xs font-mono ${pos ? 'text-green-500' : 'text-red-500'}`}>
                      {pos ? '+' : ''}{p.chg.toFixed(2)}%
                    </span>
                  )}
                  <button
                    onClick={(e) => toggleAlertEdit(t, e)}
                    title={hasAlert ? `Alert: $${alertPrice}` : 'Set price alert'}
                    className={`opacity-0 group-hover:opacity-100 transition-opacity text-xs px-0.5 ${
                      hasAlert ? '!opacity-100 text-amber-400' : 'text-neutral-500 hover:text-amber-400'
                    }`}
                  >🔔</button>
                  <button
                    onClick={(e) => removeTicker(t, e)}
                    className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400 transition-opacity text-xs"
                    aria-label={`Remove ${t}`}
                  >✕</button>
                </div>
              </div>

              {alertEditing === t && (
                <div className="px-3 py-2 bg-neutral-900 border-b border-neutral-800">
                  <div className="flex gap-1">
                    <input
                      autoFocus
                      type="number"
                      step="0.01"
                      value={alertInput}
                      onChange={e => setAlertInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveAlert(t)
                        if (e.key === 'Escape') setAlertEditing(null)
                      }}
                      placeholder="Target price..."
                      className="flex-1 text-xs bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-white placeholder-neutral-500 focus:border-amber-400 outline-none"
                      onClick={e => e.stopPropagation()}
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); saveAlert(t) }}
                      className="text-xs bg-amber-600 hover:bg-amber-500 rounded px-2 py-1 text-white transition-colors"
                    >Set</button>
                  </div>
                  {hasAlert && (
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs text-amber-400">
                        Alert: ${alertPrice} {alerts[t].above ? '↑ above' : '↓ below'}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeAlert(t) }}
                        className="text-xs text-red-400 hover:text-red-300"
                      >Remove</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        <div className="flex gap-1 px-3 mt-2">
          <input
            value={addInput}
            onChange={e => setAddInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTicker()}
            placeholder="Add ticker..."
            className="flex-1 text-xs bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-white placeholder-neutral-500 focus:border-brand-400 outline-none"
          />
          <button
            onClick={addTicker}
            className="text-xs bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-neutral-300 hover:bg-neutral-700 transition-colors"
          >+</button>
        </div>

        {recents.length > 0 && (
          <>
            <div className="px-4 pt-4 pb-1">
              <span className="text-xs text-neutral-500 uppercase tracking-widest">Recent</span>
            </div>
            {recents.map(t => (
              <div key={t} onClick={() => handleSelect(t)} className="sidebar-item">
                <span className="text-neutral-400 text-xs mr-2">↩</span>
                <span className="text-sm">{t}</span>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="px-3 py-3 border-t border-neutral-800">
        <div className="text-xs text-neutral-600 leading-relaxed">
          Data: <span className="text-green-700">Yahoo Finance</span> · <span className="text-brand-600">Finnhub</span>
        </div>
      </div>
    </aside>
  )
}
