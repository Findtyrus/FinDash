import { useState, useRef } from 'react'
import Sidebar from './components/Sidebar'
import PriceChart from './components/PriceChart'
import ValuationPanel from './components/ValuationPanel'
import FinancialsPanel from './components/FinancialsPanel'
import NewsPanel from './components/NewsPanel'
import { useTickerData } from './hooks/useTickerData'
import { fmt, fmtB, fmtVol } from './lib/api'

const QUICK_PICKS = ['AAPL', 'TSLA', 'MSFT', 'NVDA', 'AMZN', 'META', 'GOOG', 'BRK-B']

export default function App() {
  const [inputVal, setInputVal] = useState('')
  const { loading, error, data, ticker, load } = useTickerData()
  const inputRef = useRef(null)

  const handleLoad = (sym) => {
    const t = sym || inputVal
    load(t)
    if (sym) setInputVal(sym)
  }

  const q   = data?.quote
  const chg = q ? q.regularMarketPrice - q.chartPreviousClose : 0
  const pct = q && q.chartPreviousClose ? (chg / q.chartPreviousClose * 100) : 0
  const pos = pct >= 0

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100 overflow-hidden">
      <Sidebar activeTicker={ticker} onSelect={handleLoad} />

      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="flex items-center gap-3 px-4 py-2.5 border-b border-neutral-800 bg-neutral-950 flex-shrink-0">
          <div className="relative flex-1 max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">⌕</span>
            <input
              ref={inputRef}
              value={inputVal}
              onChange={e => setInputVal(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleLoad()}
              placeholder="Ticker (AAPL, TSLA...)"
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder-neutral-500 focus:border-brand-400 transition-colors"
            />
          </div>
          <button
            onClick={() => handleLoad()}
            className="text-sm px-3 py-1.5 bg-brand-600 hover:bg-brand-400 text-white rounded-lg transition-colors"
          >
            Load
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 space-y-4">
          {!ticker && !loading && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <div className="text-4xl text-neutral-700">⬡</div>
              <div className="text-lg font-medium text-neutral-300">Enter a ticker to get started</div>
              <div className="text-sm text-neutral-500 max-w-sm">
                Live prices via Yahoo Finance. Financials, valuation multiples, and news powered by FMP.
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {QUICK_PICKS.map(t => (
                  <button
                    key={t}
                    onClick={() => handleLoad(t)}
                    className="text-sm px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-neutral-300 transition-colors"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-neutral-400 text-sm animate-pulse">Loading {ticker}...</div>
            </div>
          )}

          {error && !loading && (
            <div className="card border-red-900 bg-red-950/30">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {data && !loading && (
            <>
              <div className="card">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <div className="text-xs text-neutral-500 mb-1">
                      {data.fmp?.profile?.sector}
                      {data.fmp?.profile?.sector && data.fmp?.profile?.industry ? ' · ' : ''}
                      {data.fmp?.profile?.industry}
                    </div>
                    <div className="text-xl font-medium text-white">
                      {data.fmp?.profile?.companyName || ticker}{' '}
                      <span className="text-sm text-neutral-400 font-normal">({ticker})</span>
                    </div>
                    <div className="flex items-baseline gap-3 mt-2">
                      <span className="text-3xl font-medium font-mono">${fmt(q?.regularMarketPrice)}</span>
                      <span className={pos ? 'pill-pos' : 'pill-neg'}>
                        {pos ? '+' : ''}{fmt(chg)} ({pos ? '+' : ''}{fmt(pct)}%)
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-neutral-500">Market cap</div>
                    <div className="text-base font-medium font-mono">
                      {data.fmp?.profile?.marketCap ? fmtB(data.fmp.profile.marketCap) : '—'}
                    </div>
                    <div className="text-xs text-neutral-500 mt-2">52W range</div>
                    <div className="text-sm font-mono">
                      ${fmt(q?.fiftyTwoWeekLow)} – ${fmt(q?.fiftyTwoWeekHigh)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {[
                  ['Open',     `$${fmt(q?.regularMarketOpen)}`],
                  ['Volume',   fmtVol(q?.regularMarketVolume)],
                  ['Avg vol',  fmtVol(q?.averageDailyVolume3Month)],
                  ['Exchange', q?.exchangeName || '—'],
                ].map(([label, val]) => (
                  <div key={label} className="metric-card">
                    <div className="text-xs text-neutral-500 mb-1">{label}</div>
                    <div className="text-sm font-medium font-mono text-white">{val}</div>
                  </div>
                ))}
              </div>

              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-neutral-500 uppercase tracking-widest">
                    Price · 1 year <span className="ml-1 text-xs bg-green-950 text-green-500 px-1.5 py-0.5 rounded">Yahoo Finance</span>
                  </div>
                </div>
                <PriceChart history={data.history} />
              </div>

              <ValuationPanel ratios={data.fmp?.ratios} hasFmp={!!data.fmp} />
              <FinancialsPanel income={data.fmp?.income} balance={data.fmp?.balance} hasFmp={!!data.fmp} />
              <NewsPanel news={data.fmp?.news} hasFmp={!!data.fmp} />
            </>
          )}
        </main>
      </div>
    </div>
  )
}