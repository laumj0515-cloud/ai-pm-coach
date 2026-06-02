// ── Simple Analytics via countAPI (free, no account needed) ──
// Tracks aggregate page views and interview sessions
// Data is public and can be viewed at the countAPI dashboard

const API_BASE = 'https://api.countapi.xyz'
const NAMESPACE = 'ai-pm-mock'
const SITE_ID = 'ai-pm-mock.netlify.app'

// Track a single event (page view, interview start, etc.)
async function trackEvent(eventName) {
  try {
    const key = `${SITE_ID}_${eventName}`
    const res = await fetch(`${API_BASE}/hit/${NAMESPACE}/${encodeURIComponent(key)}`)
    if (res.ok) {
      const data = await res.json()
      return data.value
    }
  } catch {
    // Silently fail — analytics should never break the app
  }
  return null
}

// Get current count for an event
async function getCount(eventName) {
  try {
    const key = `${SITE_ID}_${eventName}`
    const res = await fetch(`${API_BASE}/get/${NAMESPACE}/${encodeURIComponent(key)}`)
    if (res.ok) {
      const data = await res.json()
      return data.value || 0
    }
  } catch {
    return null
  }
  return null
}

// ── Public API ──

// Called once per page load
export function trackPageView() {
  return trackEvent('pageview')
}

// Called when user starts an interview (selects mode)
export function trackInterviewStart(mode) {
  trackEvent('interview_start')
  trackEvent(`interview_${mode}`)
}

// Called when user completes an interview
export function trackInterviewComplete() {
  trackEvent('interview_complete')
}

// Get all stats for display
export async function getSiteStats() {
  const [visitors, interviews, completed] = await Promise.all([
    getCount('pageview'),
    getCount('interview_start'),
    getCount('interview_complete'),
  ])
  return {
    visitors: visitors || 0,
    interviews: interviews || 0,
    completed: completed || 0,
  }
}
