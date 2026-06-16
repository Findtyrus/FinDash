import { useState, useCallback, useRef, useEffect } from 'react'
import { fetchYFQuote, fetchYFHistory, fetchFinnhubAll } from '../lib/api'

const POLL_MS = 5000

export function useTickerData() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [data, setData]       = useState(null)
  const [ticker, setTicker]   = useState(null)
  const [isLive, setIsLive]   = useState(false)
  const pollRef = useRef(null)

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    setIsLive(false)
  }, [])

  const load = useCallback(async (sym) => {
    const t = sym.trim().toUpperCase()
    if (!t) return
    stopPolling()
    setLoading(true)
    setError(null)
    setTicker(t)

    try {
      const [quote, history, finnhub] = await Promise.allSettled([
        fetchYFQuote(t),
        fetchYFHistory(t),
        fetchFinnhubAll(t),
      ])
      setData({
        quote:   quote.status   === 'fulfilled' ? quote.value   : null,
        history: history.status === 'fulfilled' ? history.value : null,
        fmp:     finnhub.status === 'fulfilled' ? finnhub.value : null, // keep key as 'fmp' so App.jsx doesn't break
      })

      pollRef.current = setInterval(async () => {
        try {
          const freshQuote = await fetchYFQuote(t)
          setData(prev => prev ? { ...prev, quote: freshQuote } : prev)
        } catch {
          // transient failure — keep showing the last known quote
        }
      }, POLL_MS)
      setIsLive(true)
    } catch (e) {
      setError(`Could not load ${t}. Check the ticker and try again.`)
    } finally {
      setLoading(false)
    }
  }, [stopPolling])

  useEffect(() => stopPolling, [stopPolling])

  return { loading, error, data, ticker, load, isLive }
}
