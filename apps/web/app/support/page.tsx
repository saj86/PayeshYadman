'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getStoredUser, logout, canAccess, getRedirectPath } from '@/lib/auth'
import api from '@/lib/api'

const TABS = ['کاربران', 'تیکت‌ها', 'سلامت سیستم', 'لاگ‌ها']

export default function SupportPage() {
  const router = useRouter()
  const user = getStoredUser()
  const [tab, setTab] = useState('کاربران')
  const [users, setUsers] = useState<any>({ data: [], total: 0 })
  const [tickets, setTickets] = useState<any>({ data: [], total: 0 })
  const [health, setHealth] = useState<any>(null)
  const [logs, setLogs] = useState<any>({ data: [] })
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { router.replace('/'); return }
    if (!canAccess(user, 'SUPPORT')) { router.replace(getRedirectPath(user)); return }
    loadAll()
  }, [])

  async function loadAll() {
    try {
      const [u, t, h, l] = await Promise.all([
        api.get('/users?limit=20'),
        api.get('/support/tickets?limit=20'),
        api.get('/support/health'),
        api.get('/audit-logs?limit=30'),
      ])
      setUsers(u); setTickets(t); setHealth(h); setLogs(l)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function searchUsers(q: string) {
    const r = await api.get(`/users?search=${q}&limit=20`)
    setUsers(r)
  }

  async function resetPassword(id: string) {
    if (!confirm('آیا از بازنشانی رمز مطمئن هستید؟')) return
    try {
      await api.patch(`/users/${id}/reset-password`, { password: 'Admin1234' })
      alert('رمز به Admin1234 تغییر کرد')
    } catch (e: any) { alert(e.message) }
  }

  async function updateTicket(id: string, status: string) {
    try {
      await api.put(`/support/tickets/${id}/status`, { status })
      const t = await api.get('/support/tickets?limit=20')
      setTickets(t)
    } catch (e: any) { alert(e.message) }
  }

  const statusLabel: Record<string, string> = {
    OPEN: 'باز', IN_PROGRESS: 'در حال بررسی', RESOLVED: 'حل شده', CLOSED: 'بسته',
    PENDING: 'انتظار', ASSIGNED: 'ارجاع', REVISIT: 'بازدید',
  }
  const statusColor: Record<string, string> = {
    OPEN: '#e07a7a', IN_PROGRESS: '#5aa9e6', RESOLVED: '#56c48a', CLOSED: '#56708c',
    PENDING: '#e0c14f', ASSIGNED: '#5aa9e6',
  }

  if (!user) return <div className="min-h-screen bg-bg" />

  const isSuperAdmin = user.roles.includes('SUPER_ADMIN')

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
            <div className="flex items-center gap-3 mb-4">
              <h1 className="text-base font-bold">مدیریت کاربران</h1>
              <span className="text-xs text-text-muted bg-bg-card px-2 py-1 rounded-lg border border-border">{users.total} کاربر</span>
              <input value={search} onChange={e => { setSearch(e.target.value); searchUsers(e.target.value) }} placeholder="جستجوی نام یا ایمیل..." className="mr-auto px-3 py-2 bg-bg-card border border-border rounded-lg text-sm focus:outline-none w-60" />
            </div>
            <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
              <div className="grid grid-cols-5 gap-3 px-4 py-3 text-xs text-text-dim border-b border-border">
                {['نام', 'ایمیل', 'نقش', 'وضعیت', 'عملیات'].map(h => <div key={h}>{h}</div>)}
              </div>
              {loading && <div className="text-center py-8 text-text-muted text-sm">بارگذاری...</div>}
              {users.data?.map((u: any) => (
                <div key={u.id} className="grid grid-cols-5 gap-3 px-4 py-3 items-center border-b border-border/40 text-sm hover:bg-white/[.02] transition-all">
                  <div className="font-semibold">{u.fullName}</div>
                  <div className="text-text-muted text-xs">{u.email}</div>
                  <div className="flex flex-wrap gap-1">
                    {u.userRoles?.map((ur: any) => (
                      <span key={ur.roleId} className="text-[10px] bg-blue-dim text-blue px-1.5 py-0.5 rounded">{ur.role?.displayName}</span>
                    ))}
                  </div>
                  <div><span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${u.isActive ? 'text-green bg-green-dim' : 'text-red bg-red-dim'}`}>{u.isActive ? 'فعال' : 'غیرفعال'}</span></div>
                  <div className="flex gap-1.5">
                    <button onClick={() => resetPassword(u.id)} className="text-[11px] px-2 py-1 rounded border border-border text-text-muted hover:text-text-primary hover:border-border/80">بازنشانی رمز</button>
                  </div>
                </div>
              ))}
            </div>
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
    </div>
  )
}
