const BASE_URL = 'https://api.deepseek.com/v1'
const TIMEOUT_MS = 30000 // 30 second timeout

export async function chat(messages, apiKey, { temperature = 0.7, maxTokens = 1024 } = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false,
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message || `API error: ${res.status}`)
    }

    const data = await res.json()
    return data.choices[0].message.content
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new Error('请求超时，请检查网络后重试')
    }
    throw e
  } finally {
    clearTimeout(timeout)
  }
}

export async function chatWithSystem(systemPrompt, userMessage, apiKey, opts = {}) {
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ]
  return chat(messages, apiKey, opts)
}
