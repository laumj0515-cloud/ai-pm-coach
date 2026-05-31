import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getSessions } from '../lib/storage'
import NavBar from '../components/NavBar'

function extractScore(text) {
  const match = text?.match(/📊[^\d]*(\d+)/)
  return match ? parseInt(match[1]) : null
}

function extractSummary(text) {
  const match = text?.match(/📝[^\n]*/)
  return match ? match[0].replace('📝', '').trim() : ''
}

function extractUrgent(text) {
  const match = text?.match(/⚠️[^\n]*/)
  return match ? match[0].replace('⚠️', '').trim() : ''
}

function FeedbackBubble({ content }) {
  const lines = content.split('\n')
  const goodLines = []; const badLines = []; const tipLines = []; const otherLines = []
  let current = 'other'

  for (const line of lines) {
    if (line.includes('✅')) { current = 'good'; goodLines.push(line); continue }
    if (line.includes('❌')) { current = 'bad'; badLines.push(line); continue }
    if (line.includes('💡')) { current = 'tip'; tipLines.push(line); continue }
    if (line.includes('📊') || line.includes('📝') || line.includes('⚠️') || line.includes('▸')) {
      current = 'other'; otherLines.push(line); continue
    }
    if (current === 'good') goodLines.push(line)
    else if (current === 'bad') badLines.push(line)
    else if (current === 'tip') tipLines.push(line)
    else otherLines.push(line)
  }

  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[90%]">
        <div className="text-xs mb-1 px-1 text-brand-400">面试官 · 点评</div>
        <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl rounded-bl-md overflow-hidden">
          {goodLines.length > 0 && (
            <div className="px-4 py-2.5 border-b border-emerald-500/10 bg-emerald-500/5">
              {goodLines.map((l, i) => <p key={i} className="text-xs text-emerald-300 leading-relaxed">{l}</p>)}
            </div>
          )}
          {badLines.length > 0 && (
            <div className="px-4 py-2.5 border-b border-red-500/10 bg-red-500/5">
              {badLines.map((l, i) => <p key={i} className="text-xs text-red-300 leading-relaxed">{l}</p>)}
            </div>
          )}
          {tipLines.length > 0 && (
            <div className="px-4 py-2.5 border-b border-brand-500/10 bg-brand-500/5">
              {tipLines.map((l, i) => <p key={i} className="text-xs text-blue-300 leading-relaxed">{l}</p>)}
            </div>
          )}
          {otherLines.length > 0 && (
            <div className="px-4 py-2.5">
              {otherLines.map((l, i) => <p key={i} className="text-xs text-slate-300 leading-relaxed">{l}</p>)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Review() {
  const location = useLocation()
  const navigate = useNavigate()
  const { sessionId, mode } = location.state || {}

  const sessions = getSessions()
  const session = sessions.find(s => s.id === sessionId)

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 max-w-lg mx-auto flex flex-col">
        <NavBar title="复盘" />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="text-4xl mb-4">📋</div>
            <h2 className="text-white font-semibold mb-2">暂无面试记录</h2>
            <p className="text-sm text-slate-500 mb-4">先完成一场面试</p>
            <button onClick={() => navigate('/')} className="px-6 py-3 rounded-xl bg-brand-600 text-white text-sm font-semibold">
              开始面试
            </button>
          </div>
        </div>
      </div>
    )
  }

  const lastMsg = [...(session.messages || [])].reverse().find(m => m.role === 'assistant')
  const score = extractScore(lastMsg?.content)
  const summary = extractSummary(lastMsg?.content)
  const urgent = extractUrgent(lastMsg?.content)
  const totalRounds = session.totalRounds || session.messages?.filter(m => m.role === 'user').length || 0

  return (
    <div className="min-h-screen bg-slate-950 max-w-lg mx-auto">
      <NavBar title="面试回顾" />

      <div className="px-5 py-4">
        {/* Score card */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 text-center mb-4">
          <div className={`text-5xl font-bold mb-1 ${
            score != null
              ? score >= 75 ? 'text-emerald-400' : score >= 45 ? 'text-amber-400' : 'text-red-400'
              : 'text-slate-500'
          }`}>
            {score != null ? score : '--'}
          </div>
          <div className="text-xs text-slate-500 mb-2">总分 / 100 · {totalRounds}轮问答</div>
          {summary && <p className="text-sm text-slate-300">{summary}</p>}
          {urgent && (
            <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-left">
              <span className="text-xs font-bold text-red-400">⚠ 最需改进：</span>
              <span className="text-sm text-red-300 ml-1">{urgent}</span>
            </div>
          )}
        </div>

        {/* Full transcript with inline feedback */}
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">对话回顾</h3>
        <div className="space-y-1 pb-8">
          {session.messages?.map((msg, i) => {
            if (msg.role === 'user') {
              return (
                <div key={i} className="flex justify-end mb-3">
                  <div className="max-w-[85%]">
                    <div className="text-xs mb-1 px-1 text-right text-slate-500">你</div>
                    <div className="rounded-2xl px-4 py-3 text-sm text-slate-200 bg-brand-600/20 border border-brand-500/30 rounded-br-md whitespace-pre-wrap break-words">
                      {msg.content}
                    </div>
                  </div>
                </div>
              )
            } else if (msg.isFeedback) {
              return <FeedbackBubble key={i} content={msg.content} />
            } else {
              return (
                <div key={i} className="flex justify-start mb-3">
                  <div className="max-w-[85%]">
                    <div className="text-xs mb-1 px-1 text-brand-400">面试官</div>
                    <div className="rounded-2xl px-4 py-3 text-sm text-slate-200 bg-slate-800/80 border border-slate-700/50 rounded-bl-md whitespace-pre-wrap break-words">
                      {msg.content}
                    </div>
                  </div>
                </div>
              )
            }
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pb-8">
          <button onClick={() => navigate('/')} className="flex-1 py-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-400 hover:text-white">
            返回首页
          </button>
          <button onClick={() => navigate('/interview', { state: { mode } })} className="flex-1 py-3 rounded-xl bg-brand-600 text-white text-sm font-semibold">
            再练一次
          </button>
        </div>
      </div>
    </div>
  )
}
