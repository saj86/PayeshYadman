'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getStoredUser, logout, canAccess, getRedirectPath } from '@/lib/auth'
import api from '@/lib/api'

const NAV = [
  { id: 'report', label: 'گزارش' },
  { id: 'accommodation', label: 'اسکان' },
  { id: 'lost', label: 'گمشده' },
  { id: 'emergency', label: 'اضطراری' },
  { id: 'track', label: 'پیگیری' },
]

const CATEGORIES = ['بهداشت و نظافت', 'ترافیک و حمل‌ونقل', 'آب و فاضلاب', 'پارک و فضای سبز', 'نور و برق', 'ساختمانی', 'سایر']

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING:      { label: 'در انتظار',       color: '#e0c14f' },
  UNDER_REVIEW: { label: 'در حال بررسی',    color: '#b08ce0' },
  ASSIGNED:     { label: 'ارجاع شده',       color: '#5aa9e6' },
  IN_PROGRESS:  { label: 'در پیگیری',       color: '#5aa9e6' },
  NEEDS_INFO:   { label: 'نیاز به اطلاعات', color: '#e0a450' },
  RESOLVED:     { label: 'حل شده',          color: '#56c48a' },
  REJECTED:     { label: 'رد شده',          color: '#e07a7a' },
  CLOSED:       { label: 'بسته شده',        color: '#56708c' },
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default function CitizenPage() {
  const router = useRouter()
  const user = getStoredUser()
  const [tab, setTab] = useState('report')
  const [reports, setReports] = useState<any[]>([])
  const [places, setPlaces] = useState<any[]>([])
  const [myAccReqs, setMyAccReqs] = useState<any[]>([])
  const [myLost, setMyLost] = useState<any[]>([])
  const [myEmergencies, setMyEmergencies] = useState<any[]>([])
  const [form, setForm] = useState({ category: 'بهداشت و نظافت', title: '', description: '', address: '' })
  const [accForm, setAccForm] = useState({ placeId: '', guestsCount: '1', nights: '1', notes: '' })
  const [lostForm, setLostForm] = useState({ name: '', age: '', description: '', lastSeenLocation: '', contactPhone: '' })
  const [emergencyForm, setEmergencyForm] = useState({ type: 'پزشکی', description: '' })
  const [notice, setNotice] = useState<{ msg: string; ok: boolean } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [submittingReport, setSubmittingReport] = useState(false)
  const [lastReportId, setLastReportId] = useState<string | null>(null)
  const [photos, setPhotos] = useState<File[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) { router.replace('/'); return }
    if (!canAccess(user, 'CITIZEN')) { router.replace(getRedirectPath(user)); return }
    loadAll()
  }, [])

  async function loadAll() {
    try {
      const [r, p, ar, lf, em] = await Promise.all([
        api.get('/reports'),
        api.get('/accommodation/places'),
        api.get('/accommodation/requests'),
        api.get('/lost-found'),
        api.get('/emergency'),
      ])
      setReports(r?.data || [])
      setPlaces(Array.isArray(p) ? p : [])
      setMyAccReqs(Array.isArray(ar) ? ar : [])
      setMyLost(Array.isArray(lf) ? lf : [])
      setMyEmergencies(Array.isArray(em) ? em : [])
    } catch (e) { console.error(e) }
  }

  async function submitReport(e: React.FormEvent) {
    e.preventDefault()
    setSubmittingReport(true)
    try {
      const res = await api.post('/reports', form)
      setLastReportId(res.id)

      if (photos.length > 0) {
        setUploading(true)
        const token = localStorage.getItem('accessToken')
        for (const file of photos) {
          const fd = new FormData()
          fd.append('file', file)
          await fetch(`${API_URL}/attachments/upload?entityType=CitizenReport&entityId=${res.id}`, {
            method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
          })
        }
        setUploading(false)
      }

      setNotice({ msg: 'گزارش شما با موفقیت ثبت شد', ok: true })
      setForm({ category: 'بهداشت و نظافت', title: '', description: '', address: '' })
      setPhotos([])
      const r = await api.get('/reports')
      setReports(r?.data || [])
    } catch (e: any) {
      setNotice({ msg: e.message || 'خطا در ثبت گزارش', ok: false })
    } finally {
      setSubmittingReport(false)
      setUploading(false)
    }
  }

  async function submitAccommodation(e: React.FormEvent) {
    e.preventDefault()
    try {
      await api.post('/accommodation/requests', { ...accForm, guestsCount: parseInt(accForm.guestsCount), nights: parseInt(accForm.nights) })
      setNotice({ msg: 'درخواست اسکان ثبت شد', ok: true })
      setAccForm({ placeId: '', guestsCount: '1', nights: '1', notes: '' })
    } catch (e: any) { setNotice({ msg: e.message, ok: false }) }
  }

  async function submitLost(e: React.FormEvent) {
    e.preventDefault()
    try {
      await api.post('/lost-found', { ...lostForm, age: parseInt(lostForm.age) || undefined, lastSeenAt: new Date().toISOString(), status: 'MISSING' })
      setNotice({ msg: 'فرد گمشده ثبت شد', ok: true })
      setLostForm({ name: '', age: '', description: '', lastSeenLocation: '', contactPhone: '' })
    } catch (e: any) { setNotice({ msg: e.message, ok: false }) }
  }

  async function submitEmergency(e: React.FormEvent) {
    e.preventDefault()
    try {
      await api.post('/emergency', { ...emergencyForm, priority: 'CRITICAL' })
      setNotice({ msg: 'گزارش اضطراری ارسال شد — تیم اضطراری در حال حرکت است', ok: true })
      setEmergencyForm({ type: 'پزشکی', description: '' })
    } catch (e: any) { setNotice({ msg: e.message, ok: false }) }
  }

  function onPhotoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).slice(0, 5)
    setPhotos(prev => [...prev, ...files].slice(0, 5))
    e.target.value = ''
  }

  const setF = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  if (!user) return null

  return (
    <div className="min-h-screen bg-bg" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-bg-dark border-b border-border px-4 h-14 flex items-center justify-between">
        <div>
          <div className="text-[10px] text-gold font-semibold">سامانه شهروند</div>
          <div className="text-base font-black">سلام، {user.fullName?.split(' ')[0] || 'شهروند'}</div>
        </div>
        <button onClick={() => { logout(); router.push('/') }}
          className="text-xs text-text-muted px-3 py-1.5 border border-border rounded-lg hover:border-white/20">
          خروج
        </button>
      </header>

      {/* Tab nav */}
      <div className="flex border-b border-border overflow-x-auto bg-bg-dark sticky top-14 z-10">
        {NAV.map(n => (
          <button key={n.id} onClick={() => setTab(n.id)}
            className={`flex-shrink-0 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${tab === n.id ? 'border-gold text-gold' : 'border-transparent text-text-muted hover:text-text-primary'}`}>
            {n.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-5">
        {notice && (
          <div className={`flex items-start gap-2 rounded-2xl px-4 py-3 mb-4 text-sm border ${notice.ok ? 'bg-green-dim border-green/30 text-green' : 'bg-red-dim border-red/30 text-red'}`}>
            <span className="mt-0.5">{notice.ok ? '✓' : '⚠'}</span>
            <span className="flex-1">{notice.msg}</span>
            <button onClick={() => setNotice(null)} className="text-current opacity-60">×</button>
          </div>
        )}

        {/* ── Report tab ── */}
        {tab === 'report' && (
          <form onSubmit={submitReport} className="space-y-4">
            <h2 className="text-base font-bold">ثبت گزارش شهری</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">دسته‌بندی <span className="text-red">*</span></label>
                <select value={form.category} onChange={setF('category')}
                  className="w-full px-3 py-2.5 bg-bg-card border border-border rounded-xl text-sm focus:outline-none focus:border-gold/50">
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">عنوان <span className="text-red">*</span></label>
                <input required value={form.title} onChange={setF('title')} placeholder="عنوان مشکل..."
                  className="w-full px-3 py-2.5 bg-bg-card border border-border rounded-xl text-sm focus:outline-none focus:border-gold/50" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-text-secondary mb-1.5">توضیحات <span className="text-red">*</span></label>
              <textarea required value={form.description} onChange={setF('description')} rows={4}
                placeholder="شرح دقیق مشکل..."
                className="w-full px-3 py-2.5 bg-bg-card border border-border rounded-xl text-sm focus:outline-none resize-none leading-6" />
            </div>

            <div>
              <label className="block text-xs text-text-secondary mb-1.5">آدرس</label>
              <input value={form.address} onChange={setF('address')} placeholder="آدرس دقیق..."
                className="w-full px-3 py-2.5 bg-bg-card border border-border rounded-xl text-sm focus:outline-none focus:border-gold/50" />
            </div>

            {/* Photo upload */}
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">تصاویر <span className="text-text-dim">(اختیاری — تا ۵ عکس)</span></label>
              <div className="flex items-center gap-2 flex-wrap">
                {photos.map((f, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-border group">
                    <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setPhotos(p => p.filter((_, j) => j !== i))}
                      className="absolute inset-0 bg-black/60 hidden group-hover:flex items-center justify-center text-white text-lg">
                      ×
                    </button>
                  </div>
                ))}
                {photos.length < 5 && (
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="w-16 h-16 rounded-xl border-2 border-dashed border-border text-text-muted hover:border-gold/50 hover:text-gold flex items-center justify-center text-2xl transition-all">
                    +
                  </button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onPhotoPick} />
            </div>

            <button type="submit" disabled={submittingReport || uploading}
              className="w-full py-3 rounded-2xl font-bold text-sm transition-all disabled:opacity-40"
              style={{ background: '#c2a35a', color: '#1a1206' }}>
              {uploading ? 'در حال آپلود تصاویر...' : submittingReport ? 'در حال ثبت...' : 'ثبت گزارش'}
            </button>
          </form>
        )}

        {/* ── Accommodation tab ── */}
        {tab === 'accommodation' && (
          <div className="space-y-5">
            <h2 className="text-base font-bold">درخواست اسکان</h2>
            <form onSubmit={submitAccommodation} className="space-y-4">
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">مکان اسکان <span className="text-red">*</span></label>
                <select required value={accForm.placeId} onChange={e => setAccForm(p => ({ ...p, placeId: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-bg-card border border-border rounded-xl text-sm focus:outline-none">
                  <option value="">انتخاب کنید...</option>
                  {places.map(pl => (
                    <option key={pl.id} value={pl.id}>
                      {pl.name} — ظرفیت آزاد: {pl.capacity - pl.currentOccupancy}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-text-secondary mb-1.5">تعداد نفر</label>
                  <input type="number" min={1} value={accForm.guestsCount} onChange={e => setAccForm(p => ({ ...p, guestsCount: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-bg-card border border-border rounded-xl text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1.5">تعداد شب</label>
                  <input type="number" min={1} value={accForm.nights} onChange={e => setAccForm(p => ({ ...p, nights: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-bg-card border border-border rounded-xl text-sm focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">توضیحات</label>
                <textarea value={accForm.notes} onChange={e => setAccForm(p => ({ ...p, notes: e.target.value }))} rows={2}
                  className="w-full px-3 py-2.5 bg-bg-card border border-border rounded-xl text-sm focus:outline-none resize-none" />
              </div>
              <button type="submit" className="w-full py-3 rounded-2xl font-bold text-sm" style={{ background: '#5aa9e6', color: '#070d15' }}>
                ارسال درخواست اسکان
              </button>
            </form>

            <div className="border-t border-border pt-4">
              <p className="text-xs text-text-muted mb-3">می‌خواهید مکانی را برای اسکان ثبت کنید؟</p>
              <button onClick={() => router.push('/accommodation/apply')}
                className="w-full py-2.5 rounded-xl text-sm font-semibold border border-border text-text-secondary hover:border-gold/40 hover:text-gold transition-all">
                ثبت مکان اسکان جدید
              </button>
            </div>
          </div>
        )}

        {/* ── Lost & Found tab ── */}
        {tab === 'lost' && (
          <form onSubmit={submitLost} className="space-y-4">
            <h2 className="text-base font-bold">ثبت فرد گمشده</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">نام فرد <span className="text-red">*</span></label>
                <input required value={lostForm.name} onChange={e => setLostForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-bg-card border border-border rounded-xl text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">سن تقریبی</label>
                <input value={lostForm.age} onChange={e => setLostForm(p => ({ ...p, age: e.target.value }))} placeholder="مثلاً ۸"
                  className="w-full px-3 py-2.5 bg-bg-card border border-border rounded-xl text-sm focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">مشخصات ظاهری <span className="text-red">*</span></label>
              <textarea required value={lostForm.description} onChange={e => setLostForm(p => ({ ...p, description: e.target.value }))}
                rows={3} placeholder="رنگ لباس، موی سر، نشانه‌های مشخص..."
                className="w-full px-3 py-2.5 bg-bg-card border border-border rounded-xl text-sm focus:outline-none resize-none" />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">آخرین محل مشاهده <span className="text-red">*</span></label>
              <input required value={lostForm.lastSeenLocation} onChange={e => setLostForm(p => ({ ...p, lastSeenLocation: e.target.value }))}
                className="w-full px-3 py-2.5 bg-bg-card border border-border rounded-xl text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">شماره تماس</label>
              <input type="tel" value={lostForm.contactPhone} onChange={e => setLostForm(p => ({ ...p, contactPhone: e.target.value }))}
                className="w-full px-3 py-2.5 bg-bg-card border border-border rounded-xl text-sm font-mono focus:outline-none" />
            </div>
            <button type="submit" className="w-full py-3 rounded-2xl font-bold text-sm" style={{ background: '#e0c14f', color: '#1a1206' }}>
              ثبت در سامانهٔ گمشدگان
            </button>
          </form>
        )}

        {/* ── Emergency tab ── */}
        {tab === 'emergency' && (
          <form onSubmit={submitEmergency} className="space-y-4">
            <div className="text-center py-6">
              <div className="w-20 h-20 rounded-full bg-red-dim border-2 border-red/50 flex items-center justify-center text-4xl mx-auto mb-3 animate-pulse">🚨</div>
              <h2 className="text-base font-bold text-red">گزارش اضطراری</h2>
              <p className="text-xs text-text-muted mt-1">تنها در شرایط اضطراری واقعی استفاده کنید</p>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">نوع اضطرار</label>
              <select value={emergencyForm.type} onChange={e => setEmergencyForm(p => ({ ...p, type: e.target.value }))}
                className="w-full px-3 py-2.5 bg-bg-card border border-red/30 rounded-xl text-sm focus:outline-none">
                <option>پزشکی</option><option>آتش‌سوزی</option><option>ازدحام خطرناک</option><option>تصادف</option><option>سایر</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">توضیحات <span className="text-red">*</span></label>
              <textarea required value={emergencyForm.description} onChange={e => setEmergencyForm(p => ({ ...p, description: e.target.value }))}
                rows={4} placeholder="شرح دقیق وضعیت اضطراری..."
                className="w-full px-3 py-2.5 bg-bg-card border border-red/30 rounded-xl text-sm focus:outline-none resize-none" />
            </div>
            <button type="submit" className="w-full py-4 rounded-2xl font-black text-base" style={{ background: '#e07a7a', color: '#fff' }}>
              🚨 ارسال گزارش اضطراری
            </button>
          </form>
        )}

        {/* ── Track tab ── */}
        {tab === 'track' && (
          <div>
            <h2 className="text-base font-bold mb-4">پیگیری درخواست‌های من</h2>

            {reports.length > 0 && (
              <div className="mb-5">
                <div className="text-xs text-text-dim font-semibold mb-2">گزارش‌های شهری ({reports.length})</div>
                <div className="space-y-2">
                  {reports.map((r: any) => {
                    const s = STATUS_MAP[r.status] || STATUS_MAP.PENDING
                    return (
                      <div key={r.id} className="bg-bg-card border border-border rounded-2xl p-3.5">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="text-sm font-bold">{r.title}</div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0" style={{ color: s.color, background: `${s.color}20` }}>{s.label}</span>
                        </div>
                        <div className="text-[11px] text-text-dim">{r.category} • {new Date(r.createdAt).toLocaleDateString('fa-IR')}</div>
                        {r.status === 'NEEDS_INFO' && (
                          <div className="mt-2 text-xs bg-orange/10 text-orange border border-orange/30 rounded-lg px-2 py-1.5">
                            ⚠ کارشناس اطلاعات بیشتری نیاز دارد. لطفاً با پشتیبانی تماس بگیرید.
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {myAccReqs.length > 0 && (
              <div className="mb-5">
                <div className="text-xs text-text-dim font-semibold mb-2">درخواست‌های اسکان ({myAccReqs.length})</div>
                <div className="space-y-2">
                  {myAccReqs.map((r: any) => {
                    const colors: Record<string, string> = { PENDING: '#e0c14f', APPROVED: '#56c48a', REJECTED: '#e07a7a', COMPLETED: '#56708c', CANCELLED: '#56708c' }
                    const labels: Record<string, string> = { PENDING: 'در انتظار', APPROVED: 'تأیید شده', REJECTED: 'رد شده', COMPLETED: 'اتمام', CANCELLED: 'لغو شده' }
                    const c = colors[r.status] || '#e0c14f'
                    return (
                      <div key={r.id} className="bg-bg-card border border-border rounded-2xl p-3.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-bold">{r.place?.name}</div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ color: c, background: `${c}20` }}>{labels[r.status] || r.status}</span>
                        </div>
                        <div className="text-[11px] text-text-dim mt-1">{r.guestsCount} نفر • {r.nights} شب • {new Date(r.createdAt).toLocaleDateString('fa-IR')}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {myLost.length > 0 && (
              <div className="mb-5">
                <div className="text-xs text-text-dim font-semibold mb-2">گمشدگان ثبت‌شده ({myLost.length})</div>
                <div className="space-y-2">
                  {myLost.map((m: any) => (
                    <div key={m.id} className="bg-bg-card border border-border rounded-2xl p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-bold">{m.name}</div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ color: m.status === 'FOUND' ? '#56c48a' : '#e07a7a', background: m.status === 'FOUND' ? '#56c48a20' : '#e07a7a20' }}>
                          {m.status === 'FOUND' ? 'پیدا شده' : 'گمشده'}
                        </span>
                      </div>
                      <div className="text-[11px] text-text-dim mt-1">{m.lastSeenLocation} • {new Date(m.createdAt).toLocaleDateString('fa-IR')}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {myEmergencies.length > 0 && (
              <div className="mb-5">
                <div className="text-xs text-text-dim font-semibold mb-2">گزارش‌های اضطراری ({myEmergencies.length})</div>
                <div className="space-y-2">
                  {myEmergencies.map((em: any) => (
                    <div key={em.id} className="bg-bg-card border border-red/20 rounded-2xl p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-bold text-red">{em.type}</div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ color: em.status === 'RESOLVED' ? '#56c48a' : '#e07a7a', background: em.status === 'RESOLVED' ? '#56c48a20' : '#e07a7a20' }}>
                          {em.status === 'RESOLVED' ? 'حل شده' : 'در پیگیری'}
                        </span>
                      </div>
                      <div className="text-[11px] text-text-dim mt-1 leading-5">{em.description?.slice(0, 80)}{em.description?.length > 80 ? '...' : ''}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reports.length === 0 && myAccReqs.length === 0 && myLost.length === 0 && myEmergencies.length === 0 && (
              <div className="text-center text-text-muted text-sm py-12 border border-border rounded-2xl">
                هیچ موردی ثبت نکرده‌اید
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
