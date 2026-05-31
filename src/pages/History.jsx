import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSessions, deleteSession, getStats } from '../lib/storage'
import NavBar from '../components/NavBar'

export default function History() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState(() => getSessions())
  const stats = getStats()

  const handleDelete = (id) => {
    if (!confirm('确定删除这条记录？')) return
    deleteSession(id)
    setSessions(getSessions())
  }

  const getModeIcon = (mode) => {
    const icons = { founder: '🚀', hr: '💼', techPM: '⚙️', custom: '🎯' }
    return icons[mode] || '📋'
  }

  const getScoreBadge = (score) => {
    if (score == null) return { text: '未评分', style: 'text-slate-600 bg-slate-800' }
    if (score >= 75) return { text: `${score}分`, style: 'text-emerald-400 bg-emerald-500/10' }
    if (score >= 50) return { text: `${score}分`, style: 'text-amber-400 bg-amber-500/10' }
    return { text: `${score}分`, style: 'text-red-400 bg-red-500/10' }
  }

  const countRedProblems = (session) => {
    return session.review?.questionReviews?.filter(q => q.problemLevel === 'red').length || 0
  }

  const countYellowProblems = (session) => {
    return session.review?.questionReviews?.filter(q => q.problemLevel === 'yellow').length || 0
  }

  return (
    <div className="min-h-screen bg-slate-950 max-w-lg mx-auto">
      <NavBar title="练习记录" />

      <div className="px-5 py-4">
        {/* Stats summary */}
        {stats.total > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">数据概览</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-900 rounded-xl p-3 border border-slate-800/50 text-center">
                <div className="text-xl font-bold text-white">{stats.total}</div>
                <div className="text-xs text-slate-500">总练习</div>
              </div>
              <div className="bg-slate-900 rounded-xl p-3 border border-slate-800/50 text-center">
                <div className="text-xl font-bold text-warm-400">{stats.avgScore || '--'}</div>
                <div className="text-xs text-slate-500">平均分</div>
              </div>
              <div className="bg-slate-900 rounded-xl p-3 border border-slate-800/50 text-center">
                <div className="text-sm font-bold text-slate-300 truncate">{stats.lastPractice || '--'}</div>
                <div className="text-xs text-slate-500">最近</div>
              </div>
            </div>

            {/* Weak patterns */}
            {stats.weakPoints.length > 0 && (
              <div className="mt-4 bg-red-500/5 border-2 border-red-500/30 rounded-2xl p-4">
                <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">
                  ⚠ 反复出现的薄弱点
                </h3>
                <div className="flex flex-wrap gap-2">
                  {stats.weakPoints.map((w, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-red-500/15 text-red-300 border border-red-500/20">
                      {w}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Session list */}
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">历史记录</h3>

        {sessions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📝</div>
            <p className="text-sm text-slate-500 mb-4">还没有练习记录</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 rounded-xl bg-brand-600 text-white text-sm font-semibold"
            >
              开始第一场面试
            </button>
          </div>
        ) : (
          <div className="space-y-3 pb-8">
            {sessions.map((s) => {
              const badge = getScoreBadge(s.score)
              const msgCount = s.messages?.filter(m => m.role === 'user').length || 0
              const redCount = countRedProblems(s)
              const yellowCount = countYellowProblems(s)

              return (
                <div
                  key={s.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-colors"
                >
                  <div className="p-4">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span>{getModeIcon(s.mode)}</span>
                        <span className="text-sm font-medium text-white">{s.modeName}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${badge.style}`}>
                        {badge.text}
                      </span>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                      <span>{s.date}</span>
                      <span>{msgCount} 轮问答</span>
                      {redCount > 0 && (
                        <span className="text-red-400 font-medium">🔴 {redCount}个严重问题</span>
                      )}
                      {yellowCount > 0 && (
                        <span className="text-amber-400 font-medium">🟡 {yellowCount}个需改进</span>
                      )}
                    </div>

                    {/* Summary preview */}
                    {s.review?.overallVerdict && (
                      <p className="text-xs text-slate-400 leading-relaxed mb-3 border-l-2 border-slate-700 pl-3">
                        {s.review.overallVerdict}
                      </p>
                    )}

                    {/* Urgent fix preview */}
                    {s.review?.urgentFix && (
                      <p className="text-xs text-red-400 leading-relaxed mb-3 bg-red-500/5 rounded-lg px-3 py-2 border border-red-500/10">
                        ⚠ {s.review.urgentFix}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      {s.review && (
                        <button
                          onClick={() => navigate('/review', { state: { sessionId: s.id, mode: s.mode } })}
                          className="text-xs px-3 py-1.5 rounded-lg bg-brand-600/20 text-brand-400 hover:bg-brand-600/30 transition-colors"
                        >
                          查看复盘
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="text-xs px-3 py-1.5 rounded-lg text-slate-600 hover:text-red-400 transition-colors"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
