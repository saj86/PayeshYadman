'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { login, getRedirectPath } from '@/lib/auth'

const ROLES = [
  { key: 'hq@payesh.ir', short: 'ستاد', title: 'مسئول ستاد مرکزی', desc: 'داشبورد تحلیلی، نقشه عملیاتی، سلسله‌مراتب نظارتی، گزارش‌ها و مدیریت کل سیستم', scope: 'HQ | کامل', badgeBg: 'rgba(194,163,90,.18)', badgeColor: '#c2a35a' },
  { key: 'commander@payesh.ir', short: 'قرار', title: 'مسئول قرارگاه', desc: 'بررسی رکوردهای ثبت‌شده توسط ناحیه و ارجاع به بازرس یا تأیید مستقیم', scope: 'DISTRICT | متوسط', badgeBg: 'rgba(176,140,224,.18)', badgeColor: '#b08ce0' },
  { key: 'inspector@payesh.ir', short: 'بازرس', title: 'بازرس میدانی', desc: 'دریافت صف بازرسی، انجام بازرسی میدانی با چک‌لیست، تأیید یا بازدید مجدد', scope: 'INSPECTOR | محدود', badgeBg: 'rgba(90,169,230,.18)', badgeColor: '#5aa9e6' },
  { key: 'district@payesh.ir', short: 'ناحیه', title: 'مسئول ناحیه', desc: 'ثبت وضعیت خدمات در سطح ناحیه و ارسال به قرارگاه جهت بررسی', scope: 'DISTRICT | ثبت', badgeBg: 'rgba(86,196,138,.18)', badgeColor: '#56c48a' },
  { key: 'citizen@payesh.ir', short: 'شهر', title: 'شهروند', desc: 'ثبت گزارش شهری، درخواست اسکان، ثبت گمشده، گزارش اضطراری و پیگیری', scope: 'CITIZEN | عمومی', badgeBg: 'rgba(224,193,79,.18)', badgeColor: '#e0c14f' },
  { key: 'support@payesh.ir', short: 'پشتیبانی', title: 'پشتیبانی سیستم', desc: 'مدیریت کاربران، تیکت‌های پشتیبانی، بازنشانی رمز و مانیتورینگ سلامت سیستم', scope: 'SUPPORT | مدیریت', badgeBg: 'rgba(224,122,122,.18)', badgeColor: '#e07a7a' },
  { key: 'admin@payesh.ir', short: 'ادمین', title: 'مدیر کل سیستم', desc: 'دسترسی کامل به تمامی بخش‌ها، مدیریت نقش‌ها، منطقه‌ها، تنظیمات ارزیابی', scope: 'SUPER_ADMIN | کامل', badgeBg: 'rgba(255,255,255,.12)', badgeColor: '#e9eef4' },
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'cards' | 'form'>('cards')

  async function doLogin(emailVal: string, pw = 'Admin1234') {
    setLoading(true)
    setError('')
    try {
      const data = await login(emailVal, pw)
      router.push(getRedirectPath(data.user))
    } catch (e: any) {
      setError(e.message || 'خطا در ورود')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-10" style={{ background: 'radial-gradient(1100px 600px at 50% -10%,rgba(194,163,90,.10),transparent 60%),radial-gradient(900px 700px at 50% 120%,rgba(40,80,140,.12),transparent 55%),#070d15' }}>
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: 'linear-gradient(90deg,transparent,#c2a35a,transparent)' }} />

      <div className="w-full max-w-5xl fade-up">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-20 h-20 rounded-full border border-gold/50 flex items-center justify-center mb-5" style={{ background: 'repeating-linear-gradient(135deg,rgba(194,163,90,.12) 0 7px,transparent 7px 14px)' }}>
            <span className="text-[9px] text-gold font-bold font-mono leading-tight">آرم<br/>شهرداری</span>
          </div>
          <div className="text-xs tracking-widest text-gold font-semibold mb-3">شهرداری تهران &nbsp;•&nbsp; قرارگاه بازرسی و نظارت</div>
          <h1 className="text-4xl font-black mb-3" style={{ background: 'linear-gradient(180deg,#fff,#aebdcf)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            سامانهٔ یکپارچهٔ نظارت و پایش
          </h1>
          <p className="text-text-muted text-base max-w-lg leading-8">رصد لحظه‌ای خدمات شهری در آیین بدرقهٔ شهید — از سطح ناحیه تا منطقه و ستاد</p>
          <div className="flex gap-3 mt-4 text-sm">
            <span className="px-3 py-1.5 rounded-full border border-border text-text-secondary">۱۳ تا ۱۵ تیرماه ۱۴۰۵</span>
            <span className="px-3 py-1.5 rounded-full border border-gold/30 text-gold">#یالثارات_الحسین</span>
          </div>
        </div>

        {/* Tab toggle */}
        <div className="flex justify-center gap-2 mb-6">
          <button onClick={() => setMode('cards')} className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'cards' ? 'bg-gold/20 text-gold border border-gold/40' : 'text-text-muted border border-border'}`}>ورود نمایشی</button>
          <button onClick={() => setMode('form')} className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'form' ? 'bg-blue/20 text-blue border border-blue/40' : 'text-text-muted border border-border'}`}>ورود با حساب</button>
        </div>

        {mode === 'cards' ? (
          <>
            <p className="text-center text-sm text-text-muted mb-5">برای ورود نمایشی نقش خود را انتخاب کنید</p>
            <div className="grid grid-cols-3 gap-3">
              {ROLES.map(r => (
                <button
                  key={r.key}
                  onClick={() => doLogin(r.key)}
                  disabled={loading}
                  className="text-right p-5 rounded-2xl border border-border transition-all hover:-translate-y-1 disabled:opacity-50"
                  style={{ background: 'linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.015))' }}
                >
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm mb-3.5" style={{ background: r.badgeBg, color: r.badgeColor }}>{r.short}</div>
                  <div className="font-bold text-base mb-1.5">{r.title}</div>
                  <div className="text-xs text-text-muted leading-6 min-h-[72px]">{r.desc}</div>
                  <div className="text-[10px] font-semibold rounded-md px-2 py-1 mt-2 inline-block" style={{ background: r.badgeBg, color: r.badgeColor }}>سطح دسترسی: {r.scope}</div>
                  <div className="flex items-center gap-1.5 text-gold text-sm font-semibold mt-3">ورود نمایشی <span>←</span></div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="max-w-sm mx-auto bg-bg-card border border-border rounded-2xl p-7">
            <h2 className="text-lg font-bold mb-5">ورود به سامانه</h2>
            {error && <div className="bg-red-dim border border-red/30 text-red text-sm rounded-lg px-4 py-3 mb-4">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">ایمیل</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 bg-bg-dark border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-gold/50"
                  placeholder="email@payesh.ir"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">رمز عبور</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-bg-dark border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-gold/50"
                  placeholder="••••••••"
                  onKeyDown={e => e.key === 'Enter' && doLogin(email, password)}
                />
              </div>
              <button
                onClick={() => doLogin(email, password)}
                disabled={loading || !email || !password}
                className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                style={{ background: '#c2a35a', color: '#1a1206' }}
              >
                {loading ? 'در حال ورود...' : 'ورود به سامانه'}
              </button>
            </div>
            <p className="text-center text-xs text-text-dim mt-4">رمز پیش‌فرض: Admin1234</p>
          </div>
        )}

        <p className="text-center text-xs text-text-dim mt-8">نسخهٔ نمایشی — داده‌ها واقعی نیستند</p>
      </div>
    </div>
  )
}
