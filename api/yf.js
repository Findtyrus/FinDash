export default async function handler(req, res) {
  const { path = '', ...query } = req.query
  const qs = new URLSearchParams(query).toString()
  const url = `https://query2.finance.yahoo.com/${path}${qs ? `?${qs}` : ''}`

  try {
    const upstream = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      },
    })
    const body = await upstream.text()
    res.status(upstream.status)
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json')
    res.send(body)
  } catch {
    res.status(502).json({ error: 'Yahoo Finance proxy failed' })
  }
}
