import { useState, useCallback } from 'react'
import { fetchYFQuote, fetchYFHistory, fetchFMPAll } from '../lib/api'

export function useTickerData() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [data, setData]       = useState(null)
  const [ticker, setTicker]   = useState(null)

  const load = useCallback(async (sym, fmpKey) => {
    const t = sym.trim().toUpperCase()
    if (!t) return
    setLoading(true)
    setError(null)
    setTicker(t)

    try {
      const [quote, history, fmp] = await Promise.allSettled([
        fetchYFQuote(t),
        fetchYFHistory(t),
        fetchFMPAll(t, fmpKey),
      ])
      setData({
        quote:   quote.status   === 'fulfilled' ? quote.value   : null,
        history: history.status === 'fulfilled' ? history.value : null,
        fmp:     fmp.status     === 'fulfilled' ? fmp.value     : null,
      })
    } catch (e) {
      setError(`Could not load ${t}. Check the ticker and try again.`)
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, error, data, ticker, load }
}
