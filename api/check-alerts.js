export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { alerts, chatId, botToken } = req.body || {}
  if (!alerts || !Array.isArray(alerts) || !chatId || !botToken) {
    return res.status(400).json({ error: 'Missing required fields: alerts, chatId, botToken' })
  }

  const fired = []

  await Promise.allSettled(
    alerts.map(async ({ ticker, targetPrice, direction }) => {
      try {
        const yfRes = await fetch(
          `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`
        )
        const yfData = await yfRes.json()
        const price = yfData?.chart?.result?.[0]?.meta?.regularMarketPrice
        if (price == null) return

        const triggered = direction === 'above' ? price >= targetPrice : price <= targetPrice
        if (!triggered) return

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `🚨 FinDash Alert\n${ticker} is at $${price.toFixed(2)}\nYour target: ${direction} $${targetPrice}`,
          }),
        })

        fired.push(ticker)
      } catch {
        // silent fail per ticker — don't let one bad ticker block others
      }
    })
  )

  res.json({ fired })
}
