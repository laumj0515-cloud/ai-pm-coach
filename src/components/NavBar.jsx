import { useLocation, useNavigate } from 'react-router-dom'

export default function NavBar({ title, showBack = true, rightAction }) {
  const navigate = useNavigate()
  const location = useLocation()

  const isHome = location.pathname === '/'

  return (
    <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-lg border-b border-slate-800/50">
      <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
        <div className="w-16">
          {!isHome && showBack && (
            <button
              onClick={() => navigate(-1)}
              className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-1"
            >
              ← 返回
            </button>
          )}
        </div>

        <h1 className="text-sm font-semibold text-slate-200 text-center flex-1 truncate">
          {title || 'AI PM Coach'}
        </h1>

        <div className="w-16 flex justify-end">
          {rightAction}
        </div>
      </div>
    </nav>
  )
}
