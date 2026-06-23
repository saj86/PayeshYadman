'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { register, getRedirectPath } from '@/lib/auth'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(k: string) { return (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value })) }

  async function doRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) { setError('رمز عبور و تأیید آن یکسان نیستند'); return }
    if (form.password.length < 8) { setError('رمز عبور باید حداقل ۸ کاراکتر باشد'); return }
    setLoading(true)
    try {
      const data = await register(form.email.trim(), form.password, form.fullName.trim(), form.phone || undefined)
      router.push(getRedirectPath(data.user))
    } catch (e: any) {
      setError(e.message || 'خطا در ثبت‌نام')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'radial-gradient(ellipse 140% 80% at 50% -20%, rgba(194,163,90,.10) 0%, transparent 55%), #070d15' }}>
      <div className="absolute top-0 inset-x-0 h-[2px]" style={{ background: 'linear-gradient(90deg,transparent 0%,#c2a35a 40%,#c2a35a 60%,transparent 100%)' }} />

      <div className="w-full max-w-md px-6 fade-up">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="mb-4 w-16 h-16 rounded-full flex items-center justify-center border" style={{ borderColor: 'rgba(194,163,90,.4)', background: 'radial-gradient(circle, rgba(194,163,90,.12) 0%, rgba(194,163,90,.04) 100%)' }}>
            <svg width="32" height="32" viewBox="0 0 42 42" fill="none">
              <rect x="9" y="22" width="24" height="16" fill="#c2a35a" fillOpacity=".85" rx="1"/>
              <rect x="13" y="26" width="5" height="5" fill="#070d15" rx="0.5"/>
              <rect x="24" y="26" width="5" height="5" fill="#070d15" rx="0.5"/>
              <rect x="17" y="30" width="8" height="8" fill="#070d15" rx="0.5"/>
              <polygon points="5,22 21,8 37,22" fill="#c2a35a" fillOpacity=".6"/>
              <rect x="20" y="4" width="2" height="8" fill="#c2a35a"/>
              <rect x="22" y="4" width="7" height="5" fill="#56c48a" rx="0.5"/>
              <polyline points="23.5,6.5 25,8 27,5.5" stroke="#070d15" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </div>
          <div className="text-xs tracking-[0.2em] text-gold font-semibold mb-1 opacity-80">شهرداری تهران</div>
          <h1 className="text-xl font-black mb-1">ثبت‌نام شهروند</h1>
          <p className="text-xs text-text-muted">حساب کاربری شهروند ایجاد کنید</p>
        </div>

        <div className="rounded-2xl border border-border p-6" style={{ background: 'rgba(13,25,41,.7)', backdropFilter: 'blur(12px)' }}>
          <form onSubmit={doRegister} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 bg-red-dim border border-red/30 text-red text-sm rounded-xl px-4 py-3 leading-6">
                <span className="mt-0.5 shrink-0">⚠</span><span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">نام کامل <span className="text-red">*</span></label>
              <input required value={form.fullName} onChange={set('fullName')} placeholder="نام و نام خانوادگی" className="w-full px-4 py-3 rounded-xl bg-bg-dark border border-border text-sm focus:outline-none focus:border-gold/50" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">ایمیل <span className="text-red">*</span></label>
              <input required type="email" value={form.email} onChange={set('email')} placeholder="example@email.com" dir="ltr" className="w-full px-4 py-3 rounded-xl bg-bg-dark border border-border text-sm focus:outline-none focus:border-gold/50" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">شماره تماس <span className="text-text-dim">(اختیاری)</span></label>
              <input type="tel" value={form.phone} onChange={set('phone')} placeholder="۰۹..." className="w-full px-4 py-3 rounded-xl bg-bg-dark border border-border text-sm font-mono focus:outline-none focus:border-gold/50" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">رمز عبور <span className="text-red">*</span></label>
              <input required type="password" value={form.password} onChange={set('password')} placeholder="حداقل ۸ کاراکتر" dir="ltr" className="w-full px-4 py-3 rounded-xl bg-bg-dark border border-border text-sm focus:outline-none focus:border-gold/50" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">تأیید رمز عبور <span className="text-red">*</span></label>
              <input required type="password" value={form.confirm} onChange={set('confirm')} placeholder="تکرار رمز عبور" dir="ltr" className="w-full px-4 py-3 rounded-xl bg-bg-dark border border-border text-sm focus:outline-none focus:border-gold/50" />
            </div>

            <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-40 mt-2" style={{ background: '#c2a35a', color: '#1a1206' }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
                  در حال ثبت‌نام...
                </span>
              ) : 'ثبت‌نام'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <span className="text-xs text-text-muted">قبلاً ثبت‌نام کرده‌اید؟ </span>
            <button onClick={() => router.push('/')} className="text-xs text-gold hover:underline font-semibold">ورود به سیستم</button>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 text-xs text-text-dim px-1">
          <span>نسخه ۱.۰.۰</span>
          <span>سامانه نظارت شهرداری تهران</span>
        </div>
      </div>
    </div>
  )
}
