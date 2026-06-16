import { useState, useEffect } from 'react'
import { fetchYFQuote, fmt } from '../lib/api'

const DEFAULT_WATCHLIST = ['AAPL', 'TSLA', 'MSFT', 'NVDA', 'AMZN']

export default function Sidebar({ activeTicker, onSelect }) {
  const [watchlist, setWatchlist]   = useState(DEFAULT_WATCHLIST)
  const [prices, setPrices]         = useState({})
  const [addInput, setAddInput]     = useState('')
  const [recents, setRecents]       = useState([])

  // expose recents setter to parent via onSelect
  const handleSelect = (ticker) => {
    setRecents(prev => [ticker, ...prev.filter(t => t !== ticker)].slice(0, 5))
    onSelect(ticker)
  }

  // fetch watchlist prices on mount + every 60s
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

  return (
    <aside className="w-56 flex-shrink-0 border-r border-neutral-800 bg-neutral-950 flex flex-col overflow-hidden">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-neutral-800">
        <span className="text-sm font-medium text-white tracking-wide">⬡ FinDash</span>
      </div>

      {/* Watchlist */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-3 pb-1">
          <span className="text-xs text-neutral-500 uppercase tracking-widest">Watchlist</span>
        </div>

        {watchlist.map(t => {
          const p = prices[t]
          const pos = p ? p.chg >= 0 : null
          return (
            <div
              key={t}
              onClick={() => handleSelect(t)}
              className={`sidebar-item group ${activeTicker === t ? 'active' : ''}`}
            >
              <span className="font-medium text-sm">{t}</span>
              <div className="flex items-center gap-1">
                {p && (
                  <span className={`text-xs font-mono ${pos ? 'text-green-500' : 'text-red-500'}`}>
                    {pos ? '+' : ''}{p.chg.toFixed(2)}%
                  </span>
                )}
                <button
                  onClick={(e) => removeTicker(t, e)}
                  className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400 transition-opacity ml-1 text-xs"
                  aria-label={`Remove ${t}`}
                >✕</button>
              </div>
            </div>
          )
        })}

        {/* Add ticker input */}
        <div className="flex gap-1 px-3 mt-2">
          <input
            value={addInput}
            onChange={e => setAddInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTicker()}
            placeholder="Add ticker..."
            className="flex-1 text-xs bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-white placeholder-neutral-500 focus:border-brand-400"
          />
          <button
            onClick={addTicker}
            className="text-xs bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-neutral-300 hover:bg-neutral-700 transition-colors"
          >+</button>
        </div>

        {/* Recents */}
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
