// Yahoo Finance via public CORS-friendly endpoint
export async function fetchYFQuote(ticker) {
  const res = await fetch(`/yf/v8/finance/chart/${ticker}?interval=1d&range=1d`)
  if (!res.ok) throw new Error('YF quote failed')
  const data = await res.json()
  return data.chart.result[0].meta
}

export async function fetchYFHistory(ticker, range = '1y') {
  const res = await fetch(`/yf/v8/finance/chart/${ticker}?interval=1d&range=${range}`)
  if (!res.ok) throw new Error('YF history failed')
  const data = await res.json()
  const result = data.chart.result[0]
  return {
    timestamps: result.timestamp,
    closes: result.indicators.quote[0].close,
  }
}

export async function fetchFMPAll(ticker, apiKey) {
  const key = apiKey || import.meta.env.VITE_FMP_KEY
  if (!key) return null

  const base = 'https://financialmodelingprep.com/stable'

  const [profile, ratios, keyMetrics, income, balance, news] = await Promise.allSettled([
    fetch(`${base}/profile?symbol=${ticker}&apikey=${key}`).then(r => r.json()),
    fetch(`${base}/ratios-ttm?symbol=${ticker}&apikey=${key}`).then(r => r.json()),
    fetch(`${base}/key-metrics-ttm?symbol=${ticker}&apikey=${key}`).then(r => r.json()),
    fetch(`${base}/income-statement?symbol=${ticker}&limit=4&apikey=${key}`).then(r => r.json()),
    fetch(`${base}/balance-sheet-statement?symbol=${ticker}&limit=1&apikey=${key}`).then(r => r.json()),
    fetch(`${base}/news/stock?symbols=${ticker}&limit=8&apikey=${key}`).then(r => r.json()),
  ])

  const ratiosVal     = ratios.status     === 'fulfilled' ? ratios.value[0]     : null
  const keyMetricsVal = keyMetrics.status === 'fulfilled' ? keyMetrics.value[0] : null

  return {
    profile: profile.status === 'fulfilled' ? profile.value[0] : null,
    ratios:  ratiosVal || keyMetricsVal ? { ...ratiosVal, ...keyMetricsVal } : null,
    income:  income.status  === 'fulfilled' ? income.value     : null,
    balance: balance.status === 'fulfilled' ? balance.value[0] : null,
    news:    Array.isArray(news.value)      ? news.value       : null,
  }
}

// Formatting helpers
export const fmt    = (n, dec = 2) => n != null && !isNaN(n) ? Number(n).toFixed(dec) : '—'
export const fmtB   = n => {
  if (n == null || isNaN(n)) return '—'
  const b = n / 1e9
  return Math.abs(b) >= 1 ? `$${b.toFixed(1)}B` : `$${(n / 1e6).toFixed(0)}M`
}
export const fmtPct = n => n != null && !isNaN(n) ? `${(n * 100).toFixed(1)}%` : '—'
export const fmtX   = n => n != null && !isNaN(n) ? `${Number(n).toFixed(1)}x`  : '—'
export const fmtVol = n => {
  if (n == null || isNaN(n)) return '—'
  return n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : `${(n / 1e3).toFixed(0)}K`
}