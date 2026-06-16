import { useState } from 'react'
import { fmtB, fmtPct, fmt } from '../lib/api'

export default function FinancialsPanel({ income, balance, hasFmp }) {
  const [tab, setTab] = useState('income')

  if (!hasFmp) {
    return (
      <div className="card">
        <div className="text-xs text-neutral-500 uppercase tracking-widest mb-3">Financials</div>
        <p className="text-sm text-neutral-400">Add your FMP key to see income statement & balance sheet.</p>
      </div>
    )
  }

  const inc = income?.[0] ?? null
  const bs  = balance ?? null

  const incomeRows = [
    ['Revenue',          fmtB(inc?.revenue)],
    ['Gross profit',     fmtB(inc?.grossProfit)],
    ['Gross margin',     fmtPct(inc?.grossProfitRatio)],
    ['EBITDA',           fmtB(inc?.ebitda)],
    ['Operating income', fmtB(inc?.operatingIncome)],
    ['Net income',       fmtB(inc?.netIncome)],
    ['EPS (diluted)',    inc?.epsdiluted ? `$${fmt(inc.epsdiluted)}` : '—'],
  ]

  const balanceRows = [
    ['Cash & equivalents',     fmtB(bs?.cashAndCashEquivalents)],
    ['Total current assets',   fmtB(bs?.totalCurrentAssets)],
    ['Total assets',           fmtB(bs?.totalAssets)],
    ['Current liabilities',    fmtB(bs?.totalCurrentLiabilities)],
    ['Long-term debt',         fmtB(bs?.longTermDebt)],
    ['Total liabilities',      fmtB(bs?.totalLiabilities)],
    ['Total equity',           fmtB(bs?.totalStockholdersEquity)],
  ]

  const rows = tab === 'income' ? incomeRows : balanceRows
  const period = tab === 'income' ? inc?.date : bs?.date

  return (
    <div className="card">
      <div className="text-xs text-neutral-500 uppercase tracking-widest mb-3">
        Financials <span className="ml-1 text-xs bg-brand-900 text-brand-400 px-1.5 py-0.5 rounded">FMP</span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-800 mb-3">
        <button className={`tab-btn ${tab === 'income' ? 'active' : ''}`} onClick={() => setTab('income')}>
          Income statement
        </button>
        <button className={`tab-btn ${tab === 'balance' ? 'active' : ''}`} onClick={() => setTab('balance')}>
          Balance sheet
        </button>
      </div>

      {rows.map(([label, val]) => (
        <div key={label} className="fin-row">
          <span className="text-neutral-400">{label}</span>
          <span className="font-mono font-medium text-white">{val}</span>
        </div>
      ))}

      {period && (
        <div className="text-xs text-neutral-600 mt-3">Period: {period}</div>
      )}
    </div>
  )
}
