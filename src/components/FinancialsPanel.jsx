import { fmtB, fmtPct, fmtX, fmt } from '../lib/api'

export default function FinancialsPanel({ metrics, hasFmp }) {
  if (!hasFmp) {
    return (
      <div className="card">
        <div className="text-xs text-neutral-500 uppercase tracking-widest mb-3">Financials</div>
        <p className="text-sm text-neutral-400">Add your Finnhub key to see key metrics.</p>
      </div>
    )
  }

  const pct = v => fmtPct(v != null ? v / 100 : null)

  const rows = [
    ['Revenue/share (TTM)', `$${fmt(metrics?.['revenuePerShareTTM'])}`],
    ['Gross margin',        pct(metrics?.['grossMarginTTM'])],
    ['Operating margin',    pct(metrics?.['operatingMarginTTM'])],
    ['Net margin',          pct(metrics?.['netProfitMarginTTM'])],
    ['EPS (TTM)',           `$${fmt(metrics?.['epsBasicExclExtraItemsTTM'])}`],
    ['ROE (TTM)',           pct(metrics?.['roeTTM'])],
    ['ROA (TTM)',           pct(metrics?.['roaTTM'])],
    ['Current ratio',       fmtX(metrics?.['currentRatioAnnual'])],
    ['Quick ratio',         fmtX(metrics?.['quickRatioAnnual'])],
    ['Debt/equity',         fmtX(metrics?.['totalDebt/totalEquityAnnual'])],
    ['Book value/share',    `$${fmt(metrics?.['bookValuePerShareAnnual'])}`],
    ['Cash/share',          `$${fmt(metrics?.['cashPerSharePerShareAnnual'])}`],
  ]

  return (
    <div className="card">
      <div className="text-xs text-neutral-500 uppercase tracking-widest mb-3">
        Key Metrics <span className="ml-1 text-xs bg-brand-900 text-brand-400 px-1.5 py-0.5 rounded">Finnhub</span>
      </div>

      {rows.map(([label, val]) => (
        <div key={label} className="fin-row">
          <span className="text-neutral-400">{label}</span>
          <span className="font-mono font-medium text-white">{val}</span>
        </div>
      ))}
    </div>
  )
}
