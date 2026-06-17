import { useState, useEffect } from 'react'
import { fetchFinnhubEarningsHistory } from '../lib/api'

export default function EarningsPanel({ ticker }) {
  const [earnings, setEarnings] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!ticker || !import.meta.env.VITE_FINNHUB_KEY) return
    setEarnings(null)
    setLoading(true)

    fetchFinnhubEarningsHistory(ticker)
      .then(data => setEarnings(data || []))
      .catch(() => setEarnings([]))
      .finally(() => setLoading(false))
  }, [ticker])

  if (!import.meta.env.VITE_FINNHUB_KEY) return null

  const total = earnings?.length || 0
  const beats = earnings ? earnings.filter(e => e.actual != null && e.estimate != null && e.actual > e.estimate).length : 0
  const streakColor = total === 0 ? '' : beats >= total * 0.7 ? 'text-green-500' : beats <= total * 0.3 ? 'text-red-400' : 'text-amber-400'
  const streakLabel = total > 0
    ? beats >= total * 0.5
      ? `Beat ${beats} of last ${total} quarters`
      : `Missed ${total - beats} of last ${total} quarters`
    : null

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-neutral-500 uppercase tracking-widest">
          Earnings History <span className="ml-1 text-xs bg-brand-900 text-brand-400 px-1.5 py-0.5 rounded">Finnhub</span>
        </div>
        {streakLabel && <span className={`text-xs font-medium ${streakColor}`}>{streakLabel}</span>}
      </div>

      {loading && (
        <div className="space-y-2 animate-pulse">
          {[...Array(4)].map((_, i) => <div key={i} className="h-8 rounded bg-neutral-800" />)}
        </div>
      )}

      {!loading && earnings != null && earnings.length === 0 && (
        <p className="text-sm text-neutral-500">No earnings history available for {ticker}.</p>
      )}

      {!loading && earnings && earnings.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-neutral-500 border-b border-neutral-800">
                <th className="text-left py-1.5 pr-3 font-normal">Period</th>
                <th className="text-right py-1.5 px-2 font-normal">Est. EPS</th>
                <th className="text-right py-1.5 px-2 font-normal">Actual EPS</th>
                <th className="text-right py-1.5 pl-2 font-normal">Surprise</th>
              </tr>
            </thead>
            <tbody>
              {earnings.map((e, i) => {
                const surprise = e.actual != null && e.estimate != null && e.estimate !== 0
                  ? ((e.actual - e.estimate) / Math.abs(e.estimate)) * 100
                  : null
                const beat = surprise != null && surprise > 0
                return (
                  <tr key={i} className="border-b border-neutral-800/50">
                    <td className="py-2 pr-3 text-neutral-400">{e.period || '—'}</td>
                    <td className="py-2 px-2 text-right font-mono text-neutral-400">
                      {e.estimate != null ? `$${e.estimate.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-white">
                      {e.actual != null ? `$${e.actual.toFixed(2)}` : '—'}
                    </td>
                    <td className={`py-2 pl-2 text-right font-mono font-medium ${surprise == null ? 'text-neutral-400' : beat ? 'text-green-500' : 'text-red-400'}`}>
                      {surprise != null ? `${beat ? '+' : ''}${surprise.toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
