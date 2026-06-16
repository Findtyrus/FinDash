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

const FINNHUB_BASE = 'https://finnhub.io/api/v1'

function today() { return new Date().toISOString().split('T')[0] }
function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}
function daysAhead(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

export async function fetchFinnhubAll(ticker) {
  const key = import.meta.env.VITE_FINNHUB_KEY
  if (!key) return null

  const [profile, metrics, financials, news, analystTarget, recommendation, earnings, earningsCalendar] = await Promise.allSettled([
    fetch(`${FINNHUB_BASE}/stock/profile2?symbol=${ticker}&token=${key}`).then(r => r.json()),
    fetch(`${FINNHUB_BASE}/stock/metric?symbol=${ticker}&metric=all&token=${key}`).then(r => r.json()),
    fetch(`${FINNHUB_BASE}/stock/financials-reported?symbol=${ticker}&freq=annual&token=${key}`).then(r => r.json()),
    fetch(`${FINNHUB_BASE}/company-news?symbol=${ticker}&from=${daysAgo(7)}&to=${today()}&token=${key}`).then(r => r.json()),
    fetch(`${FINNHUB_BASE}/stock/price-target?symbol=${ticker}&token=${key}`).then(r => r.json()),
    fetch(`${FINNHUB_BASE}/stock/recommendation?symbol=${ticker}&token=${key}`).then(r => r.json()),
    fetch(`${FINNHUB_BASE}/stock/earnings?symbol=${ticker}&token=${key}`).then(r => r.json()),
    fetch(`${FINNHUB_BASE}/calendar/earnings?symbol=${ticker}&from=${today()}&to=${daysAhead(180)}&token=${key}`).then(r => r.json()),
  ])

  const upcomingEarnings = earningsCalendar.status === 'fulfilled' && Array.isArray(earningsCalendar.value?.earningsCalendar)
    ? earningsCalendar.value.earningsCalendar[0]?.date || null
    : null

  return {
    profile:          profile.status        === 'fulfilled' && profile.value?.name        ? profile.value          : null,
    metrics:          metrics.status        === 'fulfilled' && metrics.value?.metric       ? metrics.value.metric   : null,
    financials:       financials.status     === 'fulfilled' && Array.isArray(financials.value?.data) ? financials.value.data : null,
    news:             news.status           === 'fulfilled' && Array.isArray(news.value)   ? news.value             : null,
    analystTarget:    analystTarget.status  === 'fulfilled' && analystTarget.value?.targetMean ? analystTarget.value : null,
    recommendation:   recommendation.status === 'fulfilled' && Array.isArray(recommendation.value) ? recommendation.value[0] : null,
    earnings:         earnings.status       === 'fulfilled' && Array.isArray(earnings.value) ? earnings.value       : null,
    nextEarningsDate: upcomingEarnings,
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
