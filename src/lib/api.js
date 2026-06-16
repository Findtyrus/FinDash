// Yahoo Finance via public CORS-friendly endpoint
export async function fetchYFQuote(ticker) {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d&corsDomain=finance.yahoo.com`
  )
  if (!res.ok) throw new Error('YF quote failed')
  const data = await res.json()
  const meta = data.chart.result[0].meta
  return meta
}

export async function fetchYFHistory(ticker, range = '1y') {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=${range}&corsDomain=finance.yahoo.com`
  )
  if (!res.ok) throw new Error('YF history failed')
  const data = await res.json()
  const result = data.chart.result[0]
  return {
    timestamps: result.timestamp,
    closes: result.indicators.quote[0].close,
  }
}

// FMP (Financial Modeling Prep) — free tier key required
// Get yours free at https://financialmodelingprep.com/developer/docs/
export async function fetchFMPAll(ticker, apiKey) {
  if (!apiKey) return null
  const base = `https://financialmodelingprep.com/api/v3`

  const [profile, ratios, income, balance, news] = await Promise.allSettled([
    fetch(`${base}/profile/${ticker}?apikey=${apiKey}`).then(r => r.json()),
    fetch(`${base}/ratios-ttm/${ticker}?apikey=${apiKey}`).then(r => r.json()),
    fetch(`${base}/income-statement/${ticker}?limit=4&apikey=${apiKey}`).then(r => r.json()),
    fetch(`${base}/balance-sheet-statement/${ticker}?limit=1&apikey=${apiKey}`).then(r => r.json()),
    fetch(`${base}/stock_news?tickers=${ticker}&limit=8&apikey=${apiKey}`).then(r => r.json()),
  ])

  return {
    profile: profile.status === 'fulfilled' ? profile.value[0] : null,
    ratios:  ratios.status  === 'fulfilled' ? ratios.value[0]  : null,
    income:  income.status  === 'fulfilled' ? income.value     : null,
    balance: balance.status === 'fulfilled' ? balance.value[0] : null,
    news:    news.status    === 'fulfilled' ? news.value       : null,
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
