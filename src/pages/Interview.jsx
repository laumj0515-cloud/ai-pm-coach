import { useState, useRef, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { chat } from '../lib/deepseek'
import { getProfile, getApiKey, saveSession } from '../lib/storage'
import { interviewerProfiles } from '../data/profiles'
import { defaultProfile } from '../data/defaultContext'
import { createSpeechRecognizer, isSpeechSupported } from '../lib/speech'
import NavBar from '../components/NavBar'

const MAX_ROUNDS = 5

// ── System Prompt ──────────────────────────────────────────
function buildSystemPrompt(mode, jdText) {
  const profile = getProfile() || defaultProfile
  const context = `候选人刘美姣的真实背景：
【基本信息】${profile.name}，${profile.targetRole}，目标${profile.targetCities}
【薪资】${profile.salaryExpectation}
【学历】${profile.education}
【工作】${profile.workExperience}
【项目】${profile.projects}
【技能】${profile.skills}
【筛选】${profile.filters}
【薄弱点】${profile.weakPoints}
【补充】${profile.customNotes || '无'}`

  let basePrompt = ''
  if (mode === 'custom' && jdText) {
    basePrompt = `你是面试官，针对以下JD面试：\n${jdText}\n\n${context}`
  } else {
    basePrompt = (interviewerProfiles[mode]?.systemPrompt || '') + '\n\n' + context
  }

  // Salary mode: use its own rules, no coaching format
  if (mode === 'salary') {
    return basePrompt + `\n\n══════════════════════════════════\n【重要】\n你的预算上限是内部信息，在谈判过程中不能透露。只有到最后公布结果时才亮出。\n每次回复只针对候选人的报价进行谈判回应，不要用任何评分格式。\n谈判3-5轮后，用📊格式公布最终结果。\n══════════════════════════════════`
  }

  return basePrompt + `

══════════════════════════════════
【核心规则：每题即时反馈】
══════════════════════════════════

你既是面试官也是教练。每次候选人回答后，你必须先用以下格式给出即时反馈，再问下一个问题：

✅ 好的：[1-2句话，指出回答中做得好的]
❌ 改善：[具体指出问题——表达方式、逻辑漏洞、数据缺失、用词不当、避重就轻]
💡 建议：[用1句话示范更好的答法]

反馈要直接犀利，不要客套话。如果回答有明显问题，❌部分要具体到字眼。

格式说明：用 ✅ ❌ 💡 这三个emoji标记分三行写，让候选人一眼看到。

然后自然过渡到下一个问题，用 "▸" 开头。

══════════════════════════════════
进行共${MAX_ROUNDS}轮问答。第${MAX_ROUNDS}轮候选人回答后，不再问新问题，而是给出最终总结：

📊 总分：X/100
📝 总结：[一句话]
⚠️ 最需改进：[一个点]

格式要求：用 📊 📝 ⚠️ 这三个emoji标记分行写。

面试结束时说"面试到此结束"。`
}

// ── TTS ──────────────────────────────────────────────────
function speakText(text) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) { resolve(); return }
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'zh-CN'
    u.rate = 1.0
    u.pitch = 1.0
    u.volume = 1
    const voices = window.speechSynthesis.getVoices()
    const zh = voices.find(v => v.lang.startsWith('zh'))
    if (zh) u.voice = zh
    u.onend = () => resolve()
    u.onerror = () => resolve()
    window.speechSynthesis.speak(u)
  })
}

function stopSpeech() {
  if (window.speechSynthesis) window.speechSynthesis.cancel()
}

// ── Feedback Bubble ─────────────────────────────────────
function FeedbackBubble({ content }) {
  // Parse ✅ ❌ 💡 sections from AI response for visual emphasis
  const lines = content.split('\n')
  const goodLines = []
  const badLines = []
  const tipLines = []
  const otherLines = []
  let current = null

  for (const line of lines) {
    if (line.includes('✅')) { current = 'good'; goodLines.push(line); continue }
    if (line.includes('❌')) { current = 'bad'; badLines.push(line); continue }
    if (line.includes('💡')) { current = 'tip'; tipLines.push(line); continue }
    if (line.includes('📊') || line.includes('📝') || line.includes('⚠️')) {
      current = 'summary'; otherLines.push(line); continue
    }
    if (current === 'good') goodLines.push(line)
    else if (current === 'bad') badLines.push(line)
    else if (current === 'tip') tipLines.push(line)
    else otherLines.push(line)
  }

  return (
    <div className="chat-enter flex justify-start mb-4">
      <div className="max-w-[90%]">
        <div className="text-xs mb-1 px-1 text-brand-400">面试官 · 点评</div>
        <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl rounded-bl-md overflow-hidden">
          {/* Good */}
          {goodLines.length > 0 && (
            <div className="px-4 py-2.5 border-b border-emerald-500/10 bg-emerald-500/5">
              {goodLines.map((l, i) => (
                <p key={i} className="text-xs text-emerald-300 leading-relaxed">{l}</p>
              ))}
            </div>
          )}
          {/* Bad */}
          {badLines.length > 0 && (
            <div className="px-4 py-2.5 border-b border-red-500/10 bg-red-500/5">
              {badLines.map((l, i) => (
                <p key={i} className="text-xs text-red-300 leading-relaxed">{l}</p>
              ))}
            </div>
          )}
          {/* Tip */}
          {tipLines.length > 0 && (
            <div className="px-4 py-2.5 border-b border-brand-500/10 bg-brand-500/5">
              {tipLines.map((l, i) => (
                <p key={i} className="text-xs text-blue-300 leading-relaxed">{l}</p>
              ))}
            </div>
          )}
          {/* Other (questions, transitions, summary) */}
          {otherLines.length > 0 && (
            <div className="px-4 py-2.5">
              {otherLines.map((l, i) => (
                <p key={i} className="text-xs text-slate-300 leading-relaxed">{l}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Component ──────────────────────────────────────
export default function Interview() {
  const location = useLocation()
  const navigate = useNavigate()
  const { mode, jdText } = location.state || { mode: 'founder' }
  const profileData = interviewerProfiles[mode]

  const [messages, setMessages] = useState([])
  const [textInput, setTextInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [round, setRound] = useState(0)
  const [interviewEnded, setInterviewEnded] = useState(false)

  // Voice
  const [voiceMode, setVoiceMode] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [voiceBuffer, setVoiceBuffer] = useState('')
  const [voiceStatus, setVoiceStatus] = useState('idle')
  const [ttsEnabled, setTtsEnabled] = useState(true)

  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const recognitionRef = useRef(null)
  const silenceTimerRef = useRef(null)
  const voiceModeRef = useRef(false)
  const isSpeakingRef = useRef(false)

  const apiKey = getApiKey()
  const speechSupported = isSpeechSupported()

  useEffect(() => { voiceModeRef.current = voiceMode }, [voiceMode])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, voiceBuffer])

  useEffect(() => {
    startInterview()
    return () => { stopSpeech(); stopListening() }
  }, [])

  // ── Voice Engine ──────────────────────────────────────
  const startListening = useCallback(() => {
    const rec = createSpeechRecognizer('zh-CN')
    if (!rec) return
    recognitionRef.current = rec
    let finalAccum = ''

    const resetSilence = () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      if (voiceModeRef.current && finalAccum.trim()) {
        silenceTimerRef.current = setTimeout(() => {
          const text = finalAccum.trim()
          if (text) {
            setVoiceBuffer(text)
            sendMessage(text, true)
            finalAccum = ''
            setVoiceBuffer('')
          }
        }, 3000)
      }
    }

    rec.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) finalAccum += r[0].transcript
        else interim += r[0].transcript
      }
      setVoiceBuffer(finalAccum + interim)
      setVoiceStatus(interim ? 'listening' : 'thinking')
      resetSilence()
    }

    rec.onend = () => {
      if (voiceModeRef.current && !isSpeakingRef.current) {
        try { rec.start() } catch (_) {}
      }
    }

    rec.onerror = (e) => {
      if (e.error === 'not-allowed') {
        alert('请允许麦克风权限')
        setVoiceMode(false)
        return
      }
      if (voiceModeRef.current && e.error !== 'aborted') {
        setTimeout(() => { if (voiceModeRef.current) try { rec.start() } catch (_) {} }, 500)
      }
    }

    try { rec.start(); setIsListening(true); setVoiceStatus('listening') } catch (_) {}
  }, [])

  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch (_) {}
      recognitionRef.current = null
    }
    setIsListening(false)
    setVoiceStatus('idle')
    setVoiceBuffer('')
  }, [])

  const enterVoiceMode = () => {
    setVoiceMode(true)
    setTimeout(() => startListening(), 300)
  }

  const exitVoiceMode = () => {
    stopListening()
    setVoiceMode(false)
    stopSpeech()
  }

  // ── Interview Flow ────────────────────────────────────
  const startInterview = async () => {
    setIsLoading(true)
    setError('')
    try {
      const systemPrompt = buildSystemPrompt(mode, jdText)
      const opening = await chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: '开始面试。简单介绍自己（面试官），然后问第1个问题。' },
        ],
        apiKey, { temperature: 0.8, maxTokens: 512 }
      )
      setMessages([{ role: 'assistant', content: opening, isFeedback: false }])
      if (voiceMode && ttsEnabled) {
        isSpeakingRef.current = true
        await speakText(opening)
        isSpeakingRef.current = false
        if (voiceModeRef.current) startListening()
      }
    } catch (e) {
      setError(e.message || '连接失败')
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async (content, fromVoice = false) => {
    const msg = content || textInput.trim()
    if (!msg || isLoading || interviewEnded) return

    if (fromVoice) {
      stopListening()
      isSpeakingRef.current = true
      setVoiceStatus('sending')
    }

    const newRound = round + 1
    setRound(newRound)

    const userMsg = { role: 'user', content: msg, isFeedback: false }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setTextInput('')
    setVoiceBuffer('')
    setIsLoading(true)
    setError('')

    const isLastRound = newRound >= MAX_ROUNDS

    try {
      const systemPrompt = buildSystemPrompt(mode, jdText)
      const allMessages = [
        { role: 'system', content: systemPrompt },
        ...newMessages.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({
          role: m.role,
          content: m.content,
        })),
      ]

      // Instruction for the AI — EVERY round needs explicit direction
      if (mode === 'salary') {
        // Salary mode: instruct negotiation, no coaching format
        allMessages.push({
          role: 'user',
          content: isLastRound
            ? `第${newRound}轮（最后一轮）。请用📊格式公布你的预算上限，分析她的谈判表现。`
            : `第${newRound}轮。根据她的报价继续谈判。如报价超预算，给出淘汰概率。如报价偏低，适当提醒。不要透露你的预算上限。`,
        })
      } else if (isLastRound) {
        allMessages.push({
          role: 'user',
          content: `这是第${newRound}轮（最后一轮）。按以下顺序回复：(1)先按✅❌💡格式点评她的回答 (2)再用📊📝⚠️格式给出总分和总结 (3)说"面试到此结束"。`,
        })
      } else {
        allMessages.push({
          role: 'user',
          content: `第${newRound}轮。你必须严格按照两步走：(1)先按✅好的 ❌改善 💡建议 的格式点评她刚才的回答 (2)再问第${newRound + 1}个问题（不能重复之前问过的）。用"▸"开头引出新问题。`,
        })
      }

      const isEnd = isLastRound && (reply.includes('面试到此结束') || reply.includes('📊'))

      if (isEnd) {
        setInterviewEnded(true)
        const finalMessages = [...newMessages, { role: 'assistant', content: reply, isFeedback: true }]
        setMessages(finalMessages)

        // Save session
        const sessionData = {
          id: Date.now().toString(),
          date: new Date().toLocaleDateString('zh-CN'),
          mode, modeName: profileData.name,
          messages: finalMessages,
          totalRounds: newRound,
        }
        try {
          saveSession({ ...sessionData, score: null, review: null, weakPoints: [] })
        } catch (saveErr) {
          console.error('Save error:', saveErr)
        }

        stopSpeech()
        if (voiceMode) exitVoiceMode()

        // Navigate to review
        setTimeout(() => {
          navigate('/review', {
            state: { sessionId: sessionData.id, mode },
            replace: true,
          })
        }, 500)
        return
      }

      // Not ended — normal round with feedback
      const updated = [...newMessages, { role: 'assistant', content: reply, isFeedback: true }]
      setMessages(updated)

      if (voiceMode && ttsEnabled) {
        await speakText(reply)
      }
      if (voiceModeRef.current && !isLastRound) {
        isSpeakingRef.current = false
        setTimeout(() => {
          if (voiceModeRef.current && !isSpeakingRef.current) startListening()
        }, 500)
      } else {
        isSpeakingRef.current = false
      }
    } catch (e) {
      setError(e.message || '请求失败')
      setRound(round) // Rollback round
      if (voiceModeRef.current) {
        isSpeakingRef.current = false
        startListening()
      }
    } finally {
      setIsLoading(false)
      if (!voiceMode) setVoiceStatus('idle')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleEndInterview = () => {
    if (messages.length < 3 && !confirm('面试刚开始，确定要结束吗？')) return
    stopSpeech()
    if (voiceMode) exitVoiceMode()
    const sessionData = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('zh-CN'),
      mode, modeName: profileData.name,
      messages,
      totalRounds: round,
    }
    try {
      saveSession({ ...sessionData, score: null, review: null, weakPoints: [] })
    } catch (saveErr) {
      console.error('Save error:', saveErr)
    }
    navigate('/review', { state: { sessionId: sessionData.id, mode }, replace: true })
  }

  // ── No API Key ──────────────────────────────────────
  if (!apiKey) {
    return (
      <div className="min-h-screen bg-slate-950 max-w-lg mx-auto flex flex-col">
        <NavBar title={profileData.name} />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="text-4xl mb-4">🔑</div>
            <h2 className="text-white font-semibold mb-2">请先设置 API Key</h2>
            <p className="text-sm text-slate-500 mb-4">配置 DeepSeek API Key</p>
            <button onClick={() => navigate('/profile')} className="px-6 py-3 rounded-xl bg-brand-600 text-white text-sm font-semibold">
              前往设置
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 max-w-lg mx-auto flex flex-col h-screen">
      <NavBar
        title={voiceMode ? '🎙 语音面试' : `${profileData.name} · ${round}/${MAX_ROUNDS}轮`}
        rightAction={
          <div className="flex items-center gap-2">
            {voiceMode && (
              <button
                onClick={() => setTtsEnabled(!ttsEnabled)}
                className={`text-xs px-2 py-1 rounded-lg ${ttsEnabled ? 'bg-brand-600/20 text-brand-400' : 'bg-slate-800 text-slate-500'}`}
              >
                {ttsEnabled ? '🔊' : '🔇'}
              </button>
            )}
            <button onClick={handleEndInterview} className="text-xs text-slate-500 hover:text-red-400">
              结束
            </button>
          </div>
        }
      />

      {/* Voice overlay */}
      {voiceMode && (
        <div className="bg-slate-900/95 border-b border-slate-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                voiceStatus === 'listening' ? 'bg-red-500 recording-ring' :
                voiceStatus === 'thinking' ? 'bg-amber-500 animate-pulse' :
                voiceStatus === 'sending' ? 'bg-brand-500 animate-pulse' : 'bg-slate-600'
              }`} />
              <span className="text-sm text-slate-300">
                {voiceStatus === 'listening' && '聆听中...'}
                {voiceStatus === 'thinking' && '思考中...'}
                {voiceStatus === 'sending' && '发送中...'}
              </span>
            </div>
            <button onClick={exitVoiceMode} className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
              切换文字
            </button>
          </div>
          {voiceBuffer && (
            <div className="mt-2 text-sm text-slate-400 bg-slate-800/50 rounded-lg px-3 py-2 italic animate-fade-in">
              {voiceBuffer}
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-slate-500 text-sm">面试官正在准备...</div>
          </div>
        )}

        {messages.map((msg, i) =>
          msg.role === 'user' ? (
            <div key={i} className="chat-enter flex justify-end mb-4">
              <div className="max-w-[85%]">
                <div className="text-xs mb-1 px-1 text-right text-slate-500">你</div>
                <div className="rounded-2xl px-4 py-3 text-sm text-slate-200 bg-brand-600/20 border border-brand-500/30 rounded-br-md whitespace-pre-wrap break-words">
                  {msg.content}
                </div>
              </div>
            </div>
          ) : msg.isFeedback ? (
            <FeedbackBubble key={i} content={msg.content} />
          ) : (
            <div key={i} className="chat-enter flex justify-start mb-4">
              <div className="max-w-[85%]">
                <div className="text-xs mb-1 px-1 text-brand-400">面试官</div>
                <div className="rounded-2xl px-4 py-3 text-sm text-slate-200 bg-slate-800/80 border border-slate-700/50 rounded-bl-md whitespace-pre-wrap break-words">
                  {msg.content}
                </div>
              </div>
            </div>
          )
        )}

        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="bg-slate-800/60 rounded-2xl px-4 py-3 rounded-bl-md">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-slate-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-slate-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-slate-600 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
            {error}
            <button onClick={startInterview} className="ml-2 underline">重试</button>
          </div>
        )}

        {interviewEnded && (
          <div className="text-center py-4 animate-fade-in">
            <button
              onClick={() => navigate('/review', { state: { sessionId: Date.now().toString(), mode } })}
              className="px-6 py-3 rounded-xl bg-brand-600 text-white text-sm font-semibold"
            >
              查看复盘
            </button>
          </div>
        )}
      </div>

      {/* Input */}
      {!interviewEnded && (
        <div className="px-4 py-3 border-t border-slate-800/50 safe-bottom space-y-3">
          {speechSupported ? (
            <button onClick={enterVoiceMode} className="w-full py-3 rounded-2xl bg-slate-800 border border-slate-700 text-slate-300 text-sm font-medium hover:border-brand-500/50 active:scale-[0.98] flex items-center justify-center gap-2">
              <span>🎙</span> 语音通话模式
            </button>
          ) : (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 text-xs text-amber-300">
              当前浏览器不支持语音。请用 <strong className="text-white">Chrome</strong> 打开本页面。
            </div>
          )}

          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入回答..."
              disabled={isLoading}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 disabled:opacity-50"
            />
            <button
              onClick={() => sendMessage()}
              disabled={!textInput.trim() || isLoading}
              className="px-5 py-3 rounded-xl bg-brand-600 text-white text-sm font-semibold disabled:opacity-40 shrink-0"
            >
              发送
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
