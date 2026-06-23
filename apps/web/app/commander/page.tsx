'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getStoredUser, logout, canAccess, getRedirectPath } from '@/lib/auth'
import api from '@/lib/api'

const STATUS_TABS = [
  { id: 'PENDING',          label: 'صف بررسی',      color: '#e0c14f' },
  { id: 'COMMANDER_REVIEW', label: 'در حال بررسی',  color: '#b08ce0' },
  { id: 'INSPECTOR_ASSIGNED', label: 'ارجاع شده',   color: '#5aa9e6' },
]

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING:            { label: 'در انتظار',      color: '#e0c14f' },
  COMMANDER_REVIEW:   { label: 'در حال بررسی',  color: '#b08ce0' },
  INSPECTOR_ASSIGNED: { label: 'ارجاع به بازرس', color: '#5aa9e6' },
  APPROVED:           { label: 'تأیید شده',      color: '#56c48a' },
  REJECTED:           { label: 'رد شده',          color: '#e07a7a' },
}

const PRIORITIES = [
  { value: 'LOW',      label: 'کم',      color: '#56c48a' },
  { value: 'MEDIUM',   label: 'متوسط',   color: '#5aa9e6' },
  { value: 'HIGH',     label: 'بالا',    color: '#e0c14f' },
  { value: 'CRITICAL', label: 'بحرانی', color: '#e07a7a' },
]

export default function CommanderPage() {
  const router = useRouter()
  const user = getStoredUser()
  const [tab, setTab] = useState('PENDING')
  const [submissions, setSubmissions] = useState<any[]>([])
  const [inspectors, setInspectors] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [assignTo, setAssignTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    if (!user) { router.replace('/'); return }
    if (!canAccess(user, 'COMMANDER')) { router.replace(getRedirectPath(user)); return }
    loadInspectors()
  }, [])

  useEffect(() => { loadSubmissions() }, [tab])

  const loadSubmissions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(`/inspections?status=${tab}&limit=50`)
      setSubmissions(res?.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [tab])

  async function loadInspectors() {
    try {
      const res = await api.get('/users?role=INSPECTOR&limit=50')
      setInspectors(res?.data || [])
    } catch (e) { console.error(e) }
  }

  async function startReview(submission: any) {
    try {
      await api.put(`/inspections/${submission.id}/status`, { status: 'COMMANDER_REVIEW' })
      setSelected(submission)
      setAssignTo('')
      await loadSubmissions()
    } catch (e: any) { alert(e.message) }
  }

  async function assignInspector() {
    if (!selected || !assignTo) return
    setAssigning(true)
    try {
      await api.post('/assignments', {
        inspectionSubmissionId: selected.id,
        assignedToId: assignTo,
        dueAt: new Date(Date.now() + 48 * 3600_000).toISOString(),
      })
      setSelected(null)
      setAssignTo('')
      setTab('INSPECTOR_ASSIGNED')
    } catch (e: any) { alert(e.message) }
    finally { setAssigning(false) }
  }

  async function setPriority(id: string, priority: string) {
    try {
      await api.put(`/inspections/${id}/priority`, { priority })
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, priority } : s))
      if (selected?.id === id) setSelected((p: any) => ({ ...p, priority }))
    } catch (e: any) { alert(e.message) }
  }

  async function sendBack(id: string) {
    try {
      await api.put(`/inspections/${id}/status`, { status: 'PENDING' })
      setSelected(null)
      await loadSubmissions()
    } catch (e: any) { alert(e.message) }
  }

  const counts = STATUS_TABS.map(t => t.id)

  if (!user) return null

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="flex items-center justify-between px-5 h-14 border-b border-border sticky top-0 z-30 bg-bg-dark">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg border border-purple/40 flex items-center justify-center text-[9px] text-purple font-mono" style={{ color: '#b08ce0', borderColor: '#b08ce044' }}>قرگ</div>
          <div>
            <div className="font-bold text-sm">پنل قرارگاه</div>
            <div className="text-[11px] text-text-muted">{user.fullName}</div>
          </div>
        </div>

        <div className="flex gap-1 bg-white/[.03] p-1 rounded-xl border border-border">
          {STATUS_TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === t.id ? 'text-bg' : 'text-text-muted hover:text-text-primary'}`}
              style={tab === t.id ? { background: t.color } : {}}>
              {t.label}
            </button>
          ))}
        </div>

        <button onClick={() => { logout(); router.push('/') }} className="text-xs text-text-muted px-3 py-1.5 border border-border rounded-lg">خروج</button>
      </header>

      <div className="p-5 fade-up">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {STATUS_TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`bg-bg-card border rounded-2xl p-4 text-right transition-all ${tab === t.id ? 'border-opacity-60' : 'border-border hover:border-white/20'}`}
              style={tab === t.id ? { borderColor: `${t.color}60` } : {}}>
              <div className="text-xs text-text-muted mb-1">{t.label}</div>
              <div className="text-2xl font-black" style={{ color: t.color }}>—</div>
            </button>
          ))}
        </div>

        <div className={`grid gap-4 ${selected ? 'grid-cols-[1fr_380px]' : 'grid-cols-1'}`}>
          {/* Submission list */}
          <div>
            <div className="text-sm font-bold mb-3">
              {STATUS_TABS.find(t => t.id === tab)?.label}
              <span className="text-xs font-normal text-text-muted mr-2">({submissions.length} رکورد)</span>
            </div>

            {loading && <div className="text-center py-12 text-text-muted text-sm">در حال بارگذاری...</div>}
            {!loading && submissions.length === 0 && (
              <div className="text-center py-12 text-text-muted text-sm border border-border rounded-2xl">
                {tab === 'PENDING' ? 'هیچ رکورد در انتظاری وجود ندارد' :
                 tab === 'COMMANDER_REVIEW' ? 'در حال بررسی‌ای وجود ندارد' : 'ارجاعی انجام نشده'}
              </div>
            )}

            <div className="space-y-3">
              {submissions.map((s: any) => {
                const st = STATUS_LABELS[s.status] || STATUS_LABELS.PENDING
                const isSelected = selected?.id === s.id
                return (
                  <div key={s.id}
                    className={`bg-bg-card border rounded-2xl p-4 transition-all cursor-pointer ${isSelected ? 'border-purple/50' : 'border-border hover:border-white/20'}`}
                    style={isSelected ? { borderColor: '#b08ce050' } : {}}
                    onClick={() => setSelected(isSelected ? null : s)}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="text-sm font-bold">{s.location?.name}</div>
                        <div className="text-xs text-text-muted mt-0.5">{s.location?.category} — {s.location?.region?.name}</div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {(() => { const p = PRIORITIES.find(p => p.value === s.priority) || PRIORITIES[1]; return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: p.color, background: `${p.color}20` }}>{p.label}</span> })()}
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg" style={{ color: st.color, background: `${st.color}20` }}>{st.label}</span>
                      </div>
                    </div>

                    {s.notes && <div className="text-xs text-text-secondary bg-white/[.03] rounded-lg p-2 mb-2 leading-6">{s.notes}</div>}

                    <div className="flex items-center justify-between text-[11px] text-text-dim mt-2 pt-2 border-t border-border/40">
                      <span>ثبت: {new Date(s.createdAt).toLocaleDateString('fa-IR')}</span>
                      {s.assignments?.[0] && (
                        <span className="text-blue">بازرس: {s.assignments[0].assignedTo?.fullName}</span>
                      )}
                    </div>

                    {tab === 'PENDING' && (
                      <button onClick={e => { e.stopPropagation(); startReview(s) }}
                        className="mt-3 w-full py-2 rounded-xl text-xs font-bold transition-all"
                        style={{ background: 'rgba(176,140,224,.15)', color: '#b08ce0', border: '1px solid rgba(176,140,224,.3)' }}>
                        شروع بررسی
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Assignment panel */}
          {selected && (
            <div className="bg-bg-card border border-border rounded-2xl p-5 h-fit sticky top-20">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-bold">ارجاع به بازرس</div>
                <button onClick={() => setSelected(null)} className="text-text-muted text-lg leading-none">×</button>
              </div>

              <div className="bg-blue-dim border border-blue/20 rounded-xl p-3 mb-4">
                <div className="text-sm font-bold text-blue mb-1">{selected.location?.name}</div>
                <div className="text-xs text-text-secondary">{selected.location?.category} — {selected.location?.region?.name}</div>
                <div className="text-xs text-text-muted mt-1">{selected.location?.address}</div>
              </div>

              {/* Priority control — always visible */}
              <div className="mb-4">
                <label className="block text-xs text-text-secondary mb-2">اولویت رسیدگی</label>
                <div className="flex gap-1.5">
                  {PRIORITIES.map(p => (
                    <button key={p.value} onClick={() => setPriority(selected.id, p.value)}
                      className="flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all border"
                      style={selected.priority === p.value
                        ? { background: `${p.color}25`, color: p.color, borderColor: `${p.color}50` }
                        : { borderColor: 'rgba(255,255,255,.1)', color: '#7e93a8' }}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {selected.status === 'COMMANDER_REVIEW' ? (
                <>
                  <div className="mb-4">
                    <label className="block text-xs text-text-secondary mb-2">انتخاب بازرس</label>
                    <select value={assignTo} onChange={e => setAssignTo(e.target.value)}
                      className="w-full px-3 py-2.5 bg-bg-dark border border-border rounded-xl text-sm focus:outline-none focus:border-blue/50">
                      <option value="">بازرس را انتخاب کنید...</option>
                      {inspectors.map((ins: any) => (
                        <option key={ins.id} value={ins.id}>{ins.fullName}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <button onClick={assignInspector} disabled={!assignTo || assigning}
                      className="w-full py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                      style={{ background: '#5aa9e6', color: '#070d15' }}>
                      {assigning ? 'در حال ارجاع...' : 'ارجاع به بازرس'}
                    </button>
                    <button onClick={() => sendBack(selected.id)}
                      className="w-full py-2 rounded-xl text-xs font-semibold text-text-muted border border-border hover:border-border/80">
                      بازگشت به صف
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-xs text-text-muted text-center py-4">
                  ابتدا «شروع بررسی» را بزنید تا رکورد به حالت بررسی برود
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
