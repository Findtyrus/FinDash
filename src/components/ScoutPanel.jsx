import { useState, useEffect, useRef } from 'react'
import { fmt } from '../lib/api'

function scoreTicker({ quote, metrics, profile }) {
  const factors = []

  const pe = metrics?.['peBasicExclExtraTTM']
  const roe = metrics?.['roeTTM'] != null ? metrics['roeTTM'] : null

  // P/E relative to ROE (quality-adjusted) — don't punish a high multiple on a high-quality compounder
  if (pe != null && roe != null) {
    let pts = 0
    if (roe > 20 && pe < 60) pts = 15
    else if (roe > 15 && pe < 40) pts = 10
    else if (pe > 60 && roe < 10) pts = -15
    factors.push({ label: 'P/E vs ROE quality', detail: `P/E ${pe.toFixed(1)}x, ROE ${roe.toFixed(1)}%`, points: pts })
  }

  const margin = metrics?.['netProfitMarginTTM']
  if (margin != null) {
    let pts
    if (margin < 0) pts = -20
    else if (margin < 2) pts = 0
    else if (margin < 5) pts = 5
    else if (margin < 15) pts = 10
    else pts = 20
    factors.push({ label: 'net margin', detail: `${margin.toFixed(1)}%`, points: pts })
  }

  if (roe != null) {
    let pts
    if (roe > 25) pts = 20
    else if (roe >= 15) pts = 15
    else if (roe >= 8) pts = 8
    else if (roe < 5) pts = -15
    else pts = 0
    factors.push({ label: 'ROE', detail: `${roe.toFixed(1)}%`, points: pts })
  }

  const de = metrics?.['totalDebt/totalEquityAnnual']
  if (de != null) {
    let pts
    if (de > 3) pts = -10
    else if (de > 1.5) pts = 0
    else if (de >= 0.5) pts = 8
    else pts = 15
    factors.push({ label: 'debt/equity', detail: `${de.toFixed(2)}x`, points: pts })
  }

  const low = quote?.fiftyTwoWeekLow
  const high = quote?.fiftyTwoWeekHigh
  const price = quote?.regularMarketPrice
  if (low != null && high != null && price != null && high > low) {
    const position = ((price - low) / (high - low)) * 100
    let pts
    if (position <= 30) pts = 10
    else if (position >= 90) pts = -5
    else pts = 5
    factors.push({ label: '52W momentum', detail: `${position.toFixed(0)}% of range`, points: pts })
  }

  const revGrowth = metrics?.['revenueGrowthTTMYoy']
  if (revGrowth != null) {
    const growing = revGrowth > 0
    factors.push({ label: 'revenue growth', detail: growing ? 'growing YoY' : 'flat or declining YoY', points: growing ? 10 : 0 })
  }

  const raw = factors.reduce((sum, f) => sum + f.points, 0)
  const score = Math.max(0, Math.min(100, raw))

  let rating = 'SELL'
  if (score >= 60) rating = 'BUY'
  else if (score >= 38) rating = 'HOLD'

  const sorted = [...factors].sort((a, b) => b.points - a.points)
  const best = sorted[0]
  const worst = sorted[sorted.length - 1]

  let reason = `Not enough data to assess ${profile?.name || 'this stock'} yet.`
  if (best && worst) {
    reason = `The strongest signal is its ${best.label} (${best.detail}), which supports the case. ` +
      (worst.points < 0
        ? `The main drag is its ${worst.label} (${worst.detail}).`
        : `No major red flags stood out among the factors checked.`)
  }

  return { score, rating, reason, factors }
}

const RATING_STYLES = {
  BUY:  'bg-green-950 text-green-400 border border-green-800',
  HOLD: 'bg-amber-950 text-amber-400 border border-amber-800',
  SELL: 'bg-red-950 text-red-400 border border-red-800',
}

async function callScout(messages) {
  const res = await fetch('/api/scout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: 'You are a sharp, concise equity analyst. You write like a Bloomberg brief — direct, specific, no filler. Never use phrases like "it is worth noting" or "in conclusion".',
      messages,
    }),
  })
  if (!res.headers.get('content-type')?.includes('json')) {
    throw new Error('Scout AI is unavailable here (requires a Vercel deployment with ANTHROPIC_API_KEY set).')
  }
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || data?.error || 'Scout request failed')
  return data.content[0].text
}

function buildDataBlock({ quote, metrics, profile }) {
  const chg = quote ? quote.regularMarketPrice - quote.chartPreviousClose : null
  const pct = quote?.chartPreviousClose ? (chg / quote.chartPreviousClose * 100) : null
  const low = quote?.fiftyTwoWeekLow
  const high = quote?.fiftyTwoWeekHigh
  const position = (low != null && high != null && quote?.regularMarketPrice != null && high > low)
    ? (((quote.regularMarketPrice - low) / (high - low)) * 100).toFixed(0)
    : '—'

  return `Price: $${fmt(quote?.regularMarketPrice)}, Change: ${pct != null ? pct.toFixed(2) : '—'}% today
P/E: ${metrics?.['peBasicExclExtraTTM'] != null ? metrics['peBasicExclExtraTTM'].toFixed(1) : '—'}x, EV/EBITDA: ${metrics?.['evEbitdaTTM'] != null ? metrics['evEbitdaTTM'].toFixed(1) : '—'}x, Net Margin: ${metrics?.['netProfitMarginTTM'] != null ? metrics['netProfitMarginTTM'].toFixed(1) : '—'}%, ROE: ${metrics?.['roeTTM'] != null ? metrics['roeTTM'].toFixed(1) : '—'}%
Revenue/share: $${fmt(metrics?.['revenuePerShareTTM'])}
52W: $${fmt(low)} – $${fmt(high)}, currently at ${position}% of range
Sector: ${profile?.finnhubIndustry || '—'}`
}

export default function ScoutPanel({ ticker, quote, metrics, profile, recommendation }) {
  const [brief, setBrief] = useState(null)
  const [questions, setQuestions] = useState([])
  const [briefLoading, setBriefLoading] = useState(false)
  const [briefError, setBriefError] = useState(null)
  const [answers, setAnswers] = useState({})
  const [answerLoading, setAnswerLoading] = useState(null)
  const [descExpanded, setDescExpanded] = useState(false)
  const reqRef = useRef(0)

  const hasFmpData = metrics != null || profile != null
  const { score, rating, reason } = hasFmpData
    ? scoreTicker({ quote, metrics, profile })
    : { score: null, rating: null, reason: null }

  useEffect(() => {
    if (!ticker || !quote) return
    const myReq = ++reqRef.current
    setBrief(null)
    setQuestions([])
    setAnswers({})
    setBriefError(null)
    setBriefLoading(true)

    const dataBlock = buildDataBlock({ quote, metrics, profile })
    callScout([{
      role: 'user',
      content: `Write a 3-sentence stock brief for ${ticker}. Cover: (1) what is driving price action right now, (2) the key fundamental strength or weakness, (3) the main risk. Then on a new line, write exactly 4 follow-up questions an investor would want answered, each on its own line starting with "Q: ".

Data:
${dataBlock}`,
    }])
      .then(text => {
        if (reqRef.current !== myReq) return
        const lines = text.split('\n').filter(Boolean)
        const qLines = lines.filter(l => l.trim().startsWith('Q:'))
        const briefLines = lines.filter(l => !l.trim().startsWith('Q:'))
        setBrief(briefLines.join(' ').trim())
        setQuestions(qLines.map(l => l.replace(/^Q:\s*/, '').trim()))
      })
      .catch(e => { if (reqRef.current === myReq) setBriefError(e.message) })
      .finally(() => { if (reqRef.current === myReq) setBriefLoading(false) })
  }, [ticker])

  const askFollowUp = (question) => {
    if (answers[question]) {
      setAnswers(prev => ({ ...prev, [question]: { ...prev[question], open: !prev[question].open } }))
      return
    }
    setAnswerLoading(question)
    const dataBlock = buildDataBlock({ quote, metrics, profile })
    callScout([{
      role: 'user',
      content: `Given this data for ${ticker}:\n${dataBlock}\n\nAnswer this investor question in 2-3 sentences: ${question}`,
    }])
      .then(text => setAnswers(prev => ({ ...prev, [question]: { text, open: true } })))
      .catch(e => setAnswers(prev => ({ ...prev, [question]: { text: `Couldn't get an answer: ${e.message}`, open: true } })))
      .finally(() => setAnswerLoading(null))
  }

  const recTotal = recommendation
    ? recommendation.strongBuy + recommendation.buy + recommendation.hold + recommendation.sell + recommendation.strongSell
    : 0

  return (
    <div className="card border-l-2 border-brand-400">
      <div className="text-xs text-neutral-500 uppercase tracking-widest mb-3">
        Scout AI <span className="ml-1 text-xs bg-brand-900 text-brand-400 px-1.5 py-0.5 rounded">Claude</span>
      </div>

      {/* Section A — rating */}
      {hasFmpData ? (
        <>
          <div className="flex items-center gap-4 mb-4">
            <span className={`px-3 py-1.5 rounded-lg text-lg font-bold tracking-wide ${RATING_STYLES[rating]}`}>
              {rating}
            </span>
            <div>
              <div className="text-sm font-mono text-white">{score}/100</div>
              <div className="text-xs text-neutral-500">composite score</div>
            </div>
          </div>
          <p className="text-sm text-neutral-300 mb-4">{reason}</p>
        </>
      ) : (
        <p className="text-sm text-neutral-500 mb-4">
          Fundamental data unavailable for this ticker on the current data plan.
        </p>
      )}

      {recTotal > 0 && (
        <div className="mb-4">
          <div className="text-xs text-neutral-500 mb-1.5">
            {recTotal} analysts: {recommendation.strongBuy + recommendation.buy} buy, {recommendation.hold} hold, {recommendation.sell + recommendation.strongSell} sell
          </div>
          <div className="flex h-1.5 rounded-full overflow-hidden bg-neutral-800">
            <div className="bg-green-600" style={{ width: `${(recommendation.strongBuy + recommendation.buy) / recTotal * 100}%` }} />
            <div className="bg-amber-500" style={{ width: `${recommendation.hold / recTotal * 100}%` }} />
            <div className="bg-red-600" style={{ width: `${(recommendation.sell + recommendation.strongSell) / recTotal * 100}%` }} />
          </div>
        </div>
      )}

      {/* Section B — AI brief */}
      <div className="border-l-2 border-brand-400 pl-3 mb-3">
        {briefLoading && <p className="text-sm text-neutral-500 animate-pulse">Scout is thinking...</p>}
        {briefError && <p className="text-sm text-red-400">{briefError}</p>}
        {brief && <p className="text-sm text-neutral-200 leading-relaxed">{brief}</p>}
      </div>

      {questions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {questions.map(q => (
            <button
              key={q}
              onClick={() => askFollowUp(q)}
              disabled={answerLoading === q}
              className="text-xs px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-full text-neutral-300 transition-colors disabled:opacity-50"
            >
              {answerLoading === q ? 'Asking...' : q}
            </button>
          ))}
        </div>
      )}

      {Object.entries(answers).filter(([, a]) => a.open).map(([q, a]) => (
        <div key={q} className="text-sm bg-neutral-900 border border-neutral-800 rounded-lg p-3 mb-2">
          <div className="text-xs text-neutral-500 mb-1">{q}</div>
          <div className="text-neutral-200">{a.text}</div>
        </div>
      ))}

      {/* Section C — description */}
      {profile?.description && (
        <div className="mt-4 pt-4 border-t border-neutral-800">
          <p className={`text-sm text-neutral-400 ${descExpanded ? '' : 'line-clamp-3'}`}>
            {profile.description}
          </p>
          <button
            onClick={() => setDescExpanded(v => !v)}
            className="text-xs text-brand-400 hover:underline mt-1"
          >
            {descExpanded ? 'Show less' : 'Read more'}
          </button>
        </div>
      )}
    </div>
  )
}
