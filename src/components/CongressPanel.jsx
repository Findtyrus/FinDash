import { useState, useEffect } from 'react'
import { fetchCongressTrades } from '../lib/api'

export default function CongressPanel({ ticker }) {
  const [trades, setTrades] = useState(null)
  const [loading, setLoading] = useState(false)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    if (!ticker || !import.meta.env.VITE_FMP_KEY) return
    setTrades(null)
    setUnavailable(false)
    setLoading(true)

    fetchCongressTrades(ticker)
      .then(data => {
        if (!data) setUnavailable(true)
        else setTrades(data)
      })
      .catch(() => setUnavailable(true))
      .finally(() => setLoading(false))
  }, [ticker])

  if (!import.meta.env.VITE_FMP_KEY) return null

  const purchases = trades?.filter(t => t.type?.toLowerCase().includes('purchase')).length || 0
  const sales     = trades?.filter(t => !t.type?.toLowerCase().includes('purchase')).length || 0

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <div className="text-xs text-neutral-500 uppercase tracking-widest">🏛️ Congress Trades</div>
        {trades && trades.length > 0 && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            purchases >= sales ? 'bg-green-950 text-green-400' : 'bg-amber-950 text-amber-400'
          }`}>
            {purchases >= sales ? 'Insiders buying' : 'Insiders selling'}
          </span>
        )}
      </div>

      {loading && (
        <div className="space-y-2 animate-pulse">
          {[...Array(4)].map((_, i) => <div key={i} className="h-8 rounded bg-neutral-800" />)}
        </div>
      )}

      {!loading && (unavailable || trades === null) && !loading && (
        <p className="text-sm text-neutral-500">No congressional trading data available for {ticker}.</p>
      )}

      {trades && trades.length > 0 && (
        <>
          <p className="text-xs text-neutral-500 mb-3">
            {trades.length} congressional trades — {purchases} purchases, {sales} sales
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-neutral-500 border-b border-neutral-800">
                  <th className="text-left py-1.5 pr-3 font-normal">Name</th>
                  <th className="text-left py-1.5 px-2 font-normal">Chamber</th>
                  <th className="text-left py-1.5 px-2 font-normal">Type</th>
                  <th className="text-left py-1.5 px-2 font-normal">Amount</th>
                  <th className="text-right py-1.5 pl-2 font-normal">Date</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((t, i) => {
                  const isPurchase = t.type?.toLowerCase().includes('purchase')
                  const isSenator  = t.office?.toLowerCase().includes('senator')
                  const chamber    = isSenator ? 'Senate' : 'House'
                  const name       = [t.firstName, t.lastName].filter(Boolean).join(' ') || t.representative || t.name || '—'
                  return (
                    <tr key={i} className="border-b border-neutral-800/50">
                      <td className="py-2 pr-3 text-neutral-300">{name}</td>
                      <td className="py-2 px-2 text-neutral-500">{chamber}</td>
                      <td className={`py-2 px-2 font-medium ${isPurchase ? 'text-green-500' : 'text-red-400'}`}>
                        {isPurchase ? 'Purchase' : 'Sale'}
                      </td>
                      <td className="py-2 px-2 text-neutral-400">{t.amount || '—'}</td>
                      <td className="py-2 pl-2 text-right text-neutral-500">{t.transactionDate || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
