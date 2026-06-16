# FinDash

A KoyFin-style financial dashboard built with React + Vite + Tailwind CSS.

## Data sources

- **Yahoo Finance** (no key needed) — live prices, 52W range, volume, 1-year price history
- **Financial Modeling Prep** (free key) — valuation multiples, income statement, balance sheet, news
  - Get a free key at https://financialmodelingprep.com/developer/docs/

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev

# 3. Open http://localhost:5173
```

## Features

- Watchlist with live price updates (refreshes every 60s)
- Search any ticker — prices load instantly via Yahoo Finance
- 1-year price chart with Chart.js
- Valuation multiples: P/E, EV/EBITDA, P/S, P/B, ROE, Net Margin
- Income statement + balance sheet (tabbed)
- Recent news feed
- FMP key is persisted to localStorage

## Project structure

```
src/
  components/
    Sidebar.jsx        # Watchlist + recent tickers
    PriceChart.jsx     # Chart.js 1-year line chart
    ValuationPanel.jsx # P/E, EV/EBITDA, multiples grid
    FinancialsPanel.jsx # Income stmt + balance sheet tabs
    NewsPanel.jsx      # FMP news feed
  hooks/
    useTickerData.js   # Data fetching hook
  lib/
    api.js             # Yahoo Finance + FMP fetchers + formatters
  App.jsx              # Main layout + top bar
  main.jsx             # Entry point
  index.css            # Tailwind + component classes
```
