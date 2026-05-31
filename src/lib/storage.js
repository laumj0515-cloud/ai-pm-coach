const KEYS = {
  PROFILE: 'stitch_profile',
  SESSIONS: 'stitch_sessions',
  SETTINGS: 'stitch_settings',
  API_KEY: 'stitch_api_key',
}

// --- Profile (personal context for AI) ---
export function getProfile() {
  try {
    const raw = localStorage.getItem(KEYS.PROFILE)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function saveProfile(profile) {
  localStorage.setItem(KEYS.PROFILE, JSON.stringify(profile))
}

// --- Sessions (interview history) ---
export function getSessions() {
  try {
    const raw = localStorage.getItem(KEYS.SESSIONS)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function saveSession(session) {
  const sessions = getSessions()
  sessions.unshift(session)
  localStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions))
}

export function deleteSession(id) {
  const sessions = getSessions().filter(s => s.id !== id)
  localStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions))
}

// --- API Key ---
export function getApiKey() {
  return localStorage.getItem(KEYS.API_KEY) || ''
}

export function saveApiKey(key) {
  localStorage.setItem(KEYS.API_KEY, key)
}

// --- Settings ---
export function getSettings() {
  try {
    const raw = localStorage.getItem(KEYS.SETTINGS)
    return raw ? JSON.parse(raw) : { voiceEnabled: true, ttsEnabled: false }
  } catch { return { voiceEnabled: true, ttsEnabled: false } }
}

export function saveSettings(settings) {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings))
}

// --- Stats ---
export function getStats() {
  const sessions = getSessions()
  if (sessions.length === 0) return { total: 0, avgScore: 0, weakPoints: [], lastPractice: null }

  const scoredSessions = sessions.filter(s => s.score != null)
  const avgScore = scoredSessions.length > 0
    ? Math.round(scoredSessions.reduce((a, b) => a + b.score, 0) / scoredSessions.length)
    : 0

  const allWeakPoints = scoredSessions.flatMap(s => s.weakPoints || [])
  const weakPointFreq = {}
  allWeakPoints.forEach(w => { weakPointFreq[w] = (weakPointFreq[w] || 0) + 1 })
  const weakPoints = Object.entries(weakPointFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k]) => k)

  return {
    total: sessions.length,
    avgScore,
    weakPoints,
    lastPractice: sessions[0]?.date || null,
  }
}
