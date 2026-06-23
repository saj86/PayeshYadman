'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getStoredUser, logout, canAccess, getRedirectPath } from '@/lib/auth'
import api from '@/lib/api'

const NAV = [
  { id: 'report', icon: '📋', label: 'گزارش' },
  { id: 'accommodation', icon: '🏠', label: 'اسکان' },
  { id: 'lost', icon: '🔍', label: 'گمشده' },
  { id: 'emergency', icon: '🚨', label: 'اضطراری' },
  { id: 'track', icon: '📍', label: 'پیگیری' },
]

const CATEGORIES = ['بهداشت و نظافت', 'ترافیک و حمل‌ونقل', 'آب و فاضلاب', 'پارک و فضای سبز', 'نور و برق', 'ساختمانی', 'سایر']

export default function CitizenPage() {
  const router = useRouter()
  const user = getStoredUser()
  const [tab, setTab] = useState('report')
  const [reports, setReports] = useState<any[]>([])
  const [places, setPlaces] = useState<any[]>([])
  const [form, setForm] = useState({ category: 'بهداشت و نظافت', title: '', description: '', address: '' })
  const [accForm, setAccForm] = useState({ placeId: '', guestsCount: '1', nights: '1', notes: '' })
  const [lostForm, setLostForm] = useState({ name: '', age: '', description: '', lastSeenLocation: '', contactPhone: '' })
  const [emergencyForm, setEmergencyForm] = useState({ type: 'پزشکی', description: '' })
  const [submitted, setSubmitted] = useState('')
  const [myAccReqs, setMyAccReqs] = useState<any[]>([])
  const [myLost, setMyLost] = useState<any[]>([])
  const [myEmergencies, setMyEmergencies] = useState<any[]>([])

  useEffect(() => {
    if (!user) { router.replace('/'); return }
    if (!canAccess(user, 'CITIZEN')) { router.replace(getRedirectPath(user)); return }
    Promise.all([
      api.get('/reports'),
      api.get('/accommodation/places'),
      api.get('/accommodation/requests'),
      api.get('/lost-found'),
      api.get('/emergency'),
    ]).then(([r, p, ar, lf, em]) => {
      setReports(r?.data || [])
      setPlaces(Array.isArray(p) ? p : [])
      setMyAccReqs(Array.isArray(ar) ? ar : [])
      setMyLost(Array.isArray(lf) ? lf : [])
      setMyEmergencies(Array.isArray(em) ? em : [])
    }).catch(console.error)
  }, [])

  async function submitReport(e: React.FormEvent) {
    e.preventDefault()
    try {
      await api.post('/reports', form)
      setSubmitted('گزارش شما با موفقیت ثبت شد')
      setForm({ category: 'بهداشت و نظافت', title: '', description: '', address: '' })
      const r = await api.get('/reports')
      setReports(r?.data || [])
    } catch (e: any) { alert(e.message) }
  }

  async function submitAccommodation(e: React.FormEvent) {
    e.preventDefault()
    try {
      await api.post('/accommodation/requests', { ...accForm, guestsCount: parseInt(accForm.guestsCount), nights: parseInt(accForm.nights) })
      setSubmitted('درخواست اسکان ثبت شد')
    } catch (e: any) { alert(e.message) }
  }

  async function submitLost(e: React.FormEvent) {
    e.preventDefault()
    try {
      await api.post('/lost-found', { ...lostForm, age: parseInt(lostForm.age) || undefined, lastSeenAt: new Date().toISOString(), status: 'MISSING' })
      setSubmitted('فرد گمشده ثبت شد')
    } catch (e: any) { alert(e.message) }
  }

  async function submitEmergency(e: React.FormEvent) {
    e.preventDefault()
    try {
      await api.post('/emergency', { ...emergencyForm, priority: 'CRITICAL' })
      setSubmitted('گزارش اضطراری ارسال شد — تیم اضطراری در حال حرکت است')
    } catch (e: any) { alert(e.message) }
  }

  const statusColors: Record<string, { color: string; label: string }> = {
    PENDING: { color: '#e0c14f', label: 'در انتظار' },
    ASSIGNED: { color: '#5aa9e6', label: 'ارجاع داده شده' },
    IN_PROGRESS: { color: '#b08ce0', label: 'در حال بررسی' },
    RESOLVED: { color: '#56c48a', label: 'حل شده' },
    CLOSED: { color: '#56708c', label: 'بسته شده' },
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6" style={{ background: 'radial-gradient(600px 400px at 50% 0%,rgba(194,163,90,.07),transparent),#070d15' }}>
      <div className="w-[390px] bg-bg-dark rounded-[46px] overflow-hidden flex flex-col shadow-2xl" style={{ height: '844px', border: '9px solid #161f2c' }}>
        <div className="h-8 flex items-center justify-center flex-shrink-0">
          <div className="w-28 h-6 bg-[#161f2c] rounded-b-2xl" />
        </div>

        {/* Header */}
        <div className="px-5 pb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] text-gold font-semibold">اپ شهروند</div>
              <div className="text-lg font-black">سلام، {user?.fullName?.split(' ')[0] || 'شهروند'} 👋</div>
            </div>
            <button onClick={() => { logout(); router.push('/') }} className="w-9 h-9 rounded-full bg-white/[.06] flex items-center justify-center text-text-muted text-sm">خروج</button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-2">
          {submitted && (
            <div className="bg-green-dim border border-green/30 rounded-xl px-4 py-3 mb-3 text-xs text-green font-semibold flex items-center justify-between">
              {submitted}
              <button onClick={() => setSubmitted('')} className="text-text-muted ml-2">×</button>
            </div>
          )}

          {tab === 'report' && (
            <form onSubmit={submitReport} className="space-y-3">
              <h2 className="text-sm font-bold">ثبت گزارش شهری</h2>
              <div>
                <label className="block text-xs text-text-secondary mb-1">دسته‌بندی</label>
                <select value={form.category} onChange={e => setForm(p => ({...p, category: e.target.value}))} className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm focus:outline-none">
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">عنوان</label>
                <input required value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} placeholder="عنوان مشکل..." className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm focus:outline-none focus:border-gold/50" />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">توضیحات</label>
                <textarea required value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} rows={3} placeholder="شرح دقیق مشکل..." className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm focus:outline-none resize-none" />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">آدرس</label>
                <input value={form.address} onChange={e => setForm(p => ({...p, address: e.target.value}))} placeholder="آدرس دقیق..." className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm focus:outline-none focus:border-gold/50" />
              </div>
              <button type="submit" className="w-full py-3 rounded-xl font-bold text-sm" style={{ background: '#c2a35a', color: '#1a1206' }}>ثبت گزارش</button>
            </form>
          )}

          {tab === 'accommodation' && (
            <form onSubmit={submitAccommodation} className="space-y-3">
              <h2 className="text-sm font-bold">درخواست اسکان</h2>
              <div>
                <label className="block text-xs text-text-secondary mb-1">مکان اسکان</label>
                <select value={accForm.placeId} onChange={e => setAccForm(p => ({...p, placeId: e.target.value}))} className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm focus:outline-none" required>
                  <option value="">انتخاب کنید...</option>
                  {places.map(pl => <option key={pl.id} value={pl.id}>{pl.name} (ظرفیت: {pl.capacity - pl.currentOccupancy})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-secondary mb-1">تعداد نفر</label>
                  <input type="number" min={1} value={accForm.guestsCount} onChange={e => setAccForm(p => ({...p, guestsCount: e.target.value}))} className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">تعداد شب</label>
                  <input type="number" min={1} value={accForm.nights} onChange={e => setAccForm(p => ({...p, nights: e.target.value}))} className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">توضیحات (اختیاری)</label>
                <textarea value={accForm.notes} onChange={e => setAccForm(p => ({...p, notes: e.target.value}))} rows={2} className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm focus:outline-none resize-none" />
              </div>
              <button type="submit" className="w-full py-3 rounded-xl font-bold text-sm" style={{ background: '#5aa9e6', color: '#070d15' }}>ارسال درخواست اسکان</button>
            </form>
          )}

          {tab === 'lost' && (
            <form onSubmit={submitLost} className="space-y-3">
              <h2 className="text-sm font-bold">ثبت فرد گمشده</h2>
              <div>
                <label className="block text-xs text-text-secondary mb-1">نام فرد</label>
                <input required value={lostForm.name} onChange={e => setLostForm(p => ({...p, name: e.target.value}))} className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm focus:outline-none focus:border-gold/50" />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">سن (تقریبی)</label>
                <input value={lostForm.age} onChange={e => setLostForm(p => ({...p, age: e.target.value}))} placeholder="مثلاً ۸" className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">مشخصات ظاهری</label>
                <textarea required value={lostForm.description} onChange={e => setLostForm(p => ({...p, description: e.target.value}))} rows={2} placeholder="رنگ لباس، موی سر..." className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm focus:outline-none resize-none" />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">آخرین محل مشاهده</label>
                <input required value={lostForm.lastSeenLocation} onChange={e => setLostForm(p => ({...p, lastSeenLocation: e.target.value}))} className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm focus:outline-none focus:border-gold/50" />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">شماره تماس</label>
                <input type="tel" value={lostForm.contactPhone} onChange={e => setLostForm(p => ({...p, contactPhone: e.target.value}))} className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm font-mono focus:outline-none" />
              </div>
              <button type="submit" className="w-full py-3 rounded-xl font-bold text-sm" style={{ background: '#e0c14f', color: '#1a1206' }}>ثبت در سامانهٔ گمشدگان</button>
            </form>
          )}

          {tab === 'emergency' && (
            <form onSubmit={submitEmergency} className="space-y-4">
              <div className="text-center py-4">
                <div className="w-20 h-20 rounded-full bg-red-dim border-2 border-red/50 flex items-center justify-center text-4xl mx-auto mb-3 animate-pulse">🚨</div>
                <h2 className="text-base font-bold text-red">گزارش اضطراری</h2>
                <p className="text-xs text-text-muted mt-1">تنها در شرایط اضطراری واقعی استفاده کنید</p>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">نوع اضطرار</label>
                <select value={emergencyForm.type} onChange={e => setEmergencyForm(p => ({...p, type: e.target.value}))} className="w-full px-3 py-2 bg-bg border border-red/30 rounded-xl text-sm focus:outline-none">
                  <option>پزشکی</option><option>آتش‌سوزی</option><option>ازدحام خطرناک</option><option>تصادف</option><option>سایر</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">توضیحات</label>
                <textarea required value={emergencyForm.description} onChange={e => setEmergencyForm(p => ({...p, description: e.target.value}))} rows={3} placeholder="شرح دقیق وضعیت اضطراری..." className="w-full px-3 py-2 bg-bg border border-red/30 rounded-xl text-sm focus:outline-none resize-none" />
              </div>
              <button type="submit" className="w-full py-4 rounded-2xl font-black text-base" style={{ background: '#e07a7a', color: '#fff' }}>🚨 ارسال گزارش اضطراری</button>
            </form>
          )}

          {tab === 'track' && (
            <div>
              <h2 className="text-sm font-bold mb-3">پیگیری درخواست‌های من</h2>

              {reports.length > 0 && (
                <div className="mb-3">
                  <div className="text-[11px] text-text-dim font-semibold mb-2 px-1">گزارش‌های شهری ({reports.length})</div>
                  {reports.map((r: any) => {
                    const s = statusColors[r.status] || statusColors.PENDING
                    return (
                      <div key={r.id} className="bg-bg-card border border-border rounded-2xl p-3.5 mb-2">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="text-xs font-bold leading-5">{r.title}</div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0" style={{ color: s.color, background: `${s.color}20` }}>{s.label}</span>
                        </div>
                        <div className="text-[11px] text-text-dim">{r.category} • {new Date(r.createdAt).toLocaleDateString('fa-IR')}</div>
                      </div>
                    )
                  })}
                </div>
              )}

              {myAccReqs.length > 0 && (
                <div className="mb-3">
                  <div className="text-[11px] text-text-dim font-semibold mb-2 px-1">درخواست‌های اسکان ({myAccReqs.length})</div>
                  {myAccReqs.map((r: any) => {
                    const colors: Record<string, string> = { PENDING: '#e0c14f', APPROVED: '#56c48a', REJECTED: '#e07a7a', COMPLETED: '#56708c' }
                    const labels: Record<string, string> = { PENDING: 'در انتظار', APPROVED: 'تأیید شده', REJECTED: 'رد شده', COMPLETED: 'اتمام' }
                    const c = colors[r.status] || '#e0c14f'
                    return (
                      <div key={r.id} className="bg-bg-card border border-border rounded-2xl p-3.5 mb-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs font-bold">{r.place?.name || 'مکان اسکان'}</div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ color: c, background: `${c}20` }}>{labels[r.status] || r.status}</span>
                        </div>
                        <div className="text-[11px] text-text-dim mt-1">{r.guestsCount} نفر • {r.nights} شب • {new Date(r.createdAt).toLocaleDateString('fa-IR')}</div>
                      </div>
                    )
                  })}
                </div>
              )}

              {myLost.length > 0 && (
                <div className="mb-3">
                  <div className="text-[11px] text-text-dim font-semibold mb-2 px-1">گمشدگان ثبت‌شده ({myLost.length})</div>
                  {myLost.map((m: any) => (
                    <div key={m.id} className="bg-bg-card border border-border rounded-2xl p-3.5 mb-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-bold">{m.name}</div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ color: m.status === 'FOUND' ? '#56c48a' : '#e07a7a', background: m.status === 'FOUND' ? '#56c48a20' : '#e07a7a20' }}>{m.status === 'FOUND' ? 'پیدا شده' : 'گمشده'}</span>
                      </div>
                      <div className="text-[11px] text-text-dim mt-1">{m.lastSeenLocation} • {new Date(m.createdAt).toLocaleDateString('fa-IR')}</div>
                    </div>
                  ))}
                </div>
              )}

              {myEmergencies.length > 0 && (
                <div className="mb-3">
                  <div className="text-[11px] text-text-dim font-semibold mb-2 px-1">گزارش‌های اضطراری ({myEmergencies.length})</div>
                  {myEmergencies.map((em: any) => (
                    <div key={em.id} className="bg-bg-card border border-red/20 rounded-2xl p-3.5 mb-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-bold text-red">{em.type}</div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ color: em.status === 'RESOLVED' ? '#56c48a' : '#e07a7a', background: em.status === 'RESOLVED' ? '#56c48a20' : '#e07a7a20' }}>{em.status === 'RESOLVED' ? 'حل شده' : 'در پیگیری'}</span>
                      </div>
                      <div className="text-[11px] text-text-dim mt-1 leading-5">{em.description?.slice(0, 60)}{em.description?.length > 60 ? '...' : ''}</div>
                    </div>
                  ))}
                </div>
              )}

              {reports.length === 0 && myAccReqs.length === 0 && myLost.length === 0 && myEmergencies.length === 0 && (
                <div className="text-center text-text-muted text-sm py-8">هیچ موردی ثبت نکرده‌اید</div>
              )}
            </div>
          )}
        </div>

        {/* Bottom nav */}
        <div className="flex border-t border-border flex-shrink-0">
          {NAV.map(n => (
            <button key={n.id} onClick={() => setTab(n.id)} className="flex-1 py-3 flex flex-col items-center gap-1 transition-all" style={{ color: tab === n.id ? '#c2a35a' : '#7e93a8' }}>
              <span className="text-base">{n.icon}</span>
              <span className="text-[9px] font-semibold">{n.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
