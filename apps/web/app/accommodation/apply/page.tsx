'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getStoredUser } from '@/lib/auth'
import api from '@/lib/api'

const CATEGORIES = [
  'هتل', 'مهمانسرا', 'خوابگاه', 'مرکز اسکان اضطراری', 'مجتمع مسکونی', 'سایر',
]

export default function AccommodationApplyPage() {
  const router = useRouter()
  const user = getStoredUser()
  const [regions, setRegions] = useState<any[]>([])
  const [form, setForm] = useState({
    name: '',
    address: '',
    regionId: '',
    capacity: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    description: '',
    category: '',
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/regions').then((r: any) => setRegions(Array.isArray(r) ? r : r?.data || [])).catch(() => {})
  }, [])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.name || !form.address || !form.regionId || !form.capacity || !form.contactName || !form.contactEmail) {
      setError('لطفاً تمام فیلدهای ضروری را تکمیل کنید')
      return
    }
    if (parseInt(form.capacity) < 1) {
      setError('ظرفیت باید عدد مثبت باشد')
      return
    }
    setLoading(true)
    try {
      const res: any = await api.post('/accommodation/applications', {
        ...form,
        capacity: parseInt(form.capacity),
      })
      setSubmitted(res.id)
    } catch (e: any) {
      setError(e.message || 'خطا در ارسال درخواست')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4" dir="rtl">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto text-4xl"
            style={{ background: 'rgba(86,196,138,.15)', border: '2px solid rgba(86,196,138,.4)' }}>
            ✓
          </div>
          <div>
            <h1 className="text-xl font-black mb-2" style={{ color: '#56c48a' }}>درخواست ثبت شد</h1>
            <p className="text-sm text-text-secondary leading-7">
              درخواست ثبت مکان اسکان شما با موفقیت ارسال شد و در صف بررسی قرار گرفت.
              پس از تأیید، ایمیل اطلاع‌رسانی دریافت خواهید کرد.
            </p>
          </div>
          <div className="bg-bg-card border border-border rounded-2xl p-4 text-right">
            <div className="text-xs text-text-muted mb-1">شناسه پیگیری</div>
            <div className="font-mono text-sm font-bold text-blue">{submitted.slice(-10).toUpperCase()}</div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => router.push('/')} className="flex-1 py-3 border border-border rounded-2xl text-sm text-text-muted">
              بازگشت به خانه
            </button>
            <button onClick={() => { setSubmitted(null); setForm({ name:'', address:'', regionId:'', capacity:'', contactName:'', contactEmail:'', contactPhone:'', description:'', category:'' }) }}
              className="flex-1 py-3 rounded-2xl text-sm font-bold" style={{ background: '#5aa9e6', color: '#0d1117' }}>
              درخواست جدید
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg" dir="rtl">
      <header className="sticky top-0 z-20 bg-bg-dark border-b border-border px-4 h-14 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-text-muted text-xl">←</button>
        <div>
          <div className="text-sm font-bold">ثبت مکان اسکان جدید</div>
          <div className="text-[11px] text-text-muted">درخواست معرفی مکان برای اسکان آسیب‌دیدگان</div>
        </div>
      </header>

      <form onSubmit={submit} className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {error && (
          <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(224,122,122,.12)', border: '1px solid rgba(224,122,122,.3)', color: '#e07a7a' }}>
            {error}
          </div>
        )}

        {/* Place info */}
        <div className="bg-bg-card border border-border rounded-2xl p-4 space-y-4">
          <div className="text-xs font-bold text-text-secondary pb-1 border-b border-border">مشخصات مکان</div>

          <div>
            <label className="block text-xs text-text-secondary mb-1.5">نام مکان <span className="text-red-400">*</span></label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="مثال: مجتمع مسکونی بهاران"
              className="w-full px-3 py-2.5 bg-bg-dark border border-border rounded-xl text-sm focus:outline-none focus:border-blue/50" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">منطقه <span className="text-red-400">*</span></label>
              <select value={form.regionId} onChange={e => set('regionId', e.target.value)}
                className="w-full px-3 py-2.5 bg-bg-dark border border-border rounded-xl text-sm focus:outline-none focus:border-blue/50 appearance-none">
                <option value="">انتخاب منطقه</option>
                {regions.map((r: any) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">ظرفیت (نفر) <span className="text-red-400">*</span></label>
              <input type="number" min="1" value={form.capacity} onChange={e => set('capacity', e.target.value)}
                placeholder="مثال: 50"
                className="w-full px-3 py-2.5 bg-bg-dark border border-border rounded-xl text-sm focus:outline-none focus:border-blue/50" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-secondary mb-1.5">نوع مکان</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button key={c} type="button" onClick={() => set('category', form.category === c ? '' : c)}
                  className="px-3 py-1.5 rounded-lg text-xs border transition-all"
                  style={form.category === c
                    ? { background: 'rgba(90,169,230,.2)', color: '#5aa9e6', borderColor: 'rgba(90,169,230,.5)' }
                    : { borderColor: 'rgba(255,255,255,.1)', color: '#7e93a8' }}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-secondary mb-1.5">آدرس کامل <span className="text-red-400">*</span></label>
            <textarea value={form.address} onChange={e => set('address', e.target.value)} rows={2}
              placeholder="آدرس دقیق مکان..."
              className="w-full px-3 py-2.5 bg-bg-dark border border-border rounded-xl text-sm focus:outline-none resize-none focus:border-blue/50" />
          </div>

          <div>
            <label className="block text-xs text-text-secondary mb-1.5">توضیحات تکمیلی</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
              placeholder="امکانات، شرایط خاص، محدودیت‌ها..."
              className="w-full px-3 py-2.5 bg-bg-dark border border-border rounded-xl text-sm focus:outline-none resize-none focus:border-blue/50" />
          </div>
        </div>

        {/* Contact info */}
        <div className="bg-bg-card border border-border rounded-2xl p-4 space-y-4">
          <div className="text-xs font-bold text-text-secondary pb-1 border-b border-border">اطلاعات مدیر / مسئول مکان</div>
          <p className="text-xs text-text-muted leading-6">پس از تأیید، یک حساب کاربری برای این ایمیل ایجاد می‌شود تا مدیریت مکان انجام شود.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">نام و نام‌خانوادگی <span className="text-red-400">*</span></label>
              <input value={form.contactName} onChange={e => set('contactName', e.target.value)}
                placeholder="نام مسئول مکان"
                className="w-full px-3 py-2.5 bg-bg-dark border border-border rounded-xl text-sm focus:outline-none focus:border-blue/50" />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">شماره تماس</label>
              <input value={form.contactPhone} onChange={e => set('contactPhone', e.target.value)}
                placeholder="09xxxxxxxxx" dir="ltr"
                className="w-full px-3 py-2.5 bg-bg-dark border border-border rounded-xl text-sm focus:outline-none focus:border-blue/50 text-left" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-secondary mb-1.5">ایمیل <span className="text-red-400">*</span></label>
            <input type="email" value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)}
              placeholder="manager@example.com" dir="ltr"
              className="w-full px-3 py-2.5 bg-bg-dark border border-border rounded-xl text-sm focus:outline-none focus:border-blue/50 text-left" />
          </div>
        </div>

        {/* Auth notice for guests */}
        {!user && (
          <div className="p-3 rounded-xl text-xs leading-6" style={{ background: 'rgba(90,169,230,.08)', border: '1px solid rgba(90,169,230,.2)', color: '#5aa9e6' }}>
            برای ثبت درخواست، ابتدا وارد حساب کاربری شوید یا ثبت‌نام کنید.
          </div>
        )}

        <button type="submit" disabled={loading || !user}
          className="w-full py-4 rounded-2xl text-base font-black transition-all disabled:opacity-50"
          style={{ background: loading ? 'rgba(90,169,230,.3)' : '#5aa9e6', color: '#0d1117' }}>
          {loading ? 'در حال ارسال...' : 'ارسال درخواست'}
        </button>

        <p className="text-center text-xs text-text-dim pb-4">
          درخواست پس از بررسی توسط کارشناسان تأیید می‌شود
        </p>
      </form>
    </div>
  )
}
