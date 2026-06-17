import { useState, useEffect, useRef } from 'react'
import { fmt, fmtB, fmtX } from '../lib/api'

const analysisCache = {}

const RATING_STYLES = {
  BUY: 'bg-green-600 text-white',
  HOLD: 'bg-amber-500 text-amber-950',
  SELL: 'bg-red-600 text-white',
}

async function callScout(payload) {
  const res = await fetch('/api/scout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.headers.get('content-type')?.includes('json')) {
    throw new Error('Scout AI is unavailable here (requires a Vercel deployment with ANTHROPIC_API_KEY set).')
  }

  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || data?.error || 'Scout request failed')
  return data.content?.[0]?.text
}

function buildDataBlock({ ticker, quote, metrics, profile, recommendation }) {
  const chg = quote ? quote.regularMarketPrice - quote.chartPreviousClose : null
  const pct = quote?.chartPreviousClose ? (chg / quote.chartPreviousClose * 100) : null
  const changeSign = chg >= 0 ? '+' : ''
  const low = quote?.fiftyTwoWeekLow
  const high = quote?.fiftyTwoWeekHigh
  const position = (low != null && high != null && quote?.regularMarketPrice != null && high > low)
    ? ((quote.regularMarketPrice - low) / (high - low)) * 100
    : null

  const marketCap = profile?.marketCapitalization != null
    ? fmtB(profile.marketCapitalization * 1e6)
    : '—'

  const analystRec = recommendation?.rating || '—'
  const strongBuy = recommendation?.strongBuy ?? 0
  const buy = recommendation?.buy ?? 0
  const hold = recommendation?.hold ?? 0
  const sell = recommendation?.sell ?? 0
  const strongSell = recommendation?.strongSell ?? 0

  return `Stock data:\nTicker: ${ticker}\nCompany: ${profile?.name || '—'}\nSector: ${profile?.finnhubIndustry || '—'}\nPrice: $${fmt(quote?.regularMarketPrice)} (${changeSign}${pct != null ? pct.toFixed(2) : '—'}% today)\n52W range: $${fmt(low)} – $${fmt(high)}, currently at ${position != null ? position.toFixed(0) : '—'}% of range\nMarket cap: ${marketCap}\nP/E (TTM): ${fmtX(metrics?.['peBasicExclExtraTTM'])}\nEV/EBITDA: ${fmtX(metrics?.['evEbitdaTTM'])}\nNet margin: ${metrics?.['netProfitMarginTTM'] != null ? metrics['netProfitMarginTTM'].toFixed(1) : '—'}%\nROE: ${metrics?.['roeTTM'] != null ? metrics['roeTTM'].toFixed(1) : '—'}%\nEPS (TTM): $${fmt(metrics?.['epsTTM'])}\nBeta: ${fmt(metrics?.['beta'], 2)}\nAnalyst consensus: ${analystRec} (${strongBuy} strong buy, ${buy} buy, ${hold} hold, ${sell} sell, ${strongSell} strong sell)\nDividend yield: ${metrics?.['dividendYieldIndicatedAnnual'] != null ? metrics['dividendYieldIndicatedAnnual'].toFixed(2) : '—'}%`
}

export default function ScoutPanel({ ticker, quote, metrics, profile, recommendation, onBenchmarks }) {
  const [runAnalysis, setRunAnalysis] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [questions, setQuestions] = useState([])
  const [benchmarks, setBenchmarks] = useState(null)
  const [briefLoading, setBriefLoading] = useState(false)
  const [briefError, setBriefError] = useState(null)
  const [answers, setAnswers] = useState({})
  const [answerLoading, setAnswerLoading] = useState(null)
  const [descExpanded, setDescExpanded] = useState(false)
  const reqRef = useRef(0)
  const initialQuoteRef = useRef(null)

  const hasFmpData = quote && (metrics != null || profile != null)
  const recTotal = recommendation
    ? recommendation.strongBuy + recommendation.buy + recommendation.hold + recommendation.sell + recommendation.strongSell
    : 0
  const ratingStyle = analysis?.rating ? RATING_STYLES[analysis.rating] : 'bg-neutral-800 text-white'

  // Reset state on ticker change; auto-populate from cache if available
  useEffect(() => {
    setRunAnalysis(false)
    setAnalysis(null)
    setQuestions([])
    setBenchmarks(null)
    setBriefError(null)
    setAnswers({})
    onBenchmarks?.(null)

    if (ticker && analysisCache[ticker]) {
      setAnalysis(analysisCache[ticker].analysis)
      setQuestions(analysisCache[ticker].questions)
      setBenchmarks(analysisCache[ticker].benchmarks)
      onBenchmarks?.(analysisCache[ticker].benchmarks)
    }
  }, [ticker])

  // Fire Claude API only when user clicks the button
  useEffect(() => {
    if (!runAnalysis || !ticker) return
    const hasFmp = quote && (metrics != null || profile != null)
    if (!hasFmp) return

    // Already cached — button shouldn't appear, but guard anyway
    if (analysisCache[ticker]) {
      setAnalysis(analysisCache[ticker].analysis)
      setQuestions(analysisCache[ticker].questions)
      setBenchmarks(analysisCache[ticker].benchmarks)
      onBenchmarks?.(analysisCache[ticker].benchmarks)
      return
    }

    if (!initialQuoteRef.current || initialQuoteRef.current.symbol !== ticker) {
      initialQuoteRef.current = quote
    }

    const myReq = ++reqRef.current
    setBriefLoading(true)
    setBriefError(null)

    const dataBlock = buildDataBlock({ ticker, quote: initialQuoteRef.current, metrics, profile, recommendation })

    callScout({ type: 'analysis', ticker, dataBlock })
      .then(text => {
        if (reqRef.current !== myReq) return
        const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
        const bm = parsed.benchmarks || null
        analysisCache[ticker] = { analysis: parsed, questions: parsed.questions || [], benchmarks: bm }
        setAnalysis(parsed)
        setQuestions(parsed.questions || [])
        setBenchmarks(bm)
        onBenchmarks?.(bm)
      })
      .catch(e => {
        if (reqRef.current === myReq) setBriefError(e.message || 'Analysis unavailable.')
      })
      .finally(() => {
        if (reqRef.current === myReq) setBriefLoading(false)
      })
  }, [runAnalysis])

  const askFollowUp = (question) => {
    if (answers[question]) {
      setAnswers(prev => ({ ...prev, [question]: { ...prev[question], open: !prev[question].open } }))
      return
    }

    setAnswerLoading(question)
    const dataBlock = buildDataBlock({ ticker, quote, metrics, profile, recommendation })

    callScout({ type: 'answer', ticker, dataBlock, question })
      .then(text => setAnswers(prev => ({ ...prev, [question]: { text, open: true } })))
      .catch(e => setAnswers(prev => ({ ...prev, [question]: { text: `Couldn't get an answer: ${e.message}`, open: true } })))
      .finally(() => setAnswerLoading(null))
  }

  return (
    <div className="card border-l-2 border-brand-400">
      <div className="text-xs text-neutral-500 uppercase tracking-widest mb-3">
        Scout AI <span className="ml-1 text-xs bg-brand-900 text-brand-400 px-1.5 py-0.5 rounded">Claude</span>
      </div>

      {!hasFmpData && (
        <p className="text-sm text-neutral-500 mb-4">
          Fundamental data unavailable for this ticker on the current data plan.
        </p>
      )}

      {hasFmpData && !analysis && !briefLoading && (
        <div className="mb-4">
          <button
            onClick={() => setRunAnalysis(true)}
            className="text-sm px-4 py-2 bg-brand-600 hover:bg-brand-400 text-white rounded-lg transition-colors"
          >
            Generate AI Analysis
          </button>
          <div className="text-xs text-neutral-500 mt-1.5">Uses ~$0.02 of AI credits</div>
          {briefError && <p className="text-sm text-red-400 mt-2">{briefError} — <button onClick={() => setRunAnalysis(true)} className="underline">Retry</button></p>}
        </div>
      )}

      {briefLoading && (
        <div className="space-y-3 animate-pulse mb-4">
          <div className="h-5 w-3/5 rounded-lg bg-neutral-800" />
          <div className="h-4 w-full rounded-lg bg-neutral-800" />
          <div className="h-4 w-5/6 rounded-lg bg-neutral-800" />
          <div className="text-sm text-neutral-500">Analyzing {ticker}...</div>
        </div>
      )}

      {analysis && (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className={`px-3 py-1.5 rounded-lg text-lg font-bold tracking-wide ${ratingStyle}`}>
              {analysis.rating}
            </span>
            <span className="text-xs bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full">
              {analysis.confidence}
            </span>
            {analysis.oneLiner && (
              <div className="w-full lg:w-auto">
                <div className="text-lg font-medium text-white">{analysis.oneLiner}</div>
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div>
              <div className="text-xs text-neutral-500 uppercase tracking-widest mb-1">THE BULL CASE</div>
              <div className="text-sm text-neutral-300 leading-relaxed border-l-2 border-green-500/40 pl-3">
                {analysis.bullCase}
              </div>
            </div>

            <div>
              <div className="text-xs text-neutral-500 uppercase tracking-widest mb-1">THE BEAR CASE</div>
              <div className="text-sm text-neutral-300 leading-relaxed border-l-2 border-red-500/40 pl-3">
                {analysis.bearCase}
              </div>
            </div>

            <div>
              <div className="text-xs text-neutral-500 uppercase tracking-widest mb-1">VERDICT</div>
              <div className="text-sm text-neutral-300 leading-relaxed border-l-2 border-brand-400/40 pl-3">
                {analysis.verdict}
              </div>
            </div>
          </div>

          {recTotal > 0 && (
            <>
              <div className="border-t border-neutral-800 my-4" />
              <div className="mb-3">
                <div className="flex h-1.5 rounded-full overflow-hidden bg-neutral-800">
                  <div className="bg-green-600" style={{ width: `${(recommendation.strongBuy + recommendation.buy) / recTotal * 100}%` }} />
                  <div className="bg-amber-500" style={{ width: `${recommendation.hold / recTotal * 100}%` }} />
                  <div className="bg-red-600" style={{ width: `${(recommendation.sell + recommendation.strongSell) / recTotal * 100}%` }} />
                </div>
                <div className="text-xs text-neutral-500 mt-2">
                  {recTotal} analysts: {recommendation.strongBuy + recommendation.buy} buy, {recommendation.hold} hold, {recommendation.sell + recommendation.strongSell} sell
                </div>
              </div>
            </>
          )}

          {questions.length > 0 && (
            <>
              <div className="border-t border-neutral-800 my-4" />
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
            </>
          )}
        </>
      )}

      {Object.entries(answers).filter(([, a]) => a.open).map(([q, a]) => (
        <div key={q} className="text-sm bg-neutral-900 border border-neutral-800 rounded-lg p-3 mb-2">
          <div className="text-xs text-neutral-500 mb-1">{q}</div>
          <div className="text-neutral-200">{a.text}</div>
        </div>
      ))}

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
