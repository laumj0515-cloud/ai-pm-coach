import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProfile, saveProfile, getApiKey, saveApiKey } from '../lib/storage'
import { defaultProfile } from '../data/defaultContext'
import NavBar from '../components/NavBar'

export default function Profile() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(() => getProfile() || defaultProfile)
  const [apiKey, setApiKey] = useState(() => getApiKey())
  const [showApiKey, setShowApiKey] = useState(false)
  const [saved, setSaved] = useState(false)
  const [keySaved, setKeySaved] = useState(false)

  useEffect(() => {
    saveProfile(profile)
    const timer = setTimeout(() => setSaved(false), 2000)
    return () => clearTimeout(timer)
  }, [profile])

  const handleChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  const handleSaveApiKey = () => {
    saveApiKey(apiKey)
    setKeySaved(true)
    setTimeout(() => setKeySaved(false), 2000)
  }

  const handleReset = () => {
    if (confirm('确定要恢复默认档案吗？你填写的内容将丢失。')) {
      setProfile(defaultProfile)
    }
  }

  const fields = [
    { key: 'targetRole', label: '目标岗位', placeholder: 'AI产品经理（C端/Agent/AI应用层）' },
    { key: 'targetCities', label: '目标城市', placeholder: '上海、深圳、杭州、苏州' },
    { key: 'currentCity', label: '现居城市', placeholder: '南京' },
    { key: 'salaryExpectation', label: '薪资预期', placeholder: '期望1.7万，底线按城市...' },
    { key: 'education', label: '教育背景', placeholder: '学历信息...', textarea: true, rows: 4 },
    { key: 'workExperience', label: '工作经历', placeholder: '公司和职位...', textarea: true, rows: 6 },
    { key: 'projects', label: '项目经历', placeholder: 'Tempo、Mibo...', textarea: true, rows: 10 },
    { key: 'skills', label: '技能', placeholder: 'Figma / SQL / Axure...' },
    { key: 'filters', label: '求职筛选', placeholder: '硬性要求...', textarea: true, rows: 3 },
    { key: 'weakPoints', label: '已知薄弱点', placeholder: 'Gap、学历、转行...', textarea: true, rows: 4 },
    { key: 'customNotes', label: '补充说明', placeholder: '其他想让AI面试官知道的...', textarea: true, rows: 3 },
  ]

  return (
    <div className="min-h-screen bg-slate-950 max-w-lg mx-auto">
      <NavBar title="个人档案" />

      <div className="px-5 py-4 space-y-5">
        {/* API Key */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">DeepSeek API Key</h3>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); setKeySaved(false) }}
                placeholder="sk-..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 pr-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs"
              >
                {showApiKey ? '隐藏' : '显示'}
              </button>
            </div>
            <button
              onClick={handleSaveApiKey}
              className={`px-4 py-3 rounded-xl text-sm font-semibold shrink-0 transition-colors ${
                keySaved ? 'bg-green-600 text-white' : 'bg-brand-600 text-white'
              }`}
            >
              {keySaved ? '已保存' : '保存'}
            </button>
          </div>
          <p className="text-xs text-slate-600 mt-2">API Key 仅存储在你的浏览器本地，不会上传到任何服务器</p>
        </div>

        {/* Info Banner */}
        <div className="bg-brand-500/5 border border-brand-500/20 rounded-2xl p-4">
          <p className="text-xs text-slate-400 leading-relaxed">
            以下信息会被注入到AI面试官的 system prompt 中。面试官会基于这些信息对你进行深度追问。
            填写越详细，追问越精准。<strong className="text-white">面试时切换到自定义JD模式，可以针对具体岗位练习。</strong>
          </p>
        </div>

        {/* Profile Fields */}
        {fields.map(({ key, label, placeholder, textarea, rows }) => (
          <div key={key} className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</label>
            {textarea ? (
              <textarea
                value={profile[key] || ''}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder={placeholder}
                rows={rows || 4}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 resize-none focus:outline-none focus:border-brand-500"
              />
            ) : (
              <input
                type="text"
                value={profile[key] || ''}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder={placeholder}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
              />
            )}
          </div>
        ))}

        {/* Actions */}
        <div className="flex gap-3 pt-2 pb-8">
          <button
            onClick={handleReset}
            className="flex-1 py-3 rounded-xl bg-slate-900 border border-red-500/20 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            恢复默认
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex-1 py-3 rounded-xl bg-brand-600 text-white text-sm font-semibold"
          >
            完成
          </button>
        </div>

        {/* Save indicator */}
        {saved && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs px-4 py-2 rounded-full animate-fade-in">
            已自动保存
          </div>
        )}
      </div>
    </div>
  )
}
