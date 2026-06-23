'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { login, getRedirectPath, getStoredUser } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [showPw, setShowPw]     = useState(false)

  // If already logged in, redirect to the user's app
  useEffect(() => {
    const user = getStoredUser()
    if (user) router.replace(getRedirectPath(user))
  }, [])

  async function doLogin() {
    if (!email || !password) return
    setLoading(true)
    setError('')
    try {
      const data = await login(email.trim(), password)
      router.push(getRedirectPath(data.user))
    } catch (e: any) {
      setError(e.message || 'خطا در ورود به سیستم')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background: 'radial-gradient(ellipse 140% 80% at 50% -20%, rgba(194,163,90,.10) 0%, transparent 55%), #070d15',
      }}
    >
      {/* Top accent */}
      <div className="absolute top-0 inset-x-0 h-[2px]" style={{ background: 'linear-gradient(90deg,transparent 0%,#c2a35a 40%,#c2a35a 60%,transparent 100%)' }} />

      <div className="w-full max-w-md px-6 fade-up">

        {/* Logo + branding */}
        <div className="flex flex-col items-center text-center mb-8">
          {/* Emblem */}
          <div className="mb-5 relative">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center border"
              style={{
                borderColor: 'rgba(194,163,90,.4)',
                background: 'radial-gradient(circle, rgba(194,163,90,.12) 0%, rgba(194,163,90,.04) 100%)',
                boxShadow: '0 0 32px rgba(194,163,90,.12)',
              }}
            >
              <svg width="42" height="42" viewBox="0 0 42 42" fill="none">
                {/* Building */}
                <rect x="9" y="22" width="24" height="16" fill="#c2a35a" fillOpacity=".85" rx="1"/>
                {/* Windows */}
                <rect x="13" y="26" width="5" height="5" fill="#070d15" rx="0.5"/>
                <rect x="24" y="26" width="5" height="5" fill="#070d15" rx="0.5"/>
                <rect x="17" y="30" width="8" height="8" fill="#070d15" rx="0.5"/>
                {/* Roof */}
                <polygon points="5,22 21,8 37,22" fill="#c2a35a" fillOpacity=".6"/>
                {/* Flag pole */}
                <rect x="20" y="4" width="2" height="8" fill="#c2a35a"/>
                {/* Checkmark flag */}
                <rect x="22" y="4" width="7" height="5" fill="#56c48a" rx="0.5"/>
                <polyline points="23.5,6.5 25,8 27,5.5" stroke="#070d15" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </div>
          </div>

          <div className="text-xs tracking-[0.2em] text-gold font-semibold mb-2 opacity-80">
            شهرداری تهران
          </div>
          <h1 className="text-2xl font-black leading-tight mb-2" style={{ background: 'linear-gradient(180deg,#fff 30%,#8ca0b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            سامانه یکپارچه نظارت
          </h1>
          <p className="text-sm text-text-muted leading-7">
            قرارگاه بازرسی و پایش خدمات شهری
          </p>
        </div>

        {/* Login card */}
        <div className="rounded-2xl border border-border p-7" style={{ background: 'rgba(13,25,41,.7)', backdropFilter: 'blur(12px)' }}>
          <h2 className="text-base font-bold text-text-primary mb-5">ورود به سیستم</h2>

          {error && (
            <div className="flex items-start gap-2 bg-red-dim border border-red/30 text-red text-sm rounded-xl px-4 py-3 mb-5 leading-6">
              <span className="mt-0.5 shrink-0">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                ایمیل
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doLogin()}
                autoComplete="username"
                placeholder="example@payesh.ir"
                className="w-full px-4 py-3 rounded-xl bg-bg-dark border border-border text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-gold/50 transition-colors"
                dir="ltr"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                رمز عبور
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && doLogin()}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-bg-dark border border-border text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-gold/50 transition-colors pr-10"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-text-dim hover:text-text-muted transition-colors text-xs"
                >
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={doLogin}
              disabled={loading || !email || !password}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all mt-1 disabled:opacity-40"
              style={{ background: loading ? 'rgba(194,163,90,.5)' : '#c2a35a', color: '#1a1206' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
                  در حال ورود...
                </span>
              ) : 'ورود به سیستم'}
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between mt-5 text-xs text-text-dim px-1">
          <span>نسخه ۱.۰.۰</span>
          <span>سامانه نظارت شهرداری تهران</span>
        </div>
      </div>
    </div>
  )
}
