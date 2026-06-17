export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { chatId, botToken } = req.body || {}
  if (!chatId || !botToken) {
    return res.status(400).json({ error: 'Missing chatId or botToken' })
  }

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: '✅ FinDash alerts connected!' }),
    })
    const tgData = await tgRes.json()
    if (!tgData.ok) {
      return res.status(400).json({ error: tgData.description || 'Telegram rejected the request' })
    }
    res.json({ ok: true })
  } catch (e) {
    res.status(502).json({ error: e.message })
  }
}
