import { useState, useEffect } from 'react'
import { fetchFinnhubPeers, fetchFinnhubPeerMetrics, fmtX } from '../lib/api'

function cellStyle(current, peer, higherIsBetter) {
  if (current == null || peer == null) return 'text-neutral-400'
  const ratio = peer / current
  if (higherIsBetter) {
    if (ratio > 1.1) return 'text-green-500'
    if (ratio < 0.9) return 'text-red-400'
  } else {
    if (ratio < 0.9) return 'text-green-500'
    if (ratio > 1.1) return 'text-red-400'
  }
  return 'text-neutral-300'
}

const COLS = [
  { label: 'P/E',        key: 'pe',        fmt: fmtX,                                                          higherIsBetter: false },
  { label: 'EV/EBITDA',  key: 'evEbitda',  fmt: fmtX,                                                          higherIsBetter: false },
  { label: 'P/S',        key: 'ps',        fmt: fmtX,                                                          higherIsBetter: false },
  { label: 'Net Margin', key: 'netMargin', fmt: v => v != null ? `${v.toFixed(1)}%` : '—',                    higherIsBetter: true  },
  { label: 'ROE',        key: 'roe',       fmt: v => v != null ? `${v.toFixed(1)}%` : '—',                    higherIsBetter: true  },
]

export default function PeerPanel({ ticker, currentMetrics }) {
  const [rows, setRows] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!ticker || !import.meta.env.VITE_FINNHUB_KEY) return
    setRows(null)
    setError(null)
    setLoading(true)

    fetchFinnhubPeers(ticker)
      .then(peers => {
        if (!peers || peers.length === 0) { setRows([]); return null }
        return Promise.all(peers.map(p => fetchFinnhubPeerMetrics(p)))
      })
      .then(peerData => { if (peerData) setRows(peerData.filter(Boolean)) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [ticker])

  if (!import.meta.env.VITE_FINNHUB_KEY) return null

  const current = {
    pe:        currentMetrics?.['peBasicExclExtraTTM'],
    evEbitda:  currentMetrics?.['evEbitdaTTM'],
    netMargin: currentMetrics?.['netProfitMarginTTM'],
    roe:       currentMetrics?.['roeTTM'],
    ps:        currentMetrics?.['psTTM'],
  }

  return (
    <div className="card">
      <div className="text-xs text-neutral-500 uppercase tracking-widest mb-3">
        Peer Comparison <span className="ml-1 text-xs bg-brand-900 text-brand-400 px-1.5 py-0.5 rounded">Finnhub</span>
      </div>

      {loading && (
        <div className="space-y-2 animate-pulse">
          {[...Array(4)].map((_, i) => <div key={i} className="h-8 rounded bg-neutral-800" />)}
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {!loading && rows != null && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-neutral-500 border-b border-neutral-800">
                <th className="text-left py-1.5 pr-3 font-normal">Company</th>
                {COLS.map(c => <th key={c.key} className="text-right py-1.5 px-2 font-normal">{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr className="bg-neutral-800/50 border-b border-neutral-800">
                <td className="py-2 pr-3 font-medium text-white">{ticker}</td>
                {COLS.map(c => (
                  <td key={c.key} className="py-2 px-2 text-right font-mono text-white">
                    {c.fmt(current[c.key])}
                  </td>
                ))}
              </tr>
              {rows.map(peer => (
                <tr key={peer.ticker} className="border-b border-neutral-800/50 hover:bg-neutral-900">
                  <td className="py-2 pr-3">
                    <span className="text-neutral-300 font-medium mr-1.5">{peer.ticker}</span>
                    <span className="text-neutral-600 text-xs">{peer.name}</span>
                  </td>
                  {COLS.map(c => (
                    <td key={c.key} className={`py-2 px-2 text-right font-mono ${cellStyle(current[c.key], peer[c.key], c.higherIsBetter)}`}>
                      {c.fmt(peer[c.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="text-sm text-neutral-500 mt-2">No peer data available for {ticker}.</p>
          )}
        </div>
      )}
    </div>
  )
}
