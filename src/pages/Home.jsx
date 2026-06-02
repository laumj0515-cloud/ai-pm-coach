import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { interviewerProfiles } from '../data/profiles'
import { getSessions, getStats } from '../lib/storage'

export default function Home() {
  const navigate = useNavigate()
  const [showJD, setShowJD] = useState(false)
  const [jdText, setJdText] = useState('')
  const stats = getStats()
  const sessions = getSessions()

  const handleStart = (mode) => {
    if (mode === 'custom') {
      if (!jdText.trim()) {
        alert('请先粘贴目标岗位的JD')
        return
      }
      navigate('/interview', { state: { mode, jdText: jdText.trim() } })
    } else {
      navigate('/interview', { state: { mode } })
    }
  }

  const profiles = Object.entries(interviewerProfiles)

  return (
    <div className="min-h-screen bg-slate-950 max-w-lg mx-auto">
      {/* Header */}
      <div className="px-5 pt-12 pb-6">
        <h1 className="text-2xl font-bold text-white mb-1">AI PM Coach</h1>
        <p className="text-sm text-slate-500">AI 面试训练 · 针对性强化</p>
      </div>

      {/* Stats strip */}
      {stats.total > 0 && (
        <div className="px-5 mb-6">
          <div className="flex gap-3">
            <div className="flex-1 bg-slate-900 rounded-xl p-3 border border-slate-800/50">
              <div className="text-xl font-bold text-white">{stats.total}</div>
              <div className="text-xs text-slate-500">练习次数</div>
            </div>
            <div className="flex-1 bg-slate-900 rounded-xl p-3 border border-slate-800/50">
              <div className="text-xl font-bold text-warm-400">{stats.avgScore || '--'}</div>
              <div className="text-xs text-slate-500">平均分</div>
            </div>
            <div className="flex-1 bg-slate-900 rounded-xl p-3 border border-slate-800/50">
              <div className="text-sm font-bold text-slate-300 truncate">
                {stats.lastPractice || '--'}
              </div>
              <div className="text-xs text-slate-500">最近练习</div>
            </div>
          </div>
        </div>
      )}

      {/* Mode selection */}
      <div className="px-5 mb-4">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">选择面试模式</h2>
        <div className="space-y-3">
          {profiles.map(([key, profile]) => (
            <button
              key={key}
              onClick={() => key === 'custom' ? setShowJD(!showJD) : handleStart(key)}
              className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 active:scale-[0.98]
                ${key === 'custom'
                  ? 'border-dashed border-slate-700 bg-transparent hover:border-slate-500'
                  : 'border-slate-800 bg-slate-900 hover:border-brand-500/50 hover:bg-slate-900/80'
                }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{profile.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white">{profile.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{profile.description}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Custom JD input */}
        {showJD && (
          <div className="mt-3 animate-fade-in">
            <textarea
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder="粘贴目标岗位的JD（职位描述）..."
              rows={5}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:border-brand-500"
            />
            <button
              onClick={() => handleStart('custom')}
              disabled={!jdText.trim()}
              className="w-full mt-2 py-3 rounded-xl bg-brand-600 text-white text-sm font-semibold disabled:opacity-40 transition-opacity"
            >
              开始针对性面试
            </button>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className="px-5 pb-8 safe-bottom">
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/profile')}
            className="flex-1 py-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-400 hover:text-white transition-colors"
          >
            个人档案
          </button>
          <button
            onClick={() => navigate('/history')}
            className="flex-1 py-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-400 hover:text-white transition-colors"
          >
            练习记录{sessions.length > 0 ? ` (${sessions.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
