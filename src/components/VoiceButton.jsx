import { useState, useRef, useCallback, useEffect } from 'react'
import { createSpeechRecognizer, isSpeechSupported } from '../lib/speech'

export default function VoiceButton({ onResult, onInterim, disabled = false }) {
  const [isRecording, setIsRecording] = useState(false)
  const [supported] = useState(() => isSpeechSupported())
  const recognitionRef = useRef(null)
  const heldRef = useRef(false)
  const timerRef = useRef(null)

  const startRecording = useCallback(() => {
    if (disabled) return
    const rec = createSpeechRecognizer('zh-CN')
    if (!rec) return
    recognitionRef.current = rec

    let finalText = ''

    rec.onresult = (e) => {
      let interim = ''
      let final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) final += r[0].transcript
        else interim += r[0].transcript
      }
      if (final) {
        finalText += final
        onInterim?.(finalText)
      }
      if (interim) {
        onInterim?.(finalText + interim)
      }
    }

    rec.onend = () => {
      if (heldRef.current) {
        // Still holding — restart recognition (continuous mode can end prematurely)
        try { rec.start() } catch (_) {}
      }
    }

    rec.onerror = (e) => {
      if (e.error === 'not-allowed') {
        alert('请允许麦克风权限后重试')
      }
      setIsRecording(false)
      heldRef.current = false
    }

    try {
      rec.start()
      setIsRecording(true)
      heldRef.current = true
    } catch (_) {}
  }, [disabled, onInterim])

  const stopRecording = useCallback(() => {
    heldRef.current = false
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (_) {}
      recognitionRef.current = null
    }
    setIsRecording(false)
  }, [])

  // Mouse / Touch handlers
  const handlePointerDown = (e) => {
    e.preventDefault()
    startRecording()
  }

  const handlePointerUp = (e) => {
    e.preventDefault()
    stopRecording()
  }

  const handlePointerLeave = () => {
    if (isRecording) stopRecording()
  }

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop() } catch (_) {}
      }
    }
  }, [])

  if (!supported) {
    return (
      <button
        disabled
        className="w-full py-4 rounded-2xl bg-slate-800 text-slate-500 text-sm font-medium"
      >
        你的浏览器不支持语音识别，请使用 Chrome 或 Edge
      </button>
    )
  }

  return (
    <div className="relative flex flex-col items-center gap-2">
      {/* Interim text display */}
      {isRecording && (
        <div className="absolute bottom-full mb-4 w-full max-w-sm bg-slate-800/90 backdrop-blur rounded-xl px-4 py-3 text-sm text-slate-300 animate-fade-in">
          <span className="text-red-400 text-xs font-medium mr-2">● 正在聆听...</span>
          <span className="text-white">说话中...</span>
        </div>
      )}

      <button
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onContextMenu={(e) => e.preventDefault()}
        disabled={disabled}
        className={`
          w-full max-w-[200px] py-4 rounded-2xl font-semibold text-sm
          transition-all duration-200 select-none touch-none
          ${isRecording
            ? 'bg-red-500/20 border-2 border-red-500 text-red-400 recording-ring scale-105'
            : 'bg-slate-800 border-2 border-slate-700 text-slate-300 hover:border-slate-600 active:scale-95'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        {isRecording ? '松开发送  ·  上滑取消' : '🎤 长按说话'}
      </button>

      {!isRecording && (
        <p className="text-xs text-slate-600">或直接在下方输入文字</p>
      )}
    </div>
  )
}
