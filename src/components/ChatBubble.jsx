export default function ChatBubble({ message, isUser }) {
  return (
    <div className={`chat-enter flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[85%] ${isUser ? 'order-1' : 'order-1'}`}>
        {/* Label */}
        <div className={`text-xs mb-1 px-1 ${isUser ? 'text-right text-slate-500' : 'text-left text-brand-400'}`}>
          {isUser ? '你' : '面试官'}
        </div>

        {/* Bubble */}
        <div className={`
          rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words
          ${isUser
            ? 'bg-brand-600/20 border border-brand-500/30 text-slate-200 rounded-br-md'
            : 'bg-slate-800/80 border border-slate-700/50 text-slate-200 rounded-bl-md'
          }
        `}>
          {message.content}
        </div>
      </div>
    </div>
  )
}
