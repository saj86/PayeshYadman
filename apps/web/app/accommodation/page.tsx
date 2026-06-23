'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getStoredUser, logout, canAccess, getRedirectPath } from '@/lib/auth'
import api from '@/lib/api'

const STATUS_TABS = [
  { id: 'PENDING',   label: 'درخواست‌های جدید', color: '#e0c14f' },
  { id: 'APPROVED',  label: 'تأیید شده',          color: '#56c48a' },
  { id: 'REJECTED',  label: 'رد شده',              color: '#e07a7a' },
  { id: 'COMPLETED', label: 'اتمام یافته',         color: '#56708c' },
]

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING:   { label: 'در انتظار',    color: '#e0c14f' },
  APPROVED:  { label: 'تأیید شده',   color: '#56c48a' },
  REJECTED:  { label: 'رد شده',       color: '#e07a7a' },
  CANCELLED: { label: 'لغو شده',      color: '#56708c' },
  COMPLETED: { label: 'اتمام یافته', color: '#5aa9e6' },
}

export default function AccommodationManagerPage() {
  const router = useRouter()
  const user = getStoredUser()
  const [tab, setTab] = useState('PENDING')
  const [place, setPlace] = useState<any>(null)
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { router.replace('/'); return }
    if (!canAccess(user, 'ACCOMMODATION')) { router.replace(getRedirectPath(user)); return }
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [placeRes, reqRes] = await Promise.all([
        api.get('/accommodation/my-place'),
        api.get('/accommodation/requests'),
      ])
      setPlace(placeRes)
      setRequests(Array.isArray(reqRes) ? reqRes : [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function updateStatus(id: string, status: string) {
    try {
      await api.put(`/accommodation/requests/${id}/status`, { status })
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    } catch (e: any) { alert(e.message) }
  }

  const filteredRequests = requests.filter(r => r.status === tab)
  const pendingCount = requests.filter(r => r.status === 'PENDING').length

  if (!user) return null

  const occupancyPct = place ? Math.round((place.currentOccupancy / place.capacity) * 100) : 0
  const available = place ? place.capacity - place.currentOccupancy : 0

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="flex items-center justify-between px-5 h-14 border-b border-border sticky top-0 z-30 bg-bg-dark">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg border flex items-center justify-center text-sm" style={{ borderColor: '#56c48a44', color: '#56c48a' }}>🏠</div>
          <div>
            <div className="font-bold text-sm">مدیریت اسکان</div>
            <div className="text-[11px] text-text-muted">{user.fullName}</div>
          </div>
        </div>

        <div className="flex gap-1 bg-white/[.03] p-1 rounded-xl border border-border">
          {STATUS_TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative ${tab === t.id ? 'text-bg' : 'text-text-muted hover:text-text-primary'}`}
              style={tab === t.id ? { background: t.color } : {}}>
              {t.label}
              {t.id === 'PENDING' && pendingCount > 0 && (
                <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-red text-[9px] text-white flex items-center justify-center font-bold">{pendingCount}</span>
              )}
            </button>
          ))}
        </div>

        <button onClick={() => { logout(); router.push('/') }} className="text-xs text-text-muted px-3 py-1.5 border border-border rounded-lg">خروج</button>
      </header>

      <div className="p-5 fade-up">
        {/* Place info card */}
        {place && (
          <div className="bg-bg-card border border-border rounded-2xl p-5 mb-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="text-base font-bold mb-1">{place.name}</div>
                <div className="text-xs text-text-muted mb-3">{place.address} — {place.region?.name}</div>
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-xs text-text-dim mb-1">ظرفیت کل</div>
                    <div className="text-xl font-black text-text-primary">{place.capacity.toLocaleString('fa-IR')}</div>
                  </div>
                  <div>
                    <div className="text-xs text-text-dim mb-1">اشغال فعلی</div>
                    <div className="text-xl font-black text-yellow">{place.currentOccupancy.toLocaleString('fa-IR')}</div>
                  </div>
                  <div>
                    <div className="text-xs text-text-dim mb-1">ظرفیت خالی</div>
                    <div className="text-xl font-black text-green">{available.toLocaleString('fa-IR')}</div>
                  </div>
                  <div>
                    <div className="text-xs text-text-dim mb-1">درصد اشغال</div>
                    <div className="text-xl font-black" style={{ color: occupancyPct > 85 ? '#e07a7a' : occupancyPct > 60 ? '#e0c14f' : '#56c48a' }}>{occupancyPct}٪</div>
                  </div>
                </div>
              </div>

              <div className="w-32 flex-shrink-0">
                <div className="text-xs text-text-dim mb-2 text-center">اشغال</div>
                <div className="h-2 bg-white/[.07] rounded-full overflow-hidden mb-1">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${occupancyPct}%`, background: occupancyPct > 85 ? '#e07a7a' : occupancyPct > 60 ? '#e0c14f' : '#56c48a' }} />
                </div>
                <div className="text-[10px] text-text-dim text-center">{occupancyPct}٪ پر</div>
                {place.contactPhone && (
                  <div className="text-[11px] text-text-muted text-center mt-2 font-mono">{place.contactPhone}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {!place && !loading && (
          <div className="bg-yellow-dim border border-yellow/30 rounded-2xl p-5 mb-5 text-center">
            <div className="text-sm text-yellow font-semibold">هیچ مکان اسکانی به حساب شما متصل نیست</div>
            <div className="text-xs text-text-muted mt-1">با مدیر سیستم تماس بگیرید</div>
          </div>
        )}

        {/* Request list */}
        <div className="text-sm font-bold mb-3">
          {STATUS_TABS.find(t => t.id === tab)?.label}
          <span className="text-xs font-normal text-text-muted mr-2">({filteredRequests.length} درخواست)</span>
        </div>

        {loading && <div className="text-center py-12 text-text-muted text-sm">در حال بارگذاری...</div>}

        {!loading && filteredRequests.length === 0 && (
          <div className="text-center py-12 text-text-muted text-sm border border-border rounded-2xl">
            درخواستی در این دسته وجود ندارد
          </div>
        )}

        <div className="space-y-3">
          {filteredRequests.map((req: any) => {
            const st = STATUS_LABELS[req.status] || STATUS_LABELS.PENDING
            return (
              <div key={req.id} className="bg-bg-card border border-border rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="text-sm font-bold">{req.requester?.fullName}</div>
                    {req.requester?.phone && <div className="text-xs text-text-muted font-mono mt-0.5">{req.requester.phone}</div>}
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg flex-shrink-0"
                    style={{ color: st.color, background: `${st.color}20` }}>{st.label}</span>
                </div>

                <div className="flex gap-4 text-xs mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-text-dim">تعداد نفر:</span>
                    <span className="font-bold text-text-primary">{req.guestsCount.toLocaleString('fa-IR')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-text-dim">تعداد شب:</span>
                    <span className="font-bold text-text-primary">{req.nights.toLocaleString('fa-IR')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-text-dim">تاریخ:</span>
                    <span className="text-text-secondary">{new Date(req.createdAt).toLocaleDateString('fa-IR')}</span>
                  </div>
                </div>

                {req.notes && (
                  <div className="text-xs text-text-secondary bg-white/[.03] rounded-lg p-2 mb-3 leading-6">{req.notes}</div>
                )}

                {req.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <button onClick={() => updateStatus(req.id, 'APPROVED')}
                      className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                      style={{ background: 'rgba(86,196,138,.15)', color: '#56c48a', border: '1px solid rgba(86,196,138,.3)' }}>
                      تأیید درخواست
                    </button>
                    <button onClick={() => updateStatus(req.id, 'REJECTED')}
                      className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                      style={{ background: 'rgba(224,122,122,.12)', color: '#e07a7a', border: '1px solid rgba(224,122,122,.25)' }}>
                      رد درخواست
                    </button>
                  </div>
                )}
                {req.status === 'APPROVED' && (
                  <button onClick={() => updateStatus(req.id, 'COMPLETED')}
                    className="w-full py-2 rounded-xl text-xs font-semibold text-text-muted border border-border hover:border-white/20 transition-all">
                    پایان اقامت
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
