'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getStoredUser, logout, canAccess, getRedirectPath } from '@/lib/auth'
import api from '@/lib/api'

export default function DistrictPage() {
  const router = useRouter()
  const user = getStoredUser()
  const [locations, setLocations] = useState<any[]>([])
  const [checklists, setChecklists] = useState<any[]>([])
  const [form, setForm] = useState({ locationId: '', notes: '' })
  const [mySubmissions, setMySubmissions] = useState<any[]>([])
  const [tab, setTab] = useState<'submit' | 'history'>('submit')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!user) { router.replace('/'); return }
    if (!canAccess(user, 'DISTRICT')) { router.replace(getRedirectPath(user)); return }
    Promise.all([
      api.get('/inspections?limit=20'),
      api.get('/checklists'),
    ]).then(([ins, cl]) => {
      setMySubmissions(ins?.data || [])
      setChecklists(Array.isArray(cl) ? cl : [])
    }).catch(console.error)

    api.get('/inspection-locations').then((locs: any[]) => {
      setLocations(Array.isArray(locs) ? locs : [])
    }).catch(console.error)
  }, [])

  async function submitInspection(e: React.FormEvent) {
    e.preventDefault()
    if (!form.locationId) { alert('محل بازرسی را انتخاب کنید'); return }
    try {
      await api.post('/inspections', form)
      setSubmitted(true)
      setForm({ locationId: '', notes: '' })
      const ins = await api.get('/inspections?limit=20')
      setMySubmissions(ins?.data || [])
      setTimeout(() => setSubmitted(false), 3000)
    } catch (e: any) { alert(e.message) }
  }

  const statusLabels: Record<string, { label: string; color: string }> = {
    PENDING: { label: 'در انتظار', color: '#e0c14f' },
    COMMANDER_REVIEW: { label: 'نزد قرارگاه', color: '#b08ce0' },
    INSPECTOR_ASSIGNED: { label: 'ارجاع به بازرس', color: '#5aa9e6' },
    APPROVED: { label: 'تأیید شده', color: '#56c48a' },
    CONDITIONAL: { label: 'تأیید مشروط', color: '#e0c14f' },
    REJECTED: { label: 'رد شده', color: '#e07a7a' },
    REVISIT: { label: 'بازدید مجدد', color: '#5aa9e6' },
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="flex items-center justify-between px-5 h-14 border-b border-border sticky top-0 z-30 bg-bg-dark">
        <div>
          <div className="font-bold text-sm">پنل ناحیه — ثبت داده‌های میدانی</div>
          <div className="text-[11px] text-text-muted">{user?.fullName}</div>
        </div>
        <div className="flex gap-1 bg-white/[.03] p-1 rounded-xl border border-border">
          <button onClick={() => setTab('submit')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${tab === 'submit' ? 'bg-gold/20 text-gold' : 'text-text-muted'}`}>ثبت رکورد</button>
          <button onClick={() => setTab('history')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${tab === 'history' ? 'bg-gold/20 text-gold' : 'text-text-muted'}`}>سوابق ثبت</button>
        </div>
        <button onClick={() => { logout(); router.push('/') }} className="text-xs text-text-muted px-3 py-1.5 border border-border rounded-lg">خروج</button>
      </header>

      <div className="p-5 max-w-2xl mx-auto w-full fade-up">
        {tab === 'submit' && (
          <div className="bg-bg-card border border-border rounded-2xl p-6">
            <div className="text-base font-bold mb-1">ثبت وضعیت خدمات ناحیه</div>
            <div className="text-xs text-text-muted mb-5">داده‌ها پس از ثبت برای بررسی به قرارگاه ارسال می‌شوند</div>

            {submitted && (
              <div className="bg-green-dim border border-green/30 rounded-xl px-4 py-3 mb-4 text-sm text-green font-semibold">
                ✓ رکورد با موفقیت ثبت شد و به صف قرارگاه ارسال گردید
              </div>
            )}

            <form onSubmit={submitInspection} className="space-y-4">
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">محل بازرسی <span className="text-red">*</span></label>
                <select
                  value={form.locationId}
                  onChange={e => setForm(p => ({ ...p, locationId: e.target.value }))}
                  required
                  className="w-full px-3 py-2.5 bg-bg-dark border border-border rounded-xl text-sm focus:outline-none focus:border-gold/50">
                  <option value="">محل بازرسی را انتخاب کنید...</option>
                  {locations.map((loc: any) => (
                    <option key={loc.id} value={loc.id}>{loc.name}{loc.region ? ` — ${loc.region.name}` : ''}</option>
                  ))}
                </select>
                {locations.length === 0 && <p className="text-[11px] text-yellow mt-1">هیچ محلی ثبت نشده — از پنل ستاد محل‌ها را اضافه کنید</p>}
              </div>

              <div>
                <label className="block text-xs text-text-secondary mb-1.5">یادداشت‌های میدانی</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  rows={4}
                  placeholder="وضعیت جاری، مشکلات مشاهده‌شده، پیشنهادات..."
                  className="w-full px-3 py-2.5 bg-bg-dark border border-border rounded-xl text-sm focus:outline-none resize-none"
                />
              </div>

              {checklists.length > 0 && (
                <div className="bg-blue-dim border border-blue/20 rounded-xl p-3">
                  <div className="text-xs text-blue font-semibold mb-1">چک‌لیست موجود</div>
                  <div className="text-[11px] text-text-muted">{checklists[0].name} — پس از تأیید قرارگاه، بازرس چک‌لیست را تکمیل می‌کند</div>
                </div>
              )}

              <button type="submit" className="w-full py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90" style={{ background: '#c2a35a', color: '#1a1206' }}>
                ارسال به صف قرارگاه
              </button>
            </form>
          </div>
        )}

        {tab === 'history' && (
          <div>
            <div className="text-base font-bold mb-4">سوابق رکوردهای ثبت‌شده</div>
            {mySubmissions.length === 0 && (
              <div className="text-center text-text-muted py-12 border border-border rounded-2xl">هیچ رکوردی ثبت نشده است</div>
            )}
            <div className="space-y-3">
              {mySubmissions.map((s: any) => {
                const st = statusLabels[s.status] || statusLabels.PENDING
                return (
                  <div key={s.id} className="bg-bg-card border border-border rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="text-sm font-bold">{s.location?.name || 'محل نامشخص'}</div>
                        <div className="text-xs text-text-muted mt-0.5">{s.location?.region?.name} — {s.location?.category}</div>
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg flex-shrink-0" style={{ color: st.color, background: `${st.color}20` }}>{st.label}</span>
                    </div>
                    {s.notes && <div className="text-xs text-text-secondary bg-bg-dark/50 rounded-lg p-2 mb-2">{s.notes}</div>}
                    <div className="text-[11px] text-text-dim">
                      {new Date(s.createdAt).toLocaleString('fa-IR')}
                      {s.score != null && <span className="mr-3 text-gold font-semibold">امتیاز: {s.score}٪</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
