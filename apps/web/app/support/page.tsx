'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getStoredUser, logout, canAccess, getRedirectPath } from '@/lib/auth'
import api from '@/lib/api'

const TABS = ['کاربران', 'تیکت‌ها', 'سلامت سیستم', 'لاگ‌ها']

const ROLE_FILTER_OPTIONS = [
  { value: '', label: 'همه نقش‌ها' },
  { value: 'CITIZEN', label: 'شهروند' },
  { value: 'INSPECTOR', label: 'بازرس' },
  { value: 'DISTRICT_MANAGER', label: 'مسئول ناحیه' },
  { value: 'COMMANDER', label: 'قرارگاه' },
  { value: 'HQ_MANAGER', label: 'مسئول ستاد' },
  { value: 'ACCOMMODATION_MANAGER', label: 'مسئول اسکان' },
]

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(7,13,21,.85)', backdropFilter: 'blur(6px)' }}>
      <div className="bg-bg-dark border border-border rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="font-bold text-sm">{title}</div>
          <button onClick={onClose} className="text-text-muted text-lg leading-none hover:text-text-primary">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function Pagination({ page, totalPages, total, onPage }: { page: number; totalPages: number; total: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <div className="text-xs text-text-muted">{total.toLocaleString('fa-IR')} کاربر</div>
      <div className="flex items-center gap-1">
        <button disabled={page === 1} onClick={() => onPage(page - 1)} className="w-7 h-7 rounded border border-border text-text-muted text-xs hover:border-white/20 disabled:opacity-30">◄</button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
          <button key={p} onClick={() => onPage(p)} className={`w-7 h-7 rounded text-xs font-semibold transition-all ${p === page ? 'bg-blue/20 text-blue border border-blue/30' : 'border border-border text-text-muted hover:border-white/20'}`}>{p}</button>
        ))}
        <button disabled={page === totalPages} onClick={() => onPage(page + 1)} className="w-7 h-7 rounded border border-border text-text-muted text-xs hover:border-white/20 disabled:opacity-30">►</button>
      </div>
    </div>
  )
}

export default function SupportPage() {
  const router = useRouter()
  const user = getStoredUser()
  const [tab, setTab] = useState('کاربران')
  const [users, setUsers] = useState<any>({ data: [], total: 0, page: 1, totalPages: 1 })
  const [tickets, setTickets] = useState<any>({ data: [], total: 0 })
  const [health, setHealth] = useState<any>(null)
  const [logs, setLogs] = useState<any>({ data: [] })
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [userPage, setUserPage] = useState(1)
  const [loading, setLoading] = useState(true)

  // Password modal
  const [showPwModal, setShowPwModal] = useState(false)
  const [pwTarget, setPwTarget] = useState<any>(null)
  const [pwForm, setPwForm] = useState({ password: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')

  useEffect(() => {
    if (!user) { router.replace('/'); return }
    if (!canAccess(user, 'SUPPORT')) { router.replace(getRedirectPath(user)); return }
    loadAll()
  }, [])

  async function loadAll() {
    try {
      const [u, t, h, l] = await Promise.all([
        api.get('/users?limit=15'),
        api.get('/support/tickets?limit=20'),
        api.get('/support/health'),
        api.get('/audit-logs?limit=30'),
      ])
      setUsers(u); setTickets(t); setHealth(h); setLogs(l)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const loadUsers = useCallback(async (page = 1, s = search, role = roleFilter) => {
    const params = new URLSearchParams({ page: String(page), limit: '15' })
    if (s) params.set('search', s)
    if (role) params.set('role', role)
    const res = await api.get(`/users?${params}`)
    setUsers(res)
    setUserPage(page)
  }, [search, roleFilter])

  async function updateTicket(id: string, status: string) {
    try {
      await api.put(`/support/tickets/${id}/status`, { status })
      const t = await api.get('/support/tickets?limit=20')
      setTickets(t)
    } catch (e: any) { alert(e.message) }
  }

  function openPwReset(u: any) {
    setPwTarget(u)
    setPwForm({ password: '', confirm: '' })
    setPwError('')
    setShowPwModal(true)
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

  const statusLabel: Record<string, string> = {
    OPEN: 'باز', IN_PROGRESS: 'در حال بررسی', RESOLVED: 'حل شده', CLOSED: 'بسته',
  }
  const statusColor: Record<string, string> = {
    OPEN: '#e07a7a', IN_PROGRESS: '#5aa9e6', RESOLVED: '#56c48a', CLOSED: '#56708c',
  }

  if (!user) return <div className="min-h-screen bg-bg" />

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="flex items-center justify-between px-5 h-14 border-b border-border sticky top-0 z-30 bg-bg-dark">
        <div className="flex items-center gap-2">
          <div className="font-bold text-sm">پنل پشتیبانی سیستم</div>
          <span className="text-[10px] text-text-muted">— {user.fullName}</span>
        </div>
        <div className="flex gap-1 bg-white/[.03] p-1 rounded-xl border border-border">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === t ? 'bg-blue/20 text-blue' : 'text-text-muted hover:text-text-primary'}`}>{t}</button>
          ))}
        </div>
        <button onClick={() => { logout(); router.push('/') }} className="text-xs text-text-muted px-3 py-1.5 border border-border rounded-lg">خروج</button>
      </header>

      <div className="p-5 fade-up">
        {tab === 'کاربران' && (
          <div>
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <h1 className="text-base font-bold">مدیریت کاربران</h1>
              <span className="text-xs text-text-muted bg-bg-card px-2 py-1 rounded-lg border border-border">{users.total} کاربر</span>
              <input value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadUsers(1, search)}
                placeholder="جستجوی نام یا ایمیل..." className="px-3 py-2 bg-bg-card border border-border rounded-lg text-sm focus:outline-none w-52" />
              <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); loadUsers(1, search, e.target.value) }} className="px-3 py-2 bg-bg-card border border-border rounded-lg text-sm focus:outline-none">
                {ROLE_FILTER_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <button onClick={() => loadUsers(1, search)} className="px-3 py-2 border border-border rounded-lg text-xs text-text-muted hover:border-white/20">جستجو</button>
            </div>
            <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
              <div className="grid grid-cols-5 gap-3 px-4 py-3 text-xs text-text-dim border-b border-border">
                {['نام', 'ایمیل', 'نقش', 'وضعیت', 'عملیات'].map(h => <div key={h}>{h}</div>)}
              </div>
              {loading && <div className="text-center py-8 text-text-muted text-sm">بارگذاری...</div>}
              {users.data?.map((u: any) => {
                const targetIsSuperAdmin = u.userRoles?.some((ur: any) => ur.role?.name === 'SUPER_ADMIN')
                return (
                  <div key={u.id} className="grid grid-cols-5 gap-3 px-4 py-3 items-center border-b border-border/40 text-sm hover:bg-white/[.02] transition-all">
                    <div className="font-semibold">{u.fullName}</div>
                    <div className="text-text-muted text-xs">{u.email}</div>
                    <div className="flex flex-wrap gap-1">
                      {u.userRoles?.map((ur: any) => (
                        <span key={ur.roleId} className="text-[10px] bg-blue-dim text-blue px-1.5 py-0.5 rounded">{ur.role?.displayName || ur.role?.name}</span>
                      ))}
                    </div>
                    <div><span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${u.isActive ? 'text-green bg-green-dim' : 'text-red bg-red-dim'}`}>{u.isActive ? 'فعال' : 'غیرفعال'}</span></div>
                    <div className="flex gap-1.5">
                      {!targetIsSuperAdmin && (
                        <button onClick={() => openPwReset(u)} className="text-[11px] px-2 py-1 rounded border border-border text-text-muted hover:text-yellow hover:border-yellow/30 transition-all">بازنشانی رمز</button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <Pagination page={userPage} totalPages={users.totalPages || 1} total={users.total || 0} onPage={p => loadUsers(p)} />
          </div>
        )}

        {tab === 'تیکت‌ها' && (
          <div>
            <h1 className="text-base font-bold mb-4">تیکت‌های پشتیبانی</h1>
            <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
              <div className="grid grid-cols-5 gap-3 px-4 py-3 text-xs text-text-dim border-b border-border">
                {['عنوان', 'ثبت‌کننده', 'دسته', 'اولویت', 'وضعیت'].map(h => <div key={h}>{h}</div>)}
              </div>
              {tickets.data?.map((t: any) => (
                <div key={t.id} className="grid grid-cols-5 gap-3 px-4 py-3 items-center border-b border-border/40 text-sm">
                  <div className="font-semibold leading-5">{t.title}</div>
                  <div className="text-text-muted text-xs">{t.reportedBy?.fullName}</div>
                  <div className="text-text-secondary text-xs">{t.category}</div>
                  <div><span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: { URGENT: '#e07a7a', HIGH: '#e0c14f', MEDIUM: '#5aa9e6', LOW: '#56708c' }[t.priority] || '#5aa9e6', background: 'rgba(255,255,255,.06)' }}>{t.priority}</span></div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md" style={{ color: statusColor[t.status] || '#56708c', background: `${statusColor[t.status] || '#56708c'}22` }}>{statusLabel[t.status] || t.status}</span>
                    {t.status === 'OPEN' && <button onClick={() => updateTicket(t.id, 'IN_PROGRESS')} className="text-[10px] text-blue hover:underline">شروع</button>}
                    {t.status === 'IN_PROGRESS' && <button onClick={() => updateTicket(t.id, 'RESOLVED')} className="text-[10px] text-green hover:underline">حل</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'سلامت سیستم' && health && (
          <div>
            <h1 className="text-base font-bold mb-4">سلامت سیستم</h1>
            <div className="grid grid-cols-4 gap-3 mb-5">
              {[
                { label: 'کاربران فعال', value: health.activeUsers, color: '#56c48a' },
                { label: 'کل رکوردها', value: health.totalSubmissions, color: '#5aa9e6' },
                { label: 'گزارش‌های شهروندی', value: health.totalReports, color: '#b08ce0' },
                { label: 'تیکت‌های باز', value: health.openTickets, color: health.openTickets > 10 ? '#e07a7a' : '#e0c14f' },
              ].map((s, i) => (
                <div key={i} className="bg-bg-card border border-border rounded-2xl p-4">
                  <div className="text-xs text-text-muted mb-2">{s.label}</div>
                  <div className="text-3xl font-black" style={{ color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
            <div className="bg-green-dim border border-green/30 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-dim border border-green/40 flex items-center justify-center text-2xl">✓</div>
              <div>
                <div className="font-bold text-green">سیستم سالم است</div>
                <div className="text-xs text-text-muted mt-0.5">تمامی سرویس‌ها در حال اجرا هستند</div>
              </div>
            </div>
          </div>
        )}

        {tab === 'لاگ‌ها' && (
          <div>
            <h1 className="text-base font-bold mb-4">لاگ‌های سیستم</h1>
            <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
              <div className="grid grid-cols-4 gap-3 px-4 py-3 text-xs text-text-dim border-b border-border">
                {['زمان', 'کاربر', 'عملیات', 'موجودیت'].map(h => <div key={h}>{h}</div>)}
              </div>
              {logs.data?.map((l: any) => (
                <div key={l.id} className="grid grid-cols-4 gap-3 px-4 py-2.5 items-center border-b border-border/30 text-xs hover:bg-white/[.02]">
                  <div className="text-text-dim">{new Date(l.createdAt).toLocaleString('fa-IR')}</div>
                  <div className="text-text-secondary">{l.user?.fullName || 'سیستم'}</div>
                  <div><span className="text-[10px] bg-white/[.05] px-1.5 py-0.5 rounded text-text-secondary">{l.action}</span></div>
                  <div className="text-text-muted">{l.entityType}{l.entityId ? ` #${l.entityId.slice(-6)}` : ''}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Password Reset Modal */}
      {showPwModal && pwTarget && (
        <Modal title={`بازنشانی رمز: ${pwTarget.fullName}`} onClose={() => setShowPwModal(false)}>
          <div className="space-y-4">
            <div className="text-xs text-text-muted bg-white/[.04] rounded-xl p-3">
              رمز عبور برای <strong className="text-text-primary">{pwTarget.email}</strong> تغییر خواهد کرد.
            </div>
            {pwError && <div className="text-xs text-red bg-red/10 border border-red/20 rounded-xl p-3">{pwError}</div>}
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">رمز عبور جدید</label>
              <input type="password" value={pwForm.password} onChange={e => setPwForm(p => ({ ...p, password: e.target.value }))} dir="ltr" placeholder="حداقل ۶ کاراکتر" className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">تأیید رمز عبور</label>
              <input type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} dir="ltr" placeholder="تکرار رمز عبور" className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm focus:outline-none" />
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
