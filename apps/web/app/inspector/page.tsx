'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getStoredUser, logout, canAccess, getRedirectPath } from '@/lib/auth'
import api from '@/lib/api'

const TABS = [
  { id: 'queue',   label: 'صف بازرسی' },
  { id: 'done',    label: 'انجام‌شده' },
  { id: 'reports', label: 'گزارش‌های شهری' },
  { id: 'missing', label: 'گمشدگان' },
]

const REPORT_STATUS: Record<string, { label: string; color: string }> = {
  PENDING:      { label: 'در انتظار',       color: '#e0c14f' },
  UNDER_REVIEW: { label: 'در بررسی',        color: '#b08ce0' },
  ASSIGNED:     { label: 'ارجاع شده',       color: '#5aa9e6' },
  IN_PROGRESS:  { label: 'در پیگیری',       color: '#5aa9e6' },
  NEEDS_INFO:   { label: 'نیاز به اطلاعات', color: '#e0a450' },
  RESOLVED:     { label: 'حل شده',          color: '#56c48a' },
  REJECTED:     { label: 'رد شده',          color: '#e07a7a' },
  CLOSED:       { label: 'بسته شده',        color: '#56708c' },
}

export default function InspectorPage() {
  const router = useRouter()
  const user = getStoredUser()
  const [tab, setTab] = useState('queue')
  const [queue, setQueue] = useState<any[]>([])
  const [done, setDone] = useState<any[]>([])
  const [citizenReports, setCitizenReports] = useState<any[]>([])
  const [missing, setMissing] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [checklist, setChecklist] = useState<any>(null)
  const [responses, setResponses] = useState<Record<string, boolean>>({})
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState<any>(null)
  const [reportStatus, setReportStatus] = useState('')

  useEffect(() => {
    if (!user) { router.replace('/'); return }
    if (!canAccess(user, 'INSPECTOR')) { router.replace(getRedirectPath(user)); return }
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [q, doneRes, cl, miss, rpts] = await Promise.all([
        api.get('/inspections?status=INSPECTOR_ASSIGNED&limit=50'),
        api.get('/inspections?status=APPROVED&limit=50'),
        api.get('/checklists'),
        api.get('/lost-found'),
        api.get('/reports'),
      ])
      setQueue(q?.data || [])
      setDone(doneRes?.data || [])
      setCitizenReports(rpts?.data || [])
      if (cl && cl.length > 0) {
        const full = await api.get(`/checklists/${cl[0].id}`)
        setChecklist(full)
      }
      setMissing(Array.isArray(miss) ? miss : [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function submitReview(action: 'APPROVE' | 'REJECT' | 'REVISIT' | 'CONDITIONAL') {
    if (!selected) return
    const items = checklist?.items || []
    const passed = items.filter((item: any) => responses[item.id] === true).length
    const score = items.length > 0 ? Math.round((passed / items.length) * 100) : 0
    try {
      await api.post(`/inspections/${selected.id}/review`, {
        action, notes, score,
        checklistResponses: items.map((item: any) => ({ checklistItemId: item.id, passed: responses[item.id] ?? false, notes: '' })),
      })
      setSelected(null)
      setResponses({})
      setNotes('')
      await loadData()
    } catch (e: any) { alert(e.message) }
  }

  async function updateReportStatus(id: string, status: string) {
    try {
      await api.put(`/reports/${id}/status`, { status })
      setSelectedReport((r: any) => r ? { ...r, status } : r)
      setCitizenReports(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    } catch (e: any) { alert(e.message) }
  }

  const passedCount = Object.values(responses).filter(Boolean).length
  const totalItems = checklist?.items?.length || 0
  const score = totalItems > 0 ? Math.round((passedCount / totalItems) * 100) : 0

  if (!user) return null

  // ── Inspection detail view ──────────────────────────────────────────────────
  if (selected) {
    return (
      <div className="min-h-screen bg-bg" dir="rtl">
        <header className="sticky top-0 z-20 bg-bg-dark border-b border-border px-4 h-14 flex items-center gap-3">
          <button onClick={() => { setSelected(null); setResponses({}); setNotes('') }} className="text-text-muted text-xl">←</button>
          <div className="flex-1">
            <div className="text-sm font-bold">برگهٔ بازرسی</div>
            <div className="text-[11px] text-text-muted">{selected.location?.name}</div>
          </div>
          <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: 'rgba(224,193,79,.15)', color: '#e0c14f' }}>
            امتیاز: {score}٪
          </span>
        </header>

        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
          <div className="bg-blue-dim border border-blue/25 rounded-2xl p-4">
            <div className="text-sm font-bold text-blue mb-1">{selected.location?.name}</div>
            <div className="text-xs text-text-secondary">{selected.location?.category} — {selected.location?.region?.name}</div>
            {selected.notes && <div className="text-xs text-text-muted mt-2">{selected.notes}</div>}
          </div>

          <div className="bg-bg-card border border-border rounded-2xl p-4">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-text-muted">پیشرفت چک‌لیست</span>
              <span className="font-bold" style={{ color: score >= 60 ? '#56c48a' : score >= 40 ? '#e0c14f' : '#e07a7a' }}>{score}٪</span>
            </div>
            <div className="h-2 bg-white/[.06] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: score >= 60 ? '#56c48a' : score >= 40 ? '#e0c14f' : '#e07a7a' }} />
            </div>
            <div className="text-[10px] text-text-dim mt-1">{passedCount} از {totalItems} مورد تأیید</div>
          </div>

          {checklist?.items?.map((item: any) => (
            <div key={item.id} onClick={() => setResponses(p => ({ ...p, [item.id]: !p[item.id] }))}
              className="flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all"
              style={{ background: responses[item.id] ? 'rgba(86,196,138,.08)' : 'rgba(255,255,255,.02)', borderColor: responses[item.id] ? 'rgba(86,196,138,.35)' : 'rgba(255,255,255,.08)' }}>
              <div className="w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0"
                style={{ background: responses[item.id] ? '#56c48a' : 'transparent', borderColor: responses[item.id] ? '#56c48a' : 'rgba(255,255,255,.2)' }}>
                {responses[item.id] && <span className="text-bg text-xs font-bold">✓</span>}
              </div>
              <div>
                <div className="text-xs font-semibold">{item.label}</div>
                <div className="text-[10px] text-text-dim">{item.category}{item.isMandatory ? ' • اجباری' : ''}</div>
              </div>
            </div>
          ))}

          <div>
            <label className="block text-xs text-text-secondary mb-1.5">یادداشت بازرس</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="مشاهدات میدانی..."
              className="w-full px-3 py-2.5 bg-bg-dark border border-border rounded-xl text-xs focus:outline-none resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-2 pb-4">
            <button onClick={() => submitReview('APPROVE')} className="py-3 rounded-2xl text-sm font-bold" style={{ background: 'rgba(86,196,138,.2)', color: '#56c48a', border: '1px solid rgba(86,196,138,.35)' }}>✓ تأیید</button>
            <button onClick={() => submitReview('CONDITIONAL')} className="py-3 rounded-2xl text-sm font-bold" style={{ background: 'rgba(224,193,79,.15)', color: '#e0c14f', border: '1px solid rgba(224,193,79,.3)' }}>~ مشروط</button>
            <button onClick={() => submitReview('REVISIT')} className="py-3 rounded-2xl text-sm font-bold" style={{ background: 'rgba(90,169,230,.15)', color: '#5aa9e6', border: '1px solid rgba(90,169,230,.3)' }}>↺ بازدید مجدد</button>
            <button onClick={() => submitReview('REJECT')} className="py-3 rounded-2xl text-sm font-bold" style={{ background: 'rgba(224,122,122,.15)', color: '#e07a7a', border: '1px solid rgba(224,122,122,.3)' }}>✗ رد</button>
          </div>
        </div>
      </div>
    )
  }

  // ── Citizen report detail ──────────────────────────────────────────────────
  if (selectedReport) {
    const st = REPORT_STATUS[selectedReport.status] || REPORT_STATUS.PENDING
    return (
      <div className="min-h-screen bg-bg" dir="rtl">
        <header className="sticky top-0 z-20 bg-bg-dark border-b border-border px-4 h-14 flex items-center gap-3">
          <button onClick={() => setSelectedReport(null)} className="text-text-muted text-xl">←</button>
          <div className="flex-1">
            <div className="text-sm font-bold">{selectedReport.title}</div>
            <div className="text-[11px] text-text-muted">{selectedReport.category}</div>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg" style={{ color: st.color, background: `${st.color}20` }}>{st.label}</span>
        </header>

        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
          <div className="bg-bg-card border border-border rounded-2xl p-4 space-y-2">
            <div className="text-xs text-text-secondary leading-6">{selectedReport.description}</div>
            {selectedReport.address && <div className="text-xs text-text-dim">📍 {selectedReport.address}</div>}
            <div className="text-xs text-text-dim">ثبت: {new Date(selectedReport.createdAt).toLocaleString('fa-IR')}</div>
            {selectedReport.reporter && <div className="text-xs text-text-dim">توسط: {selectedReport.reporter.fullName}</div>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-2">تغییر وضعیت</label>
            <div className="grid grid-cols-2 gap-2">
              {['IN_PROGRESS', 'NEEDS_INFO', 'RESOLVED'].map(s => {
                const st = REPORT_STATUS[s]
                const isActive = selectedReport.status === s
                return (
                  <button key={s} onClick={() => updateReportStatus(selectedReport.id, s)}
                    className="py-2.5 rounded-xl text-xs font-bold border transition-all"
                    style={isActive
                      ? { background: `${st.color}25`, color: st.color, borderColor: `${st.color}50` }
                      : { borderColor: 'rgba(255,255,255,.1)', color: '#7e93a8' }}>
                    {st.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── List view ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg" dir="rtl">
      <header className="sticky top-0 z-20 bg-bg-dark border-b border-border px-4 h-14 flex items-center justify-between">
        <div>
          <div className="text-[10px] text-blue font-semibold">اپ بازرس میدانی</div>
          <div className="text-base font-black">{user.fullName}</div>
        </div>
        <button onClick={() => { logout(); router.push('/') }} className="text-xs text-text-muted px-3 py-1.5 border border-border rounded-lg">خروج</button>
      </header>

      {/* Stats */}
      <div className="px-4 py-4 grid grid-cols-3 gap-3">
        <div className="bg-bg-card border border-yellow/25 rounded-2xl p-3 text-center">
          <div className="text-2xl font-black text-yellow">{queue.length}</div>
          <div className="text-[10px] text-text-secondary">در صف</div>
        </div>
        <div className="bg-bg-card border border-green/25 rounded-2xl p-3 text-center">
          <div className="text-2xl font-black text-green">{done.length}</div>
          <div className="text-[10px] text-text-secondary">انجام‌شده</div>
        </div>
        <div className="bg-bg-card border border-blue/25 rounded-2xl p-3 text-center">
          <div className="text-2xl font-black" style={{ color: '#5aa9e6' }}>{citizenReports.filter(r => r.status === 'ASSIGNED').length}</div>
          <div className="text-[10px] text-text-secondary">گزارش‌های شهری</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pb-3 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${tab === t.id ? 'text-bg' : 'text-text-muted hover:text-text-primary border border-border'}`}
            style={tab === t.id ? { background: '#5aa9e6' } : {}}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-6">
        {loading && <div className="text-center text-text-muted text-sm py-10">در حال بارگذاری...</div>}

        {tab === 'queue' && !loading && (
          <>
            {queue.length === 0 && <div className="text-center text-text-muted text-sm py-12 border border-border rounded-2xl">صف خالی است</div>}
            <div className="space-y-3">
              {queue.map((r: any) => (
                <div key={r.id} onClick={() => setSelected(r)}
                  className="bg-bg-card border border-border rounded-2xl p-4 cursor-pointer hover:border-blue/50 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold">{r.location?.category || 'عمومی'}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: 'rgba(224,122,122,.15)', color: '#e07a7a' }}>فوری</span>
                  </div>
                  <div className="text-sm font-semibold">{r.location?.name}</div>
                  <div className="text-[11px] text-text-muted mt-1">{r.location?.region?.name} • {new Date(r.createdAt).toLocaleDateString('fa-IR')}</div>
                  <div className="text-xs font-bold text-blue mt-2">باز کردن برگه ←</div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'done' && !loading && (
          <>
            {done.length === 0 && <div className="text-center text-text-muted text-sm py-12 border border-border rounded-2xl">موردی یافت نشد</div>}
            <div className="space-y-3">
              {done.map((r: any) => (
                <div key={r.id} className="bg-bg-card border border-green/20 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold">{r.location?.category}</span>
                    <span className="text-green">✓</span>
                  </div>
                  <div className="text-sm font-semibold">{r.location?.name}</div>
                  <div className="text-[11px] text-text-muted mt-1">{r.location?.region?.name}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'reports' && !loading && (
          <>
            {citizenReports.length === 0 && <div className="text-center text-text-muted text-sm py-12 border border-border rounded-2xl">گزارش شهری ارجاع‌شده‌ای وجود ندارد</div>}
            <div className="space-y-3">
              {citizenReports.map((r: any) => {
                const st = REPORT_STATUS[r.status] || REPORT_STATUS.PENDING
                return (
                  <div key={r.id} onClick={() => setSelectedReport(r)}
                    className="bg-bg-card border border-border rounded-2xl p-4 cursor-pointer hover:border-blue/40 transition-all">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="text-sm font-bold">{r.title}</div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0" style={{ color: st.color, background: `${st.color}20` }}>{st.label}</span>
                    </div>
                    <div className="text-[11px] text-text-muted">{r.category}</div>
                    {r.address && <div className="text-[11px] text-text-dim mt-1">📍 {r.address}</div>}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {tab === 'missing' && !loading && (
          <>
            <div className="text-xs text-text-muted mb-3">
              {missing.filter(m => m.status === 'MISSING').length} گمشده • {missing.filter(m => m.status === 'FOUND').length} پیداشده
            </div>
            <div className="space-y-2">
              {missing.map((m: any) => (
                <div key={m.id} className="flex gap-3 p-3.5 bg-bg-card border border-border rounded-2xl">
                  <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-lg"
                    style={{ background: m.status === 'MISSING' ? 'rgba(224,122,122,.15)' : 'rgba(86,196,138,.15)', color: m.status === 'MISSING' ? '#e07a7a' : '#56c48a' }}>
                    {m.status === 'MISSING' ? '?' : '✓'}
                  </div>
                  <div>
                    <div className="text-sm font-bold">{m.name}</div>
                    <div className="text-[11px] text-text-muted">{m.lastSeenLocation}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
