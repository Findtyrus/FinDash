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

function normalizeFMPTicker(ticker) {
  const map = { 'GOOG': 'GOOGL', 'BRK-B': 'BRK.B', 'BRK-A': 'BRK.A' }
  return map[ticker] || ticker
}

export async function fetchFMPAll(ticker, apiKey) {
  const key = apiKey || import.meta.env.VITE_FMP_KEY
  if (!key) return null

  const base = 'https://financialmodelingprep.com/stable'
  const symbol = normalizeFMPTicker(ticker)

  const [profile, ratios, keyMetrics, income, balance, news] = await Promise.allSettled([
    fetch(`${base}/profile?symbol=${symbol}&apikey=${key}`).then(r => r.json()),
    fetch(`${base}/ratios-ttm?symbol=${symbol}&apikey=${key}`).then(r => r.json()),
    fetch(`${base}/key-metrics-ttm?symbol=${symbol}&apikey=${key}`).then(r => r.json()),
    fetch(`${base}/income-statement?symbol=${symbol}&limit=4&apikey=${key}`).then(r => r.json()),
    fetch(`${base}/balance-sheet-statement?symbol=${symbol}&limit=1&apikey=${key}`).then(r => r.json()),
    fetch(`${base}/news/stock?symbols=${symbol}&limit=8&apikey=${key}`).then(r => r.json()),
  ])

  const ratiosVal     = ratios.status     === 'fulfilled' && Array.isArray(ratios.value)     ? ratios.value[0]     : null
  const keyMetricsVal = keyMetrics.status === 'fulfilled' && Array.isArray(keyMetrics.value) ? keyMetrics.value[0] : null

  return {
    profile: profile.status === 'fulfilled' && Array.isArray(profile.value) ? profile.value[0] : null,
    ratios:  ratiosVal || keyMetricsVal ? { ...ratiosVal, ...keyMetricsVal } : null,
    income:  income.status  === 'fulfilled' && Array.isArray(income.value)  ? income.value     : null,
    balance: balance.status === 'fulfilled' && Array.isArray(balance.value) ? balance.value[0] : null,
    news:    news.status    === 'fulfilled' && Array.isArray(news.value)    ? news.value       : null,
  }
}

export async function fetchFMPEarnings(ticker, apiKey) {
  const key = apiKey || import.meta.env.VITE_FMP_KEY
  if (!key) return null
  const res = await fetch(`https://financialmodelingprep.com/stable/earnings?symbol=${ticker}&limit=8&apikey=${key}`)
  const data = await res.json()
  if (!Array.isArray(data)) return null
  const upcoming = data.find(e => new Date(e.date) >= new Date())
  return upcoming?.date || null
}

export async function fetchFMPAnalystTarget(ticker, apiKey) {
  const key = apiKey || import.meta.env.VITE_FMP_KEY
  if (!key) return null
  const res = await fetch(`https://financialmodelingprep.com/stable/price-target-consensus?symbol=${ticker}&apikey=${key}`)
  const data = await res.json()
  return Array.isArray(data) ? data[0] : null
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