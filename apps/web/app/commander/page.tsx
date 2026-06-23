'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getStoredUser, logout, canAccess, getRedirectPath } from '@/lib/auth'
import api from '@/lib/api'

// ── Constants ──────────────────────────────────────────────────────────────

const CHECKLIST_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT:                    { label: 'پیش‌نویس',          color: '#56708c' },
  SUBMITTED:                { label: 'ثبت شده',           color: '#e0c14f' },
  UNDER_REVIEW:             { label: 'در حال بررسی',      color: '#b08ce0' },
  RETURNED_FOR_CORRECTION:  { label: 'برگشت برای اصلاح',  color: '#e07a7a' },
  CORRECTED:                { label: 'اصلاح شده',         color: '#e0a450' },
  APPROVED:                 { label: 'تأیید شده',          color: '#56c48a' },
  APPROVED_WITH_CONDITIONS: { label: 'تأیید مشروط',       color: '#5aa9e6' },
  REJECTED:                 { label: 'رد شده',             color: '#e07a7a' },
  CLOSED:                   { label: 'بسته شده',           color: '#56708c' },
}

const INSPECTION_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING:            { label: 'در انتظار بررسی', color: '#e0c14f' },
  COMMANDER_REVIEW:   { label: 'در حال بررسی',   color: '#b08ce0' },
  INSPECTOR_ASSIGNED: { label: 'ارجاع به بازرس', color: '#5aa9e6' },
  APPROVED:           { label: 'تأیید شده',       color: '#56c48a' },
  CONDITIONAL:        { label: 'تأیید مشروط',     color: '#e0a450' },
  REJECTED:           { label: 'رد شده',           color: '#e07a7a' },
  REVISIT:            { label: 'نیاز به بازدید',  color: '#e0c14f' },
}

const PRIORITIES = [
  { value: 'LOW',      label: 'کم',     color: '#56c48a' },
  { value: 'MEDIUM',   label: 'متوسط',  color: '#5aa9e6' },
  { value: 'HIGH',     label: 'بالا',   color: '#e0c14f' },
  { value: 'CRITICAL', label: 'بحرانی', color: '#e07a7a' },
]

const TABS = [
  { id: 'dashboard', label: 'داشبورد' },
  { id: 'inspections', label: 'بازرسی‌ها' },
  { id: 'checklists', label: 'چک‌لیست‌ها' },
  { id: 'accommodations', label: 'اسکان' },
  { id: 'reports', label: 'گزارش‌ها' },
]

const INSPECTION_QUEUE_TABS = [
  { id: 'PENDING',          label: 'صف بررسی',   color: '#e0c14f' },
  { id: 'COMMANDER_REVIEW', label: 'در بررسی',   color: '#b08ce0' },
  { id: 'INSPECTOR_ASSIGNED', label: 'ارجاع شده', color: '#5aa9e6' },
]

// ── Helpers ────────────────────────────────────────────────────────────────

function StatCard({ label, value, color, onClick }: { label: string; value: number | string; color: string; onClick?: () => void }) {
  return (
    <button onClick={onClick}
      className={`bg-bg-card border border-border rounded-2xl p-4 text-right transition-all w-full ${onClick ? 'hover:border-white/20 cursor-pointer' : 'cursor-default'}`}>
      <div className="text-xs text-text-muted mb-1">{label}</div>
      <div className="text-2xl font-black" style={{ color }}>{value}</div>
    </button>
  )
}

function StatusBadge({ status, map }: { status: string; map: Record<string, { label: string; color: string }> }) {
  const s = map[status] || { label: status, color: '#56708c' }
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg" style={{ color: s.color, background: `${s.color}20` }}>{s.label}</span>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function CommanderPage() {
  const router = useRouter()
  const user = getStoredUser()
  const [tab, setTab] = useState('dashboard')
  const [stats, setStats] = useState<any>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  // Inspections tab
  const [inspectionQueueTab, setInspectionQueueTab] = useState('PENDING')
  const [submissions, setSubmissions] = useState<any[]>([])
  const [submissionsLoading, setSubmissionsLoading] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [assignTo, setAssignTo] = useState('')
  const [inspectors, setInspectors] = useState<any[]>([])
  const [assigning, setAssigning] = useState(false)

  // Checklist tab
  const [checklistFilter, setChecklistFilter] = useState('SUBMITTED')
  const [checklists, setChecklists] = useState<any[]>([])
  const [checklistsLoading, setChecklistsLoading] = useState(false)
  const [selectedChecklist, setSelectedChecklist] = useState<any>(null)
  const [checklistDetail, setChecklistDetail] = useState<any>(null)
  const [checklistDetailLoading, setChecklistDetailLoading] = useState(false)
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [showApproveCondModal, setShowApproveCondModal] = useState(false)
  const [returnReason, setReturnReason] = useState('')
  const [conditionNotes, setConditionNotes] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Accommodations tab
  const [accommodations, setAccommodations] = useState<any[]>([])
  const [accommodationsLoading, setAccommodationsLoading] = useState(false)
  const [accommodationFilter, setAccommodationFilter] = useState('PENDING')

  // Reports tab
  const [reports, setReports] = useState<any[]>([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reportStatusFilter, setReportStatusFilter] = useState('')

  useEffect(() => {
    if (!user) { router.replace('/'); return }
    if (!canAccess(user, 'COMMANDER')) { router.replace(getRedirectPath(user)); return }
    loadStats()
    loadInspectors()
  }, [])

  useEffect(() => {
    if (tab === 'inspections') loadSubmissions()
    else if (tab === 'checklists') loadChecklists()
    else if (tab === 'accommodations') loadAccommodations()
    else if (tab === 'reports') loadReports()
  }, [tab])

  useEffect(() => {
    if (tab === 'inspections') loadSubmissions()
  }, [inspectionQueueTab])

  useEffect(() => {
    if (tab === 'checklists') loadChecklists()
  }, [checklistFilter])

  useEffect(() => {
    if (tab === 'accommodations') loadAccommodations()
  }, [accommodationFilter])

  useEffect(() => {
    if (tab === 'reports') loadReports()
  }, [reportStatusFilter])

  async function loadStats() {
    setStatsLoading(true)
    try {
      const data = await api.get('/dashboard/commander')
      setStats(data)
    } catch (e) { console.error(e) }
    finally { setStatsLoading(false) }
  }

  async function loadInspectors() {
    try {
      const res = await api.get('/users?role=INSPECTOR&limit=100')
      setInspectors(res?.data || [])
    } catch (e) { console.error(e) }
  }

  const loadSubmissions = useCallback(async () => {
    setSubmissionsLoading(true)
    try {
      const res = await api.get(`/inspections?status=${inspectionQueueTab}&limit=50`)
      setSubmissions(res?.data || [])
    } catch (e) { console.error(e) }
    finally { setSubmissionsLoading(false) }
  }, [inspectionQueueTab])

  async function loadChecklists() {
    setChecklistsLoading(true)
    try {
      const res = await api.get(`/inspections?checklistStatus=${checklistFilter}&limit=50`)
      setChecklists(res?.data || [])
    } catch (e) { console.error(e) }
    finally { setChecklistsLoading(false) }
  }

  async function loadAccommodations() {
    setAccommodationsLoading(true)
    try {
      const res = await api.get(`/accommodation/places?status=${accommodationFilter}&limit=50&sortBy=createdAt&sortOrder=desc`)
      setAccommodations(res?.data || [])
    } catch (e) { console.error(e) }
    finally { setAccommodationsLoading(false) }
  }

  async function loadReports() {
    setReportsLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (reportStatusFilter) params.set('status', reportStatusFilter)
      const res = await api.get(`/reports?${params}`)
      setReports(res?.data || [])
    } catch (e) { console.error(e) }
    finally { setReportsLoading(false) }
  }

  async function loadChecklistDetail(id: string) {
    setChecklistDetailLoading(true)
    try {
      const data = await api.get(`/inspections/${id}/checklist`)
      setChecklistDetail(data)
    } catch (e) { console.error(e) }
    finally { setChecklistDetailLoading(false) }
  }

  // ── Inspection actions ──────────────────────────────────────────────────

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
      setInspectionQueueTab('INSPECTOR_ASSIGNED')
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

  // ── Checklist actions ───────────────────────────────────────────────────

  async function updateChecklistStatus(submissionId: string, status: string, opts?: { reason?: string; conditionNotes?: string }) {
    setActionLoading(true)
    try {
      const updated = await api.put(`/inspections/${submissionId}/checklist/status`, { status, ...opts })
      setChecklistDetail(updated)
      setChecklists(prev => prev.map(c => c.id === submissionId ? { ...c, checklistStatus: status } : c))
      setShowReturnModal(false)
      setShowApproveCondModal(false)
      setReturnReason(''); setConditionNotes('')
    } catch (e: any) { alert(e.message) }
    finally { setActionLoading(false) }
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-5 h-14 border-b border-border sticky top-0 z-30 bg-bg-dark">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg border border-purple/40 flex items-center justify-center text-[9px] font-mono" style={{ color: '#b08ce0', borderColor: '#b08ce044' }}>قرگ</div>
          <div>
            <div className="font-bold text-sm">پنل قرارگاه</div>
            <div className="text-[11px] text-text-muted">{user.fullName}</div>
          </div>
        </div>

        <nav className="flex gap-1 bg-white/[.03] p-1 rounded-xl border border-border">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === t.id ? 'bg-purple/20 text-purple' : 'text-text-muted hover:text-text-primary'}`}
              style={tab === t.id ? { color: '#b08ce0' } : {}}>
              {t.label}
            </button>
          ))}
        </nav>

        <button onClick={() => { logout(); router.push('/') }} className="text-xs text-text-muted px-3 py-1.5 border border-border rounded-lg">خروج</button>
      </header>

      <div className="p-5 fade-up">

        {/* ── Dashboard Tab ─────────────────────────────────────────────── */}
        {tab === 'dashboard' && (
          <div className="space-y-5">
            {statsLoading ? (
              <div className="text-center py-12 text-text-muted text-sm">در حال بارگذاری...</div>
            ) : stats ? (
              <>
                {/* Main KPI grid */}
                <div className="grid grid-cols-5 gap-3">
                  <StatCard label="صف بررسی" value={stats.kpis.pendingReview} color="#e0c14f" onClick={() => { setTab('inspections'); setInspectionQueueTab('PENDING') }} />
                  <StatCard label="در حال بررسی" value={stats.kpis.inReview} color="#b08ce0" onClick={() => { setTab('inspections'); setInspectionQueueTab('COMMANDER_REVIEW') }} />
                  <StatCard label="ارجاع شده" value={stats.kpis.inspectorAssigned} color="#5aa9e6" onClick={() => { setTab('inspections'); setInspectionQueueTab('INSPECTOR_ASSIGNED') }} />
                  <StatCard label="تأیید شده" value={stats.kpis.approved} color="#56c48a" />
                  <StatCard label="موارد سررسید گذشته" value={stats.kpis.overdueAssignments} color="#e07a7a" />
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <StatCard label="رد شده" value={stats.kpis.rejected} color="#e07a7a" />
                  <StatCard label="تأیید مشروط" value={stats.kpis.conditional} color="#e0a450" />
                  <StatCard label="نیاز به بازدید مجدد" value={stats.kpis.revisit} color="#e0c14f" />
                  <StatCard label="اسکان در انتظار تأیید" value={stats.kpis.pendingAccommodations} color="#e0c14f" onClick={() => { setTab('accommodations'); setAccommodationFilter('PENDING') }} />
                </div>

                {/* Checklist status */}
                <div className="bg-bg-card border border-border rounded-2xl p-4">
                  <div className="text-sm font-bold mb-3">وضعیت چک‌لیست‌ها</div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(CHECKLIST_STATUS_LABELS).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-xs cursor-pointer hover:border-white/20" onClick={() => { setTab('checklists'); setChecklistFilter(k) }}>
                        <span style={{ color: v.color }}>{v.label}</span>
                        <span className="font-bold" style={{ color: v.color }}>{stats.checklistKpis[k] || 0}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Inspector workload */}
                {stats.inspectorWorkload?.length > 0 && (
                  <div className="bg-bg-card border border-border rounded-2xl p-4">
                    <div className="text-sm font-bold mb-3">بار کاری بازرسان</div>
                    <div className="space-y-2">
                      {stats.inspectorWorkload.slice(0, 8).map((w: any) => (
                        <div key={w.inspectorId} className="flex items-center gap-3">
                          <div className="text-xs text-text-secondary w-32 flex-shrink-0">{w.fullName}</div>
                          <div className="flex-1 h-2 bg-white/[.06] rounded-full">
                            <div className="h-full rounded-full" style={{
                              width: `${Math.min((w.activeCount / (stats.inspectorWorkload[0]?.activeCount || 1)) * 100, 100)}%`,
                              background: w.activeCount > 5 ? '#e07a7a' : w.activeCount > 2 ? '#e0c14f' : '#56c48a',
                            }} />
                          </div>
                          <div className="text-xs font-bold w-6 text-right" style={{ color: w.activeCount > 5 ? '#e07a7a' : '#56c48a' }}>{w.activeCount}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent checklist activity */}
                {stats.recentChecklistActivity?.length > 0 && (
                  <div className="bg-bg-card border border-border rounded-2xl p-4">
                    <div className="text-sm font-bold mb-3">فعالیت اخیر چک‌لیست‌ها (۴۸ ساعت گذشته)</div>
                    <div className="space-y-2">
                      {stats.recentChecklistActivity.map((h: any) => {
                        const toSt = CHECKLIST_STATUS_LABELS[h.toStatus] || { label: h.toStatus, color: '#56708c' }
                        const fromSt = h.fromStatus ? CHECKLIST_STATUS_LABELS[h.fromStatus] : null
                        return (
                          <div key={h.id} className="flex items-start gap-3 text-xs">
                            <div className="text-text-dim w-24 flex-shrink-0">{new Date(h.createdAt).toLocaleString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</div>
                            <div className="flex-1">
                              <span className="text-text-secondary">{h.submission?.location?.name || '—'}</span>
                              {fromSt && <span className="text-text-dim"> ← <span style={{ color: fromSt.color }}>{fromSt.label}</span></span>}
                              <span className="text-text-dim"> → </span>
                              <span style={{ color: toSt.color }}>{toSt.label}</span>
                            </div>
                            <div className="text-text-dim">{h.changedBy?.fullName}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : <div className="text-center py-12 text-text-muted text-sm">خطا در بارگذاری آمار</div>}
          </div>
        )}

        {/* ── Inspections Tab ───────────────────────────────────────────── */}
        {tab === 'inspections' && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex gap-1 bg-white/[.03] p-1 rounded-xl border border-border">
                {INSPECTION_QUEUE_TABS.map(t => (
                  <button key={t.id} onClick={() => setInspectionQueueTab(t.id)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${inspectionQueueTab === t.id ? 'text-bg' : 'text-text-muted hover:text-text-primary'}`}
                    style={inspectionQueueTab === t.id ? { background: t.color } : {}}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={`grid gap-4 ${selected ? 'grid-cols-[1fr_380px]' : 'grid-cols-1'}`}>
              <div>
                {submissionsLoading && <div className="text-center py-12 text-text-muted text-sm">در حال بارگذاری...</div>}
                {!submissionsLoading && submissions.length === 0 && (
                  <div className="text-center py-12 text-text-muted text-sm border border-border rounded-2xl">رکوردی یافت نشد</div>
                )}
                <div className="space-y-3">
                  {submissions.map((s: any) => {
                    const priority = PRIORITIES.find(p => p.value === s.priority) || PRIORITIES[1]
                    const isSelected = selected?.id === s.id
                    return (
                      <div key={s.id}
                        className={`bg-bg-card border rounded-2xl p-4 cursor-pointer transition-all ${isSelected ? 'border-purple/50' : 'border-border hover:border-white/20'}`}
                        style={isSelected ? { borderColor: '#b08ce050' } : {}}
                        onClick={() => setSelected(isSelected ? null : s)}>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <div className="text-sm font-bold">{s.location?.name}</div>
                            <div className="text-xs text-text-muted mt-0.5">{s.location?.category} — {s.location?.region?.name}</div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: priority.color, background: `${priority.color}20` }}>{priority.label}</span>
                            <StatusBadge status={s.status} map={INSPECTION_STATUS_LABELS} />
                          </div>
                        </div>
                        {s.notes && <div className="text-xs text-text-secondary bg-white/[.03] rounded-lg p-2 mb-2 leading-6">{s.notes}</div>}
                        <div className="flex items-center justify-between text-[11px] text-text-dim mt-2 pt-2 border-t border-border/40">
                          <span>ثبت: {new Date(s.createdAt).toLocaleDateString('fa-IR')}</span>
                          {s.assignments?.[0] && <span className="text-blue">بازرس: {s.assignments[0].assignedTo?.fullName}</span>}
                          <StatusBadge status={s.checklistStatus || 'DRAFT'} map={CHECKLIST_STATUS_LABELS} />
                        </div>
                        {inspectionQueueTab === 'PENDING' && (
                          <button onClick={e => { e.stopPropagation(); startReview(s) }}
                            className="mt-3 w-full py-2 rounded-xl text-xs font-bold"
                            style={{ background: 'rgba(176,140,224,.15)', color: '#b08ce0', border: '1px solid rgba(176,140,224,.3)' }}>
                            شروع بررسی
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {selected && (
                <div className="bg-bg-card border border-border rounded-2xl p-5 h-fit sticky top-20 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold">ارجاع به بازرس</div>
                    <button onClick={() => setSelected(null)} className="text-text-muted text-lg leading-none">×</button>
                  </div>

                  <div className="bg-blue-dim border border-blue/20 rounded-xl p-3">
                    <div className="text-sm font-bold text-blue mb-1">{selected.location?.name}</div>
                    <div className="text-xs text-text-secondary">{selected.location?.category} — {selected.location?.region?.name}</div>
                    <div className="text-xs text-text-muted mt-1">{selected.location?.address}</div>
                  </div>

                  <div>
                    <label className="block text-xs text-text-secondary mb-2">اولویت رسیدگی</label>
                    <div className="flex gap-1.5">
                      {PRIORITIES.map(p => (
                        <button key={p.value} onClick={() => setPriority(selected.id, p.value)}
                          className="flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all"
                          style={selected.priority === p.value
                            ? { background: `${p.color}25`, color: p.color, borderColor: `${p.color}50` }
                            : { borderColor: 'rgba(255,255,255,.1)', color: '#7e93a8' }}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selected.status === 'COMMANDER_REVIEW' ? (
                    <div className="space-y-2">
                      <label className="block text-xs text-text-secondary mb-1">انتخاب بازرس</label>
                      <select value={assignTo} onChange={e => setAssignTo(e.target.value)}
                        className="w-full px-3 py-2.5 bg-bg-dark border border-border rounded-xl text-sm focus:outline-none">
                        <option value="">بازرس را انتخاب کنید...</option>
                        {inspectors.map((ins: any) => <option key={ins.id} value={ins.id}>{ins.fullName}</option>)}
                      </select>
                      <button onClick={assignInspector} disabled={!assignTo || assigning}
                        className="w-full py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
                        style={{ background: '#5aa9e6', color: '#070d15' }}>
                        {assigning ? 'در حال ارجاع...' : 'ارجاع به بازرس'}
                      </button>
                      <button onClick={() => sendBack(selected.id)}
                        className="w-full py-2 rounded-xl text-xs text-text-muted border border-border">
                        بازگشت به صف
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-text-muted text-center py-4">
                      ابتدا «شروع بررسی» را بزنید
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Checklists Tab ────────────────────────────────────────────── */}
        {tab === 'checklists' && (
          <div>
            {/* Filter bar */}
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(CHECKLIST_STATUS_LABELS).map(([k, v]) => (
                <button key={k} onClick={() => setChecklistFilter(k)}
                  className="px-3 py-1.5 rounded-lg text-xs border transition-all"
                  style={checklistFilter === k
                    ? { background: `${v.color}20`, color: v.color, borderColor: `${v.color}50` }
                    : { borderColor: 'rgba(255,255,255,.08)', color: '#56708c' }}>
                  {v.label} {stats?.checklistKpis?.[k] ? `(${stats.checklistKpis[k]})` : ''}
                </button>
              ))}
            </div>

            <div className={`grid gap-4 ${checklistDetail ? 'grid-cols-[1fr_420px]' : 'grid-cols-1'}`}>
              {/* Checklist list */}
              <div>
                {checklistsLoading && <div className="text-center py-10 text-text-muted text-sm">در حال بارگذاری...</div>}
                {!checklistsLoading && checklists.length === 0 && (
                  <div className="text-center py-12 text-text-muted text-sm border border-border rounded-2xl">چک‌لیستی در این وضعیت وجود ندارد</div>
                )}
                <div className="space-y-3">
                  {checklists.map((s: any) => {
                    const cs = CHECKLIST_STATUS_LABELS[s.checklistStatus || 'DRAFT']
                    const isSelected = selectedChecklist?.id === s.id
                    return (
                      <div key={s.id} onClick={async () => {
                        setSelectedChecklist(s)
                        await loadChecklistDetail(s.id)
                      }}
                        className={`bg-bg-card border rounded-2xl p-4 cursor-pointer transition-all ${isSelected ? 'border-purple/50' : 'border-border hover:border-white/20'}`}
                        style={isSelected ? { borderColor: '#b08ce040' } : {}}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-bold">{s.location?.name}</div>
                            <div className="text-xs text-text-muted mt-0.5">{s.location?.region?.name} — {new Date(s.updatedAt || s.createdAt).toLocaleDateString('fa-IR')}</div>
                            {s.assignments?.[0] && <div className="text-xs text-blue mt-0.5">بازرس: {s.assignments[0].assignedTo?.fullName}</div>}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg" style={{ color: cs.color, background: `${cs.color}20` }}>{cs.label}</span>
                            {s.score != null && <span className="text-[10px] text-text-dim">امتیاز: {s.score}٪</span>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Checklist detail */}
              {checklistDetail && (
                <ChecklistDetailPanel
                  detail={checklistDetail}
                  loading={checklistDetailLoading}
                  onClose={() => { setChecklistDetail(null); setSelectedChecklist(null) }}
                  onStatusChange={updateChecklistStatus}
                  showReturnModal={showReturnModal}
                  setShowReturnModal={setShowReturnModal}
                  showApproveCondModal={showApproveCondModal}
                  setShowApproveCondModal={setShowApproveCondModal}
                  returnReason={returnReason}
                  setReturnReason={setReturnReason}
                  conditionNotes={conditionNotes}
                  setConditionNotes={setConditionNotes}
                  actionLoading={actionLoading}
                />
              )}
            </div>
          </div>
        )}

        {/* ── Accommodations Tab ────────────────────────────────────────── */}
        {tab === 'accommodations' && (
          <div>
            <div className="flex gap-2 mb-4">
              {['PENDING', 'APPROVED', 'REJECTED'].map(s => {
                const labels: Record<string, string> = { PENDING: 'در انتظار تأیید', APPROVED: 'تأیید شده', REJECTED: 'رد شده' }
                const colors: Record<string, string> = { PENDING: '#e0c14f', APPROVED: '#56c48a', REJECTED: '#e07a7a' }
                return (
                  <button key={s} onClick={() => setAccommodationFilter(s)}
                    className="px-4 py-1.5 rounded-lg text-xs border transition-all"
                    style={accommodationFilter === s
                      ? { background: `${colors[s]}20`, color: colors[s], borderColor: `${colors[s]}50` }
                      : { borderColor: 'rgba(255,255,255,.08)', color: '#56708c' }}>
                    {labels[s]}
                  </button>
                )
              })}
            </div>

            {accommodationsLoading && <div className="text-center py-10 text-text-muted text-sm">در حال بارگذاری...</div>}
            <div className="space-y-3">
              {accommodations.map((pl: any) => {
                const statusColors: Record<string, string> = { PENDING: '#e0c14f', APPROVED: '#56c48a', REJECTED: '#e07a7a' }
                const statusLabels: Record<string, string> = { PENDING: 'در انتظار', APPROVED: 'تأیید شده', REJECTED: 'رد شده' }
                const color = statusColors[pl.status] || '#56708c'
                const occupancyPct = pl.capacity > 0 ? Math.round((pl.currentOccupancy / pl.capacity) * 100) : 0
                return (
                  <div key={pl.id} className="bg-bg-card border border-border rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="text-sm font-bold">{pl.name}</div>
                        <div className="text-xs text-text-muted mt-0.5">{pl.address} — {pl.region?.name}</div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg flex-shrink-0" style={{ color, background: `${color}20` }}>{statusLabels[pl.status]}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-3 text-xs mb-2">
                      <div><span className="text-text-dim">ظرفیت: </span><strong>{pl.capacity}</strong></div>
                      <div><span className="text-text-dim">اشغال: </span><strong style={{ color: occupancyPct > 80 ? '#e07a7a' : '#56c48a' }}>{pl.currentOccupancy}</strong></div>
                      <div><span className="text-text-dim">مدیر: </span><strong className={pl.manager ? 'text-green' : 'text-text-dim'}>{pl.manager?.fullName || '—'}</strong></div>
                      <div><span className="text-text-dim">بازرس: </span><strong className={pl.assignedInspector ? 'text-blue' : 'text-text-dim'}>{pl.assignedInspector?.fullName || '—'}</strong></div>
                    </div>
                    <div className="h-1.5 bg-white/[.06] rounded-full">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(occupancyPct, 100)}%`, background: occupancyPct > 80 ? '#e07a7a' : '#56c48a' }} />
                    </div>
                  </div>
                )
              })}
              {!accommodationsLoading && accommodations.length === 0 && (
                <div className="text-center py-12 text-text-muted text-sm border border-border rounded-2xl">مکانی یافت نشد</div>
              )}
            </div>
          </div>
        )}

        {/* ── Reports Tab ───────────────────────────────────────────────── */}
        {tab === 'reports' && (
          <div>
            <div className="flex flex-wrap gap-2 mb-4">
              {[['', 'همه'], ['PENDING', 'در انتظار'], ['UNDER_REVIEW', 'در بررسی'], ['RESOLVED', 'حل شده'], ['REJECTED', 'رد شده']].map(([v, l]) => (
                <button key={v} onClick={() => setReportStatusFilter(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${reportStatusFilter === v ? 'border-purple/40 text-purple' : 'border-border text-text-muted hover:border-white/20'}`}
                  style={reportStatusFilter === v ? { color: '#b08ce0', background: 'rgba(176,140,224,.1)' } : {}}>
                  {l}
                </button>
              ))}
            </div>

            {reportsLoading && <div className="text-center py-10 text-text-muted text-sm">در حال بارگذاری...</div>}
            <div className="space-y-3">
              {reports.map((r: any) => {
                const priority = PRIORITIES.find(p => p.value === r.priority) || PRIORITIES[1]
                return (
                  <div key={r.id} className="bg-bg-card border border-border rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="text-sm font-bold">{r.title}</div>
                        <div className="text-xs text-text-muted mt-0.5">{r.category} — {r.address || '—'}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: priority.color, background: `${priority.color}20` }}>{priority.label}</span>
                      </div>
                    </div>
                    <div className="text-xs text-text-secondary leading-6 line-clamp-2 mb-2">{r.description}</div>
                    <div className="flex items-center justify-between text-[11px] text-text-dim">
                      <span>گزارش‌دهنده: {r.reporter?.fullName}</span>
                      <span>{new Date(r.createdAt).toLocaleDateString('fa-IR')}</span>
                    </div>
                  </div>
                )
              })}
              {!reportsLoading && reports.length === 0 && (
                <div className="text-center py-12 text-text-muted text-sm border border-border rounded-2xl">گزارشی یافت نشد</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Checklist Detail Panel ─────────────────────────────────────────────────

function ChecklistDetailPanel({
  detail, loading, onClose, onStatusChange,
  showReturnModal, setShowReturnModal,
  showApproveCondModal, setShowApproveCondModal,
  returnReason, setReturnReason,
  conditionNotes, setConditionNotes,
  actionLoading,
}: any) {
  const cs = CHECKLIST_STATUS_LABELS[detail.checklistStatus || 'DRAFT']
  const canReview = ['SUBMITTED', 'CORRECTED', 'UNDER_REVIEW'].includes(detail.checklistStatus)

  // Group responses by category
  const responseMap: Record<string, boolean | undefined> = {}
  detail.checklistResponses?.forEach((r: any) => { responseMap[r.checklistItemId] = r.passed })
  const noteMap: Record<string, string> = {}
  detail.checklistResponses?.forEach((r: any) => { if (r.notes) noteMap[r.checklistItemId] = r.notes })

  const byCategory: Record<string, any[]> = {}
  detail.checklistResponses?.forEach((r: any) => {
    const cat = r.checklistItem?.category || 'عمومی'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(r)
  })

  const passed = detail.checklistResponses?.filter((r: any) => r.passed).length || 0
  const total = detail.checklistResponses?.length || 0

  return (
    <div className="bg-bg-card border border-border rounded-2xl h-fit sticky top-20 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <div className="text-sm font-bold">{detail.location?.name}</div>
          <div className="text-xs text-text-muted">{detail.location?.region?.name}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg" style={{ color: cs.color, background: `${cs.color}20` }}>{cs.label}</span>
          <button onClick={onClose} className="text-text-muted text-lg leading-none">×</button>
        </div>
      </div>

      <div className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto space-y-4">
        {loading ? <div className="text-center py-8 text-text-muted text-sm">در حال بارگذاری...</div> : (
          <>
            {/* Score */}
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-black" style={{ color: (detail.score || 0) >= 60 ? '#56c48a' : '#e07a7a' }}>{detail.score != null ? `${detail.score}٪` : '—'}</div>
                <div className="text-[10px] text-text-dim">امتیاز</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-text-primary">{passed}/{total}</div>
                <div className="text-[10px] text-text-dim">موافق/کل</div>
              </div>
              {detail.checklistConditionNotes && (
                <div className="flex-1 text-xs bg-blue/10 border border-blue/20 rounded-xl p-2 text-blue leading-5">{detail.checklistConditionNotes}</div>
              )}
            </div>

            {/* Assignment info */}
            {detail.assignments?.[0] && (
              <div className="text-xs text-text-muted bg-white/[.03] rounded-xl p-2">
                بازرس: <span className="text-blue font-semibold">{detail.assignments[0].assignedTo?.fullName}</span>
              </div>
            )}

            {/* Action buttons */}
            {canReview && (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => onStatusChange(detail.id, 'UNDER_REVIEW')} disabled={actionLoading}
                  className="py-2 rounded-xl text-xs font-bold border border-purple/30 disabled:opacity-40" style={{ color: '#b08ce0', background: 'rgba(176,140,224,.1)' }}>
                  شروع بررسی
                </button>
                <button onClick={() => setShowReturnModal(true)} disabled={actionLoading}
                  className="py-2 rounded-xl text-xs font-bold border border-red/30 disabled:opacity-40" style={{ color: '#e07a7a', background: 'rgba(224,122,122,.1)' }}>
                  بازگشت برای اصلاح
                </button>
                <button onClick={() => onStatusChange(detail.id, 'APPROVED')} disabled={actionLoading}
                  className="py-2 rounded-xl text-xs font-bold border border-green/30 disabled:opacity-40" style={{ color: '#56c48a', background: 'rgba(86,196,138,.1)' }}>
                  تأیید
                </button>
                <button onClick={() => setShowApproveCondModal(true)} disabled={actionLoading}
                  className="py-2 rounded-xl text-xs font-bold border border-blue/30 disabled:opacity-40" style={{ color: '#5aa9e6', background: 'rgba(90,169,230,.1)' }}>
                  تأیید مشروط
                </button>
                <button onClick={() => onStatusChange(detail.id, 'REJECTED')} disabled={actionLoading}
                  className="col-span-2 py-2 rounded-xl text-xs font-bold border border-red/30 disabled:opacity-40" style={{ color: '#e07a7a', background: 'rgba(224,122,122,.08)' }}>
                  رد چک‌لیست
                </button>
              </div>
            )}
            {detail.checklistStatus === 'APPROVED' || detail.checklistStatus === 'APPROVED_WITH_CONDITIONS' ? (
              <button onClick={() => onStatusChange(detail.id, 'CLOSED')} disabled={actionLoading}
                className="w-full py-2 rounded-xl text-xs border border-border text-text-muted disabled:opacity-40">
                بستن پرونده
              </button>
            ) : null}

            {/* Checklist responses grouped by category */}
            {Object.keys(byCategory).length > 0 && (
              <div className="space-y-3">
                <div className="text-xs font-bold text-text-secondary">موارد چک‌لیست</div>
                {Object.entries(byCategory).map(([cat, responses]) => (
                  <div key={cat}>
                    <div className="text-[10px] font-bold text-text-dim uppercase mb-1">{cat}</div>
                    <div className="space-y-1.5">
                      {responses.map((r: any) => (
                        <div key={r.id} className="flex items-start gap-2 text-xs">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5"
                            style={r.passed
                              ? { background: 'rgba(86,196,138,.2)', color: '#56c48a' }
                              : { background: 'rgba(224,122,122,.15)', color: '#e07a7a' }}>
                            {r.passed ? '✓' : '✗'}
                          </span>
                          <div className="flex-1">
                            <div className={r.passed ? 'text-text-primary' : 'text-text-secondary'}>{r.checklistItem?.label}</div>
                            {r.notes && <div className="text-text-dim mt-0.5 text-[10px] leading-4">{r.notes}</div>}
                          </div>
                          {r.checklistItem?.isMandatory && (
                            <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: 'rgba(224,193,79,.15)', color: '#e0c14f' }}>اجباری</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Status history */}
            {detail.checklistHistory?.length > 0 && (
              <div>
                <div className="text-xs font-bold text-text-secondary mb-2">تاریخچه وضعیت</div>
                <div className="space-y-1.5">
                  {detail.checklistHistory.map((h: any) => {
                    const toSt = CHECKLIST_STATUS_LABELS[h.toStatus] || { label: h.toStatus, color: '#56708c' }
                    return (
                      <div key={h.id} className="text-[10px] border-r-2 pr-2 leading-5" style={{ borderColor: toSt.color }}>
                        <div className="flex items-center gap-2">
                          <span style={{ color: toSt.color }}>{toSt.label}</span>
                          <span className="text-text-dim">— {h.changedBy?.fullName}</span>
                          <span className="text-text-dim">{new Date(h.createdAt).toLocaleDateString('fa-IR')}</span>
                        </div>
                        {h.reason && <div className="text-text-dim">دلیل: {h.reason}</div>}
                        {h.conditionNotes && <div className="text-blue">شرایط: {h.conditionNotes}</div>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Return for correction modal */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(7,13,21,.85)' }}>
          <div className="bg-bg-dark border border-border rounded-2xl w-full max-w-md p-5 space-y-4">
            <div className="font-bold text-sm">بازگشت برای اصلاح</div>
            <div className="text-xs text-text-muted">دلیل بازگشت را وارد کنید. این پیام برای بازرس نمایش داده می‌شود.</div>
            <textarea value={returnReason} onChange={e => setReturnReason(e.target.value)} rows={3}
              placeholder="حداقل ۵ کاراکتر..."
              className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm focus:outline-none resize-none" />
            <div className="flex gap-2">
              <button onClick={() => { setShowReturnModal(false); setReturnReason('') }} className="flex-1 py-2.5 rounded-xl border border-border text-sm text-text-muted">لغو</button>
              <button onClick={() => onStatusChange(detail.id, 'RETURNED_FOR_CORRECTION', { reason: returnReason })}
                disabled={actionLoading || returnReason.trim().length < 5}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
                style={{ background: '#e07a7a', color: '#fff' }}>
                ارسال
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve with conditions modal */}
      {showApproveCondModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(7,13,21,.85)' }}>
          <div className="bg-bg-dark border border-border rounded-2xl w-full max-w-md p-5 space-y-4">
            <div className="font-bold text-sm">تأیید مشروط</div>
            <div className="text-xs text-text-muted">شرایط تأیید را وارد کنید.</div>
            <textarea value={conditionNotes} onChange={e => setConditionNotes(e.target.value)} rows={3}
              placeholder="حداقل ۵ کاراکتر..."
              className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm focus:outline-none resize-none" />
            <div className="flex gap-2">
              <button onClick={() => { setShowApproveCondModal(false); setConditionNotes('') }} className="flex-1 py-2.5 rounded-xl border border-border text-sm text-text-muted">لغو</button>
              <button onClick={() => onStatusChange(detail.id, 'APPROVED_WITH_CONDITIONS', { conditionNotes })}
                disabled={actionLoading || conditionNotes.trim().length < 5}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
                style={{ background: '#5aa9e6', color: '#070d15' }}>
                تأیید مشروط
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
