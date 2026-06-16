const SYSTEM_PROMPT = `You are a sharp, concise equity analyst. You write like a Bloomberg brief — direct, specific, no filler. Never use phrases like "it is worth noting" or "in conclusion".`

function buildAnalysisMessages(ticker, dataBlock) {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Analyze ${ticker} and return this exact JSON structure:\n{\n  "rating": "BUY" | "HOLD" | "SELL",\n  "confidence": "High" | "Medium" | "Low",\n  "oneLiner": "One punchy sentence summarizing the core thesis (max 15 words)",\n  "bullCase": "2-3 sentences on why this is a great business to own. Be specific to this company — mention their actual moat, product, market position, or tailwind. Reference AI, quantum, specific competitive advantages if relevant.",\n  "bearCase": "2-3 sentences on the real risks. Be specific — mention actual threats, valuation concerns, competition, regulatory risks, macro sensitivity.",\n  "verdict": "2-3 sentences on the bottom line. Should tell the investor what to actually do and over what time horizon. Include a specific reason why now is or isn't a good entry point."\n}\n\nReturn only valid JSON with no markdown or extra commentary.\n\nData:\n${dataBlock}`,
    },
  ]
}

function buildQuestionMessages(ticker) {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Write exactly 4 follow-up questions an investor would want answered after reading about ${ticker}. Each question should be on its own line starting with "Q: ". Do not include any additional text.`,
    },
  ]
}

function buildAnswerMessages(ticker, dataBlock, question) {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Given this data for ${ticker}:\n${dataBlock}\n\nAnswer this investor question in 2-3 sentences: ${question}`,
    },
  ]
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const key = process.env.ANTHROPIC_API_KEY
  if (!key) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })
    return
  }

  const { type, ticker, dataBlock, question } = req.body || {}
  if (!type || !ticker) {
    res.status(400).json({ error: 'Missing required fields: type or ticker' })
    return
  }

  let body = {
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    temperature: 0.2,
    messages: [],
  }

  if (type === 'analysis') {
    if (!dataBlock) {
      res.status(400).json({ error: 'Missing dataBlock for analysis request' })
      return
    }
    body.messages = buildAnalysisMessages(ticker, dataBlock)
  } else if (type === 'questions') {
    body.max_tokens = 200
    body.messages = buildQuestionMessages(ticker)
  } else if (type === 'answer') {
    if (!dataBlock || !question) {
      res.status(400).json({ error: 'Missing dataBlock or question for answer request' })
      return
    }
    body.max_tokens = 200
    body.messages = buildAnswerMessages(ticker, dataBlock, question)
  } else {
    res.status(400).json({ error: `Unknown request type: ${type}` })
    return
  }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    })
    const data = await upstream.json()
    res.status(upstream.status).json(data)
  } catch (error) {
    res.status(502).json({ error: 'Scout AI request failed', details: error.message })
  }
}
