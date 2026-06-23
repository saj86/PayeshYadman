'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getStoredUser, logout, canAccess, getRedirectPath } from '@/lib/auth'
import api from '@/lib/api'
import AccommodationManager from '@/components/AccommodationManager'

const TABS = ['گزارش‌های شهری', 'اسکان', 'بازرسان', 'کاربران', 'تیکت‌ها', 'لاگ‌ها']

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

const ALL_APP_TYPES = [
  { name: 'HQ', label: 'ستاد' }, { name: 'INSPECTOR', label: 'بازرس' }, { name: 'CITIZEN', label: 'شهروند' },
  { name: 'SUPPORT', label: 'پشتیبانی' }, { name: 'DISTRICT', label: 'ناحیه' }, { name: 'ADMIN', label: 'مدیر کل' },
  { name: 'COMMANDER', label: 'قرارگاه' }, { name: 'ACCOMMODATION', label: 'اسکان' },
]
const ALL_ROLES = [
  { name: 'HQ_MANAGER', label: 'مسئول ستاد' }, { name: 'COMMANDER', label: 'قرارگاه' },
  { name: 'INSPECTOR', label: 'بازرس میدانی' }, { name: 'DISTRICT_MANAGER', label: 'مسئول ناحیه' },
  { name: 'CITIZEN', label: 'شهروند' }, { name: 'SUPPORT', label: 'پشتیبانی' },
  { name: 'ACCOMMODATION_MANAGER', label: 'مسئول اسکان' },
]

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(7,13,21,.85)', backdropFilter: 'blur(6px)' }}>
      <div className="bg-bg-dark border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-bg-dark">
          <div className="font-bold text-sm">{title}</div>
          <button onClick={onClose} className="text-text-muted text-lg leading-none hover:text-text-primary">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function CheckboxGroup({ options, selected, onChange }: { options: { name: string; label: string }[]; selected: string[]; onChange: (v: string[]) => void }) {
  const toggle = (name: string) => onChange(selected.includes(name) ? selected.filter(x => x !== name) : [...selected, name])
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button key={opt.name} type="button" onClick={() => toggle(opt.name)}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${selected.includes(opt.name) ? 'bg-blue/20 text-blue border-blue/40' : 'border-border text-text-muted hover:border-white/20'}`}>
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export default function SupportPage() {
  const router = useRouter()
  const user = getStoredUser()
  const [tab, setTab] = useState('گزارش‌های شهری')
  const [loading, setLoading] = useState(false)

  // Citizen reports
  const [reports, setReports] = useState<any[]>([])
  const [reportStatusFilter, setReportStatusFilter] = useState('')
  const [selectedReport, setSelectedReport] = useState<any>(null)
  const [inspectors, setInspectors] = useState<any[]>([])
  const [assignInspectorId, setAssignInspectorId] = useState('')
  const [newStatus, setNewStatus] = useState('')

  // Users
  const [users, setUsers] = useState<any>({ data: [], total: 0, totalPages: 1 })
  const [userPage, setUserPage] = useState(1)
  const [userSearch, setUserSearch] = useState('')
  const [showUserModal, setShowUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [userForm, setUserForm] = useState({ fullName: '', email: '', password: 'Support1234', roleNames: [] as string[], appTypes: [] as string[] })
  const [userSaving, setUserSaving] = useState(false)
  const [showPwModal, setShowPwModal] = useState(false)
  const [pwTarget, setPwTarget] = useState<any>(null)
  const [pwForm, setPwForm] = useState({ password: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')

  // Tickets & Logs
  const [tickets, setTickets] = useState<any>({ data: [] })
  const [logs, setLogs] = useState<any>({ data: [] })

  useEffect(() => {
    if (!user) { router.replace('/'); return }
    if (!canAccess(user, 'SUPPORT')) { router.replace(getRedirectPath(user)); return }
  }, [])

  useEffect(() => {
    if (tab === 'گزارش‌های شهری') loadReports()
    if (tab === 'بازرسان') loadInspectors()
    if (tab === 'کاربران') loadUsers(1)
    if (tab === 'تیکت‌ها') loadTickets()
    if (tab === 'لاگ‌ها') loadLogs()
  }, [tab])

  async function loadReports() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (reportStatusFilter) params.set('status', reportStatusFilter)
      const res: any = await api.get(`/reports?${params}`)
      setReports(res?.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function loadInspectors() {
    setLoading(true)
    try {
      const [u, rpts] = await Promise.all([
        api.get('/users?role=INSPECTOR&limit=100&status=active'),
        api.get('/reports?status=ASSIGNED&limit=100'),
      ])
      setInspectors(u?.data || [])
      setReports(rpts?.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const loadUsers = useCallback(async (page = 1, search = userSearch) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' })
      if (search) params.set('search', search)
      const res = await api.get(`/users?${params}`)
      setUsers(res)
      setUserPage(page)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [userSearch])

  async function loadTickets() {
    setLoading(true)
    try { setTickets(await api.get('/support/tickets?limit=30')) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function loadLogs() {
    setLoading(true)
    try { setLogs(await api.get('/audit-logs?limit=50')) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  // ── Report actions ──────────────────────────────────────────────────────────
  async function updateReportStatus() {
    if (!selectedReport || !newStatus) return
    try {
      const body: any = { status: newStatus }
      if (assignInspectorId) body.assignedToId = assignInspectorId
      await api.put(`/reports/${selectedReport.id}/status`, body)
      setSelectedReport((r: any) => ({ ...r, status: newStatus, assignedToId: assignInspectorId || r.assignedToId }))
      setReports(prev => prev.map(r => r.id === selectedReport.id ? { ...r, status: newStatus } : r))
      setNewStatus('')
      setAssignInspectorId('')
    } catch (e: any) { alert(e.message) }
  }

  // ── User actions ────────────────────────────────────────────────────────────
  function openCreate() {
    setEditingUser(null)
    setUserForm({ fullName: '', email: '', password: 'Support1234', roleNames: [], appTypes: [] })
    setShowUserModal(true)
  }

  function openEdit(u: any) {
    setEditingUser(u)
    setUserForm({
      fullName: u.fullName, email: u.email, password: '',
      roleNames: u.userRoles?.map((ur: any) => ur.role?.name).filter(Boolean) || [],
      appTypes: u.userAppAccess?.map((a: any) => a.appType) || [],
    })
    setShowUserModal(true)
  }

  function openCreateInspector() {
    setEditingUser(null)
    setUserForm({ fullName: '', email: '', password: 'Inspector1234', roleNames: ['INSPECTOR'], appTypes: ['INSPECTOR'] })
    setShowUserModal(true)
  }

  async function saveUser() {
    setUserSaving(true)
    try {
      if (editingUser) {
        await Promise.all([
          api.put(`/users/${editingUser.id}`, { fullName: userForm.fullName, email: userForm.email }),
          api.put(`/users/${editingUser.id}/roles`, { roleNames: userForm.roleNames }),
          api.put(`/users/${editingUser.id}/app-access`, { appTypes: userForm.appTypes }),
        ])
      } else {
        await api.post('/users', {
          email: userForm.email, fullName: userForm.fullName,
          password: userForm.password || 'Support1234',
          roleNames: userForm.roleNames, appTypes: userForm.appTypes,
        })
      }
      setShowUserModal(false)
      if (tab === 'کاربران') await loadUsers(userPage)
      if (tab === 'بازرسان') await loadInspectors()
    } catch (e: any) { alert(e.message) }
    finally { setUserSaving(false) }
  }

  async function doPasswordReset() {
    if (pwForm.password !== pwForm.confirm) { setPwError('رمز عبور و تأیید آن یکسان نیستند'); return }
    if (pwForm.password.length < 6) { setPwError('رمز عبور باید حداقل ۶ کاراکتر باشد'); return }
    setPwSaving(true)
    try {
      await api.patch(`/users/${pwTarget.id}/reset-password`, { password: pwForm.password })
      setShowPwModal(false)
    } catch (e: any) { setPwError(e.message) }
    finally { setPwSaving(false) }
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="flex items-center justify-between px-5 h-14 border-b border-border sticky top-0 z-30 bg-bg-dark">
        <div className="flex items-center gap-2">
          <div className="font-bold text-sm">پنل پشتیبانی</div>
          <span className="text-[10px] text-text-muted">— {user.fullName}</span>
        </div>
        <div className="flex gap-1 bg-white/[.03] p-1 rounded-xl border border-border overflow-x-auto">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${tab === t ? 'bg-blue/20 text-blue' : 'text-text-muted hover:text-text-primary'}`}>{t}</button>
          ))}
        </div>
        <button onClick={() => { logout(); router.push('/') }} className="text-xs text-text-muted px-3 py-1.5 border border-border rounded-lg">خروج</button>
      </header>

      <div className="p-5 fade-up">

        {/* ── CITIZEN REPORTS ──────────────────────────────────────────────── */}
        {tab === 'گزارش‌های شهری' && (
          <div>
            {selectedReport ? (
              <div className="max-w-2xl">
                <button onClick={() => setSelectedReport(null)} className="text-text-muted text-sm mb-4 hover:text-text-primary">← بازگشت به لیست</button>
                <div className="bg-bg-card border border-border rounded-2xl p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-base">{selectedReport.title}</div>
                      <div className="text-xs text-text-muted mt-0.5">{selectedReport.category} • {new Date(selectedReport.createdAt).toLocaleString('fa-IR')}</div>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-1 rounded-lg flex-shrink-0"
                      style={{ color: REPORT_STATUS[selectedReport.status]?.color, background: `${REPORT_STATUS[selectedReport.status]?.color}20` }}>
                      {REPORT_STATUS[selectedReport.status]?.label}
                    </span>
                  </div>
                  <div className="text-sm text-text-secondary leading-7">{selectedReport.description}</div>
                  {selectedReport.address && <div className="text-xs text-text-muted">📍 {selectedReport.address}</div>}
                  {selectedReport.reporter && <div className="text-xs text-text-muted">ثبت توسط: {selectedReport.reporter.fullName}</div>}

                  <div className="pt-3 border-t border-border space-y-3">
                    <div className="text-xs font-bold text-text-secondary">تغییر وضعیت</div>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(REPORT_STATUS).map(([key, val]) => (
                        <button key={key} onClick={() => setNewStatus(newStatus === key ? '' : key)}
                          className="py-2 rounded-xl text-xs font-semibold border transition-all"
                          style={newStatus === key
                            ? { background: `${val.color}25`, color: val.color, borderColor: `${val.color}50` }
                            : { borderColor: 'rgba(255,255,255,.08)', color: '#7e93a8' }}>
                          {val.label}
                        </button>
                      ))}
                    </div>
                    <div>
                      <label className="block text-xs text-text-secondary mb-1.5">ارجاع به بازرس</label>
                      <select value={assignInspectorId} onChange={e => setAssignInspectorId(e.target.value)}
                        className="w-full px-3 py-2.5 bg-bg-dark border border-border rounded-xl text-sm focus:outline-none">
                        <option value="">بدون تغییر</option>
                        {inspectors.map((ins: any) => <option key={ins.id} value={ins.id}>{ins.fullName}</option>)}
                      </select>
                    </div>
                    <button onClick={updateReportStatus} disabled={!newStatus}
                      className="w-full py-3 rounded-2xl text-sm font-bold disabled:opacity-40"
                      style={{ background: '#5aa9e6', color: '#0d1117' }}>
                      اعمال تغییر
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <h1 className="text-base font-bold">گزارش‌های شهروندی</h1>
                  <div className="flex-1" />
                  <select value={reportStatusFilter} onChange={e => { setReportStatusFilter(e.target.value); }}
                    className="px-3 py-2 bg-bg-card border border-border rounded-lg text-sm focus:outline-none">
                    <option value="">همه وضعیت‌ها</option>
                    {Object.entries(REPORT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <button onClick={loadReports} className="px-3 py-2 border border-border rounded-lg text-xs text-text-muted hover:border-white/20">بارگذاری</button>
                </div>
                <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr] gap-3 px-4 py-3 text-xs text-text-dim border-b border-border">
                    {['عنوان', 'ثبت‌کننده', 'دسته‌بندی', 'وضعیت', 'تاریخ'].map(h => <div key={h}>{h}</div>)}
                  </div>
                  {loading && <div className="text-center py-8 text-text-muted text-sm">بارگذاری...</div>}
                  {!loading && reports.length === 0 && <div className="text-center py-8 text-text-muted text-sm">گزارشی یافت نشد</div>}
                  {reports.map((r: any) => {
                    const st = REPORT_STATUS[r.status] || REPORT_STATUS.PENDING
                    return (
                      <div key={r.id} onClick={() => { setSelectedReport(r); setNewStatus(''); setAssignInspectorId('') }}
                        className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr] gap-3 px-4 py-3 items-center border-b border-border/40 text-sm hover:bg-white/[.02] cursor-pointer transition-all">
                        <div className="font-semibold truncate">{r.title}</div>
                        <div className="text-text-muted text-xs truncate">{r.reporter?.fullName || '—'}</div>
                        <div className="text-text-secondary text-xs">{r.category}</div>
                        <div><span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ color: st.color, background: `${st.color}20` }}>{st.label}</span></div>
                        <div className="text-text-dim text-xs">{new Date(r.createdAt).toLocaleDateString('fa-IR')}</div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── ACCOMMODATION ─────────────────────────────────────────────────── */}
        {tab === 'اسکان' && (
          <AccommodationManager canApprove={true} canDelete={true} canCreate={true} />
        )}

        {/* ── INSPECTORS ────────────────────────────────────────────────────── */}
        {tab === 'بازرسان' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-base font-bold">مدیریت بازرسان</h1>
              <button onClick={openCreateInspector} className="px-4 py-2 rounded-lg text-xs font-bold" style={{ background: '#5aa9e6', color: '#0d1117' }}>+ ایجاد بازرس</button>
            </div>
            <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
              <div className="grid grid-cols-[2fr_2fr_1fr_1.5fr] gap-3 px-4 py-3 text-xs text-text-dim border-b border-border">
                {['نام', 'ایمیل', 'وضعیت', 'گزارش‌های ارجاعی'].map(h => <div key={h}>{h}</div>)}
              </div>
              {loading && <div className="text-center py-8 text-text-muted text-sm">بارگذاری...</div>}
              {inspectors.map((ins: any) => {
                const assignedCount = reports.filter((r: any) => r.assignedToId === ins.id).length
                return (
                  <div key={ins.id} className="grid grid-cols-[2fr_2fr_1fr_1.5fr] gap-3 px-4 py-3 items-center border-b border-border/40 text-sm hover:bg-white/[.02]">
                    <div className="font-semibold">{ins.fullName}</div>
                    <div className="text-text-muted text-xs">{ins.email}</div>
                    <div><span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${ins.isActive ? 'text-green bg-green/10' : 'text-red bg-red/10'}`}>{ins.isActive ? 'فعال' : 'غیرفعال'}</span></div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold" style={{ color: assignedCount > 0 ? '#5aa9e6' : '#56708c' }}>{assignedCount}</span>
                      <span className="text-xs text-text-muted">گزارش</span>
                      <button onClick={() => openEdit(ins)} className="text-[10px] px-2 py-1 rounded border border-border text-text-muted hover:text-blue hover:border-blue/30 transition-all mr-auto">ویرایش</button>
                    </div>
                  </div>
                )
              })}
              {!loading && inspectors.length === 0 && <div className="text-center py-8 text-text-muted text-sm">بازرسی یافت نشد</div>}
            </div>
          </div>
        )}

        {/* ── USERS ─────────────────────────────────────────────────────────── */}
        {tab === 'کاربران' && (
          <div>
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <h1 className="text-base font-bold">مدیریت کاربران</h1>
              <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadUsers(1, userSearch)}
                placeholder="جستجوی نام یا ایمیل..." className="px-3 py-2 bg-bg-card border border-border rounded-lg text-sm focus:outline-none w-52" />
              <button onClick={() => loadUsers(1, userSearch)} className="px-3 py-2 border border-border rounded-lg text-xs text-text-muted hover:border-white/20">جستجو</button>
              <button onClick={openCreate} className="px-4 py-2 rounded-lg text-xs font-bold mr-auto" style={{ background: '#c2a35a', color: '#1a1206' }}>+ ایجاد کاربر</button>
            </div>
            <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
              <div className="grid grid-cols-[2fr_2fr_2fr_1fr_1fr] gap-3 px-4 py-3 text-xs text-text-dim border-b border-border">
                {['نام', 'ایمیل', 'نقش‌ها', 'وضعیت', 'عملیات'].map(h => <div key={h}>{h}</div>)}
              </div>
              {loading && <div className="text-center py-8 text-text-muted text-sm">بارگذاری...</div>}
              {users.data?.map((u: any) => (
                <div key={u.id} className="grid grid-cols-[2fr_2fr_2fr_1fr_1fr] gap-3 px-4 py-3 items-center border-b border-border/40 text-sm hover:bg-white/[.02]">
                  <div className="font-semibold truncate">{u.fullName}</div>
                  <div className="text-text-muted text-xs truncate">{u.email}</div>
                  <div className="flex flex-wrap gap-1">
                    {u.userRoles?.map((ur: any) => (
                      <span key={ur.roleId} className="text-[9px] bg-blue/10 text-blue px-1.5 py-0.5 rounded">{ur.role?.name}</span>
                    ))}
                  </div>
                  <div><span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${u.isActive ? 'text-green bg-green/10' : 'text-red bg-red/10'}`}>{u.isActive ? 'فعال' : 'غیرفعال'}</span></div>
                  <div className="flex gap-1.5">
                    <button onClick={() => openEdit(u)} className="text-[10px] px-2 py-1 rounded border border-border text-text-muted hover:text-blue hover:border-blue/30 transition-all">ویرایش</button>
                    <button onClick={() => { setPwTarget(u); setPwForm({ password: '', confirm: '' }); setPwError(''); setShowPwModal(true) }}
                      className="text-[10px] px-2 py-1 rounded border border-border text-text-muted hover:text-yellow hover:border-yellow/30 transition-all">رمز</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-3 px-1">
              <div className="text-xs text-text-muted">{users.total} کاربر</div>
              <div className="flex gap-1">
                <button disabled={userPage === 1} onClick={() => loadUsers(userPage - 1)} className="w-7 h-7 rounded border border-border text-text-muted text-xs disabled:opacity-30">◄</button>
                <button disabled={userPage >= users.totalPages} onClick={() => loadUsers(userPage + 1)} className="w-7 h-7 rounded border border-border text-text-muted text-xs disabled:opacity-30">►</button>
              </div>
            </div>
          </div>
        )}

        {/* ── TICKETS ───────────────────────────────────────────────────────── */}
        {tab === 'تیکت‌ها' && (
          <div>
            <h1 className="text-base font-bold mb-4">تیکت‌های پشتیبانی</h1>
            <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
              <div className="grid grid-cols-5 gap-3 px-4 py-3 text-xs text-text-dim border-b border-border">
                {['عنوان', 'ثبت‌کننده', 'دسته', 'اولویت', 'وضعیت'].map(h => <div key={h}>{h}</div>)}
              </div>
              {loading && <div className="text-center py-8 text-text-muted text-sm">بارگذاری...</div>}
              {(tickets.data || []).map((t: any) => (
                <div key={t.id} className="grid grid-cols-5 gap-3 px-4 py-3 items-center border-b border-border/40 text-sm">
                  <div className="font-semibold leading-5">{t.title}</div>
                  <div className="text-text-muted text-xs">{t.reportedBy?.fullName}</div>
                  <div className="text-text-secondary text-xs">{t.category}</div>
                  <div><span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/[.06]">{t.priority}</span></div>
                  <div><span className="text-[10px] font-bold px-2 py-0.5 rounded-md text-blue bg-blue/10">{t.status}</span></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── LOGS ──────────────────────────────────────────────────────────── */}
        {tab === 'لاگ‌ها' && (
          <div>
            <h1 className="text-base font-bold mb-4">لاگ‌های سیستم</h1>
            <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
              <div className="grid grid-cols-4 gap-3 px-4 py-3 text-xs text-text-dim border-b border-border">
                {['زمان', 'کاربر', 'عملیات', 'موجودیت'].map(h => <div key={h}>{h}</div>)}
              </div>
              {(logs.data || []).map((l: any) => (
                <div key={l.id} className="grid grid-cols-4 gap-3 px-4 py-2.5 items-center border-b border-border/30 text-xs hover:bg-white/[.02]">
                  <div className="text-text-dim">{new Date(l.createdAt).toLocaleString('fa-IR')}</div>
                  <div className="text-text-secondary">{l.user?.fullName || 'سیستم'}</div>
                  <div><span className="text-[10px] bg-white/[.05] px-1.5 py-0.5 rounded">{l.action}</span></div>
                  <div className="text-text-muted">{l.entityType}{l.entityId ? ` #${l.entityId.slice(-6)}` : ''}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── User Create/Edit Modal ──────────────────────────────────────────── */}
      {showUserModal && (
        <Modal title={editingUser ? `ویرایش: ${editingUser.fullName}` : 'ایجاد کاربر جدید'} onClose={() => setShowUserModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">نام کامل</label>
              <input value={userForm.fullName} onChange={e => setUserForm(p => ({ ...p, fullName: e.target.value }))} className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">ایمیل</label>
              <input type="email" value={userForm.email} onChange={e => setUserForm(p => ({ ...p, email: e.target.value }))} dir="ltr" className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm focus:outline-none font-mono" />
            </div>
            {!editingUser && (
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">رمز عبور اولیه</label>
                <input value={userForm.password} onChange={e => setUserForm(p => ({ ...p, password: e.target.value }))} dir="ltr" className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm focus:outline-none font-mono" />
              </div>
            )}
            <div>
              <label className="block text-xs text-text-secondary mb-2">نقش‌ها</label>
              <CheckboxGroup options={ALL_ROLES} selected={userForm.roleNames} onChange={v => setUserForm(p => ({ ...p, roleNames: v }))} />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-2">دسترسی اپ</label>
              <CheckboxGroup options={ALL_APP_TYPES} selected={userForm.appTypes} onChange={v => setUserForm(p => ({ ...p, appTypes: v }))} />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowUserModal(false)} className="flex-1 py-2.5 rounded-xl border border-border text-sm text-text-muted">لغو</button>
              <button onClick={saveUser} disabled={userSaving || !userForm.fullName || !userForm.email}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
                style={{ background: '#c2a35a', color: '#1a1206' }}>
                {userSaving ? 'در حال ذخیره...' : editingUser ? 'ذخیره تغییرات' : 'ایجاد کاربر'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Password Reset Modal ────────────────────────────────────────────── */}
      {showPwModal && pwTarget && (
        <Modal title={`بازنشانی رمز: ${pwTarget.fullName}`} onClose={() => setShowPwModal(false)}>
          <div className="space-y-4">
            <div className="text-xs text-text-muted bg-white/[.04] rounded-xl p-3">رمز برای <strong>{pwTarget.email}</strong> تغییر می‌کند.</div>
            {pwError && <div className="text-xs text-red bg-red/10 border border-red/20 rounded-xl p-3">{pwError}</div>}
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">رمز عبور جدید</label>
              <input type="password" value={pwForm.password} onChange={e => setPwForm(p => ({ ...p, password: e.target.value }))} dir="ltr" className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">تأیید رمز عبور</label>
              <input type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} dir="ltr" className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm focus:outline-none" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowPwModal(false)} className="flex-1 py-2.5 rounded-xl border border-border text-sm text-text-muted">لغو</button>
              <button onClick={doPasswordReset} disabled={pwSaving || !pwForm.password}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
                style={{ background: '#e07a7a', color: '#fff' }}>
                {pwSaving ? 'در حال تغییر...' : 'تغییر رمز عبور'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
