import { fmtX, fmtPct } from '../lib/api'

const MULTIPLES = [
  ['P/E (TTM)',   r => fmtX(r?.priceToEarningsRatioTTM),   'Price / Earnings'],
  ['EV/EBITDA',  r => fmtX(r?.enterpriseValueMultipleTTM), 'Enterprise value'],
  ['P/S (TTM)',   r => fmtX(r?.priceToSalesRatioTTM),      'Price / Sales'],
  ['P/B (TTM)',   r => fmtX(r?.priceToBookRatioTTM),       'Price / Book'],
  ['EV/Revenue', r => fmtX(r?.evToSalesTTM),              'EV / Revenue'],
  ['D/E Ratio',  r => fmtX(r?.debtToEquityRatioTTM),      'Debt / Equity'],
  ['ROE (TTM)',   r => fmtPct(r?.returnOnEquityTTM),       'Return on equity'],
  ['Net Margin', r => fmtPct(r?.netProfitMarginTTM),      'Net profit margin'],
]

export default function ValuationPanel({ ratios, hasFmp }) {
  if (!hasFmp) {
    return (
      <div className="card">
        <div className="text-xs text-neutral-500 uppercase tracking-widest mb-3">Valuation multiples</div>
        <p className="text-sm text-neutral-400">
          Add your free{' '}
          <a href="https://financialmodelingprep.com/developer/docs/" target="_blank" rel="noreferrer" className="text-brand-400 hover:underline">
            FMP API key
          </a>{' '}
          in the top bar to see valuation multiples.
        </p>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="text-xs text-neutral-500 uppercase tracking-widest mb-3">
        Valuation multiples <span className="ml-1 text-xs bg-brand-900 text-brand-400 px-1.5 py-0.5 rounded">FMP</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {MULTIPLES.map(([label, valFn, sub]) => (
          <div key={label} className="metric-card">
            <div className="text-xs text-neutral-500 mb-1">{label}</div>
            <div className="text-base font-medium font-mono text-white">{valFn(ratios)}</div>
            <div className="text-xs text-neutral-600 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
