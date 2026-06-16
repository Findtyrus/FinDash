import { fmtX, fmtPct } from '../lib/api'

const MULTIPLES = [
  ['P/E (TTM)',   m => fmtX(m?.['peBasicExclExtraTTM']),               'Price / Earnings'],
  ['EV/EBITDA',  m => fmtX(m?.['evEbitdaTTM']),                       'Enterprise value'],
  ['P/S (TTM)',   m => fmtX(m?.['psTTM']),                             'Price / Sales'],
  ['P/B (TTM)',   m => fmtX(m?.['pbAnnual']),                          'Price / Book'],
  ['EV/Revenue', m => fmtX(m?.['evRevenueTTM']),                      'EV / Revenue'],
  ['D/E Ratio',  m => fmtX(m?.['totalDebt/totalEquityAnnual']),       'Debt / Equity'],
  ['ROE (TTM)',   m => fmtPct(m?.['roeTTM'] != null ? m['roeTTM'] / 100 : null),             'Return on equity'],
  ['Net Margin', m => fmtPct(m?.['netProfitMarginTTM'] != null ? m['netProfitMarginTTM'] / 100 : null), 'Net profit margin'],
]

export default function ValuationPanel({ metrics, hasFmp }) {
  if (!hasFmp) {
    return (
      <div className="card">
        <div className="text-xs text-neutral-500 uppercase tracking-widest mb-3">Valuation multiples</div>
        <p className="text-sm text-neutral-400">
          Add your free{' '}
          <a href="https://finnhub.io/register" target="_blank" rel="noreferrer" className="text-brand-400 hover:underline">
            Finnhub API key
          </a>{' '}
          in the top bar to see valuation multiples.
        </p>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="text-xs text-neutral-500 uppercase tracking-widest mb-3">
        Valuation multiples <span className="ml-1 text-xs bg-brand-900 text-brand-400 px-1.5 py-0.5 rounded">Finnhub</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {MULTIPLES.map(([label, valFn, sub]) => (
          <div key={label} className="metric-card">
            <div className="text-xs text-neutral-500 mb-1">{label}</div>
            <div className="text-base font-medium font-mono text-white">{valFn(metrics)}</div>
            <div className="text-xs text-neutral-600 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
