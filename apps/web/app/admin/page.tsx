'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getStoredUser, logout, canAccess, getRedirectPath } from '@/lib/auth'
import api from '@/lib/api'

const TABS = ['داشبورد', 'کاربران', 'اسکان', 'مناطق', 'نقش‌ها', 'تنظیمات']

const ALL_ROLES = [
  { name: 'HQ_MANAGER', label: 'مسئول ستاد' },
  { name: 'COMMANDER', label: 'مسئول قرارگاه' },
  { name: 'INSPECTOR', label: 'بازرس میدانی' },
  { name: 'DISTRICT_MANAGER', label: 'مسئول ناحیه' },
  { name: 'CITIZEN', label: 'شهروند' },
  { name: 'SUPPORT', label: 'پشتیبانی' },
  { name: 'ACCOMMODATION_MANAGER', label: 'مسئول اسکان' },
]

const ALL_APP_TYPES = [
  { name: 'HQ', label: 'ستاد (HQ)' },
  { name: 'INSPECTOR', label: 'بازرس' },
  { name: 'CITIZEN', label: 'شهروند' },
  { name: 'SUPPORT', label: 'پشتیبانی' },
  { name: 'DISTRICT', label: 'ناحیه' },
  { name: 'ADMIN', label: 'مدیر کل' },
  { name: 'COMMANDER', label: 'قرارگاه' },
  { name: 'ACCOMMODATION', label: 'اسکان' },
]

const ROLE_FILTER_OPTIONS = [
  { value: '', label: 'همه نقش‌ها' },
  ...ALL_ROLES,
  { name: 'SUPER_ADMIN', label: 'مدیر کل' },
].map(r => ({ value: (r as any).name || (r as any).value, label: r.label }))

function Pagination({ page, totalPages, total, onPage }: { page: number; totalPages: number; total: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null
  const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
    if (totalPages <= 7) return i + 1
    if (page <= 4) return i + 1
    if (page >= totalPages - 3) return totalPages - 6 + i
    return page - 3 + i
  })
  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <div className="text-xs text-text-muted">{total.toLocaleString('fa-IR')} کاربر</div>
      <div className="flex items-center gap-1">
        <button disabled={page === 1} onClick={() => onPage(page - 1)} className="w-8 h-8 rounded-lg border border-border text-text-muted text-sm hover:border-white/20 disabled:opacity-30">◄</button>
        {pages.map(p => (
          <button key={p} onClick={() => onPage(p)} className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${p === page ? 'bg-gold/20 text-gold border border-gold/30' : 'border border-border text-text-muted hover:border-white/20'}`}>{p}</button>
        ))}
        <button disabled={page === totalPages} onClick={() => onPage(page + 1)} className="w-8 h-8 rounded-lg border border-border text-text-muted text-sm hover:border-white/20 disabled:opacity-30">►</button>
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

export default function AdminPage() {
  const router = useRouter()
  const user = getStoredUser()
  const [tab, setTab] = useState('داشبورد')
  const [stats, setStats] = useState<any>(null)
  const [regions, setRegions] = useState<any[]>([])
  const [settings, setSettings] = useState<any[]>([])
  const [settingValues, setSettingValues] = useState<Record<string, string>>({})

  // Users state
  const [users, setUsers] = useState<any>({ data: [], total: 0, page: 1, totalPages: 1 })
  const [userPage, setUserPage] = useState(1)
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('')
  const [userStatusFilter, setUserStatusFilter] = useState('active')
  const [usersLoading, setUsersLoading] = useState(false)

  // User modal state
  const [showUserModal, setShowUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [userForm, setUserForm] = useState({ fullName: '', email: '', password: '', roleNames: [] as string[], appTypes: [] as string[] })
  const [userSaving, setUserSaving] = useState(false)

  // Password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordTarget, setPasswordTarget] = useState<any>(null)
  const [pwForm, setPwForm] = useState({ password: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')

  // Accommodation state
  const [places, setPlaces] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [assigningPlace, setAssigningPlace] = useState<any>(null)
  const [assignUserId, setAssignUserId] = useState('')
  const [showPlaceModal, setShowPlaceModal] = useState(false)
  const [placeForm, setPlaceForm] = useState({ name: '', address: '', regionId: '', capacity: '', contactPhone: '' })
  const [placeSaving, setPlaceSaving] = useState(false)

  useEffect(() => {
    if (!user) { router.replace('/'); return }
    if (!canAccess(user, 'ADMIN')) { router.replace(getRedirectPath(user)); return }
    loadDashboard()
  }, [])

  async function loadDashboard() {
    try {
      const [s, r, sv] = await Promise.all([
        api.get('/dashboard/hq'),
        api.get('/regions/tree'),
        api.get('/settings'),
      ])
      setStats(s)
      setRegions(Array.isArray(r) ? r : [])
      if (Array.isArray(sv)) {
        setSettings(sv)
        const vals: Record<string, string> = {}
        sv.forEach((s: any) => { vals[s.key] = s.value })
        setSettingValues(vals)
      }
    } catch (e) { console.error(e) }
  }

  const loadUsers = useCallback(async (page = 1, search = userSearch, role = userRoleFilter, status = userStatusFilter) => {
    setUsersLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' })
      if (search) params.set('search', search)
      if (role) params.set('role', role)
      params.set('status', status)
      const res = await api.get(`/users?${params}`)
      setUsers(res)
      setUserPage(page)
    } catch (e) { console.error(e) }
    finally { setUsersLoading(false) }
  }, [userSearch, userRoleFilter, userStatusFilter])

  useEffect(() => {
    if (tab === 'کاربران') loadUsers(1, userSearch, userRoleFilter, userStatusFilter)
  }, [tab, userStatusFilter, userRoleFilter])

  async function loadPlaces() {
    try {
      const [p, u] = await Promise.all([
        api.get('/accommodation/places'),
        api.get('/users?limit=100&status=active'),
      ])
      setPlaces(Array.isArray(p) ? p : [])
      setAllUsers(u?.data || [])
    } catch (e) { console.error(e) }
  }

  useEffect(() => {
    if (tab === 'اسکان') loadPlaces()
  }, [tab])

  function openCreate() {
    setEditingUser(null)
    setUserForm({ fullName: '', email: '', password: 'Admin1234', roleNames: [], appTypes: [] })
    setShowUserModal(true)
  }

  function openEdit(u: any) {
    setEditingUser(u)
    setUserForm({
      fullName: u.fullName,
      email: u.email,
      password: '',
      roleNames: u.userRoles?.map((ur: any) => ur.role?.name).filter(Boolean) || [],
      appTypes: u.userAppAccess?.map((a: any) => a.appType) || [],
    })
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
          email: userForm.email,
          fullName: userForm.fullName,
          password: userForm.password || 'Admin1234',
          roleNames: userForm.roleNames,
          appTypes: userForm.appTypes,
        })
      }
      setShowUserModal(false)
      await loadUsers(userPage)
    } catch (e: any) { alert(e.message) }
    finally { setUserSaving(false) }
  }

  function openPasswordReset(u: any) {
    setPasswordTarget(u)
    setPwForm({ password: '', confirm: '' })
    setPwError('')
    setShowPasswordModal(true)
  }

  async function doPasswordReset() {
    if (pwForm.password !== pwForm.confirm) { setPwError('رمز عبور و تأیید آن یکسان نیستند'); return }
    if (pwForm.password.length < 6) { setPwError('رمز عبور باید حداقل ۶ کاراکتر باشد'); return }
    setPwSaving(true)
    try {
      await api.patch(`/users/${passwordTarget.id}/reset-password`, { password: pwForm.password })
      setShowPasswordModal(false)
    } catch (e: any) { setPwError(e.message) }
    finally { setPwSaving(false) }
  }

  async function toggleActive(u: any) {
    try {
      await api.patch(`/users/${u.id}/toggle-active`, { isActive: !u.isActive })
      await loadUsers(userPage)
    } catch (e: any) { alert(e.message) }
  }

  async function assignManager() {
    if (!assigningPlace || !assignUserId) return
    try {
      await api.put(`/accommodation/places/${assigningPlace.id}/manager`, { userId: assignUserId })
      setAssigningPlace(null)
      setAssignUserId('')
      await loadPlaces()
    } catch (e: any) { alert(e.message) }
  }

  async function createPlace() {
    setPlaceSaving(true)
    try {
      await api.post('/accommodation/places', {
        name: placeForm.name,
        address: placeForm.address,
        regionId: placeForm.regionId,
        capacity: parseInt(placeForm.capacity),
        contactPhone: placeForm.contactPhone || undefined,
        isActive: true,
      })
      setShowPlaceModal(false)
      setPlaceForm({ name: '', address: '', regionId: '', capacity: '', contactPhone: '' })
      await loadPlaces()
    } catch (e: any) { alert(e.message) }
    finally { setPlaceSaving(false) }
  }

  async function saveSetting(key: string) {
    try {
      await api.put(`/settings/${key}`, { value: settingValues[key] || '' })
    } catch (e: any) { alert(e.message) }
  }

  const kpis = stats?.kpis || {}

  if (!user) return null

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="flex items-center justify-between px-5 h-14 border-b border-border sticky top-0 z-30 bg-bg-dark">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg border border-gold/40 flex items-center justify-center text-[8px] text-gold font-mono">آرم</div>
          <div className="font-bold text-sm">پنل مدیر کل سیستم</div>
        </div>
        <div className="flex gap-1 bg-white/[.03] p-1 rounded-xl border border-border">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === t ? 'bg-gold/20 text-gold' : 'text-text-muted hover:text-text-primary'}`}>{t}</button>
          ))}
        </div>
        <button onClick={() => { logout(); router.push('/') }} className="text-xs text-text-muted px-3 py-1.5 border border-border rounded-lg">خروج</button>
      </header>

      <div className="p-5 fade-up">

        {/* DASHBOARD */}
        {tab === 'داشبورد' && (
          <div>
            <div className="text-base font-bold mb-4">خلاصه وضعیت سیستم</div>
            <div className="grid grid-cols-4 gap-3 mb-5">
              {[
                { label: 'کل کاربران', value: kpis.totalUsers, color: '#5aa9e6' },
                { label: 'کل رکوردها', value: kpis.totalSubmissions, color: '#c2a35a' },
                { label: 'تأیید شده', value: kpis.approvedSubmissions, color: '#56c48a' },
                { label: 'گزارش شهروندی', value: kpis.totalCitizenReports, color: '#b08ce0' },
              ].map((k, i) => (
                <div key={i} className="bg-bg-card border border-border rounded-2xl p-5">
                  <div className="text-xs text-text-muted mb-2">{k.label}</div>
                  <div className="text-3xl font-black" style={{ color: k.color }}>{(k.value || 0).toLocaleString('fa-IR')}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'مدیریت کاربران', icon: '👥', action: () => setTab('کاربران'), color: '#5aa9e6' },
                { label: 'مدیریت اسکان', icon: '🏠', action: () => setTab('اسکان'), color: '#56c48a' },
                { label: 'تنظیمات سیستم', icon: '⚙️', action: () => setTab('تنظیمات'), color: '#b08ce0' },
              ].map((a, i) => (
                <button key={i} onClick={a.action} className="bg-bg-card border border-border rounded-2xl p-5 text-right hover:border-gold/30 transition-all">
                  <div className="text-2xl mb-2">{a.icon}</div>
                  <div className="text-sm font-semibold" style={{ color: a.color }}>{a.label}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* USERS */}
        {tab === 'کاربران' && (
          <div>
            {/* Filters */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <h1 className="text-base font-bold">مدیریت کاربران</h1>
              <div className="flex-1 min-w-0" />
              <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadUsers(1, userSearch)}
                placeholder="جستجوی نام یا ایمیل..." className="px-3 py-2 bg-bg-card border border-border rounded-lg text-sm focus:outline-none w-52" />
              <select value={userRoleFilter} onChange={e => setUserRoleFilter(e.target.value)} className="px-3 py-2 bg-bg-card border border-border rounded-lg text-sm focus:outline-none">
                {ROLE_FILTER_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <select value={userStatusFilter} onChange={e => setUserStatusFilter(e.target.value)} className="px-3 py-2 bg-bg-card border border-border rounded-lg text-sm focus:outline-none">
                <option value="active">فعال</option>
                <option value="inactive">غیرفعال</option>
                <option value="all">همه</option>
              </select>
              <button onClick={() => loadUsers(1, userSearch)} className="px-3 py-2 border border-border rounded-lg text-xs text-text-muted hover:border-white/20">جستجو</button>
              <button onClick={openCreate} className="px-4 py-2 rounded-lg text-xs font-bold" style={{ background: '#c2a35a', color: '#1a1206' }}>+ ایجاد کاربر</button>
            </div>

            <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
              <div className="grid grid-cols-[2fr_2fr_2fr_1.5fr_1fr_1.5fr] gap-3 px-4 py-3 text-xs text-text-dim border-b border-border">
                {['نام', 'ایمیل', 'نقش‌ها', 'دسترسی اپ', 'وضعیت', 'عملیات'].map(h => <div key={h}>{h}</div>)}
              </div>
              {usersLoading && <div className="text-center py-8 text-text-muted text-sm">بارگذاری...</div>}
              {!usersLoading && users.data?.length === 0 && <div className="text-center py-8 text-text-muted text-sm">کاربری یافت نشد</div>}
              {users.data?.map((u: any) => (
                <div key={u.id} className="grid grid-cols-[2fr_2fr_2fr_1.5fr_1fr_1.5fr] gap-3 px-4 py-3 items-center border-b border-border/40 text-sm hover:bg-white/[.02] transition-all">
                  <div className="font-semibold truncate">{u.fullName}</div>
                  <div className="text-text-muted text-xs truncate">{u.email}</div>
                  <div className="flex flex-wrap gap-1">
                    {u.userRoles?.map((ur: any) => (
                      <span key={ur.roleId} className="text-[9px] bg-gold/10 text-gold px-1.5 py-0.5 rounded border border-gold/20">{ALL_ROLES.find(r => r.name === ur.role?.name)?.label || ur.role?.name}</span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {u.userAppAccess?.map((a: any) => (
                      <span key={a.appType} className="text-[9px] bg-blue/10 text-blue px-1.5 py-0.5 rounded border border-blue/20">{a.appType}</span>
                    ))}
                  </div>
                  <div><span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${u.isActive ? 'text-green bg-green/10 border border-green/20' : 'text-red bg-red/10 border border-red/20'}`}>{u.isActive ? 'فعال' : 'غیرفعال'}</span></div>
                  <div className="flex gap-1.5">
                    <button onClick={() => openEdit(u)} className="text-[10px] px-2 py-1 rounded border border-border text-text-muted hover:text-blue hover:border-blue/30 transition-all">ویرایش</button>
                    <button onClick={() => openPasswordReset(u)} className="text-[10px] px-2 py-1 rounded border border-border text-text-muted hover:text-yellow hover:border-yellow/30 transition-all">رمز</button>
                    <button onClick={() => toggleActive(u)} className={`text-[10px] px-2 py-1 rounded border transition-all ${u.isActive ? 'border-red/30 text-red hover:bg-red/10' : 'border-green/30 text-green hover:bg-green/10'}`}>{u.isActive ? 'غیرفعال' : 'فعال'}</button>
                  </div>
                </div>
              ))}
            </div>

            <Pagination page={userPage} totalPages={users.totalPages || 1} total={users.total || 0} onPage={p => loadUsers(p)} />
          </div>
        )}

        {/* ACCOMMODATION */}
        {tab === 'اسکان' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="text-base font-bold">مدیریت اماکن اسکان</div>
              <button onClick={() => setShowPlaceModal(true)} className="px-4 py-2 rounded-lg text-xs font-bold" style={{ background: '#56c48a', color: '#070d15' }}>+ ایجاد مکان جدید</button>
            </div>
            <div className="space-y-3">
              {places.map((pl: any) => (
                <div key={pl.id} className="bg-bg-card border border-border rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-sm font-bold">{pl.name}</div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${pl.status === 'APPROVED' ? 'text-green bg-green/10 border border-green/20' : pl.status === 'PENDING' ? 'text-yellow bg-yellow/10 border border-yellow/20' : 'text-red bg-red/10 border border-red/20'}`}>{pl.status === 'APPROVED' ? 'تأیید شده' : pl.status === 'PENDING' ? 'در انتظار' : 'رد شده'}</span>
                      </div>
                      <div className="text-xs text-text-muted mb-2">{pl.address} — {pl.region?.name}</div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-text-dim">ظرفیت: <strong className="text-text-primary">{pl.capacity}</strong></span>
                        <span className="text-text-dim">اشغال: <strong className="text-yellow">{pl.currentOccupancy}</strong></span>
                        <span className="text-text-dim">مدیر: <strong className={pl.manager ? 'text-green' : 'text-red'}>{pl.manager?.fullName || 'تعیین نشده'}</strong></span>
                      </div>
                    </div>
                    <button onClick={() => { setAssigningPlace(pl); setAssignUserId(pl.managerId || '') }}
                      className="text-xs px-3 py-2 rounded-xl border border-border text-text-muted hover:border-blue/40 hover:text-blue transition-all flex-shrink-0">
                      {pl.manager ? 'تغییر مدیر' : 'تعیین مدیر'}
                    </button>
                  </div>

                  {assigningPlace?.id === pl.id && (
                    <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
                      <select value={assignUserId} onChange={e => setAssignUserId(e.target.value)}
                        className="flex-1 px-3 py-2 bg-bg-dark border border-border rounded-lg text-sm focus:outline-none">
                        <option value="">کاربر را انتخاب کنید...</option>
                        {allUsers.map((u: any) => (
                          <option key={u.id} value={u.id}>{u.fullName} — {u.email}</option>
                        ))}
                      </select>
                      <button onClick={assignManager} disabled={!assignUserId}
                        className="px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-40"
                        style={{ background: '#56c48a', color: '#070d15' }}>تعیین مدیر</button>
                      <button onClick={() => setAssigningPlace(null)}
                        className="px-3 py-2 rounded-lg text-xs border border-border text-text-muted">لغو</button>
                    </div>
                  )}
                </div>
              ))}
              {places.length === 0 && <div className="text-center py-12 text-text-muted text-sm border border-border rounded-2xl">هیچ مکانی یافت نشد</div>}
            </div>
          </div>
        )}

        {/* REGIONS */}
        {tab === 'مناطق' && (
          <div>
            <div className="text-base font-bold mb-4">ساختار مناطق و نواحی</div>
            <div className="space-y-2">
              {regions.map((r: any) => (
                <div key={r.id} className="bg-bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-sm">{r.name}</span>
                      <span className="text-[10px] text-text-dim mr-2 bg-white/[.05] px-1.5 py-0.5 rounded">{r.code}</span>
                    </div>
                    {r._count && <span className="text-xs text-text-muted">{r._count.children} زیرمجموعه</span>}
                  </div>
                  {r.children?.length > 0 && (
                    <div className="mr-4 mt-2 space-y-1">
                      {r.children.slice(0, 5).map((c: any) => (
                        <div key={c.id} className="flex items-center gap-2 text-xs text-text-muted py-1 border-r-2 border-border pr-3">
                          <span>{c.name}</span><span className="text-text-dim">{c.code}</span>
                        </div>
                      ))}
                      {r.children.length > 5 && <div className="text-xs text-text-dim pr-3">و {r.children.length - 5} مورد دیگر...</div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ROLES */}
        {tab === 'نقش‌ها' && (
          <div>
            <div className="text-base font-bold mb-4">نقش‌ها و سطوح دسترسی</div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: 'SUPER_ADMIN', label: 'مدیر کل', color: '#e9eef4', perms: 'دسترسی کامل به تمام بخش‌ها' },
                { name: 'HQ_MANAGER', label: 'مسئول ستاد', color: '#c2a35a', perms: 'داشبورد، گزارش، نقشه، سلسله‌مراتب' },
                { name: 'COMMANDER', label: 'مسئول قرارگاه', color: '#b08ce0', perms: 'بررسی رکوردها، ارجاع به بازرس' },
                { name: 'INSPECTOR', label: 'بازرس میدانی', color: '#5aa9e6', perms: 'بازرسی با چک‌لیست، تأیید/رد' },
                { name: 'DISTRICT_MANAGER', label: 'مسئول ناحیه', color: '#56c48a', perms: 'ثبت داده‌های ناحیه' },
                { name: 'CITIZEN', label: 'شهروند', color: '#e0c14f', perms: 'گزارش، اسکان، گمشده، اضطراری' },
                { name: 'SUPPORT', label: 'پشتیبانی', color: '#e07a7a', perms: 'مدیریت کاربران، تیکت‌ها' },
                { name: 'ACCOMMODATION_MANAGER', label: 'مسئول اسکان', color: '#56c48a', perms: 'مدیریت اماکن اسکان' },
              ].map(r => (
                <div key={r.name} className="bg-bg-card border border-border rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: r.color }} />
                    <div className="font-bold text-sm">{r.label}</div>
                    <code className="text-[10px] text-text-dim bg-white/[.05] px-1.5 py-0.5 rounded mr-auto">{r.name}</code>
                  </div>
                  <div className="text-xs text-text-muted leading-6">{r.perms}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {tab === 'تنظیمات' && (
          <div className="max-w-xl">
            <div className="text-base font-bold mb-4">تنظیمات سیستم</div>
            <div className="bg-bg-card border border-border rounded-2xl p-5 space-y-4">
              {[
                { key: 'min_score_threshold', label: 'حداقل امتیاز تأیید (٪)', type: 'number' },
                { key: 'max_issues_conditional', label: 'حداکثر ایراد برای تأیید مشروط', type: 'number' },
                { key: 'app_name', label: 'نام سامانه', type: 'text' },
                { key: 'event_name', label: 'نام رویداد جاری', type: 'text' },
                { key: 'event_dates', label: 'تاریخ رویداد', type: 'text' },
              ].map(s => (
                <div key={s.key}>
                  <label className="block text-xs text-text-secondary mb-1">{s.label}</label>
                  <div className="flex gap-2">
                    <input type={s.type} value={settingValues[s.key] ?? ''} onChange={e => setSettingValues(p => ({ ...p, [s.key]: e.target.value }))} className="flex-1 px-3 py-2 bg-bg-dark border border-border rounded-lg text-sm focus:outline-none" />
                    <button onClick={() => saveSetting(s.key)} className="px-3 py-2 border border-border rounded-lg text-xs text-text-muted hover:border-gold/40 hover:text-gold transition-all">ذخیره</button>
                  </div>
                  <div className="text-[11px] text-text-dim mt-1 font-mono">{s.key}</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* User Create/Edit Modal */}
      {showUserModal && (
        <Modal title={editingUser ? `ویرایش: ${editingUser.fullName}` : 'ایجاد کاربر جدید'} onClose={() => setShowUserModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">نام کامل</label>
              <input required value={userForm.fullName} onChange={e => setUserForm(p => ({ ...p, fullName: e.target.value }))} className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm focus:outline-none focus:border-gold/50" />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">ایمیل</label>
              <input required type="email" value={userForm.email} onChange={e => setUserForm(p => ({ ...p, email: e.target.value }))} dir="ltr" className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm focus:outline-none focus:border-gold/50 font-mono" />
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
            <div className="flex gap-2 pt-2">
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

      {/* Create Place Modal */}
      {showPlaceModal && (
        <Modal title="ایجاد مکان اسکان جدید" onClose={() => setShowPlaceModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">نام مکان</label>
              <input value={placeForm.name} onChange={e => setPlaceForm(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm focus:outline-none" placeholder="مثال: مجتمع مسکونی بهاران" />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">منطقه</label>
              <select value={placeForm.regionId} onChange={e => setPlaceForm(p => ({ ...p, regionId: e.target.value }))} className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm focus:outline-none">
                <option value="">انتخاب منطقه...</option>
                {regions.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">ظرفیت (نفر)</label>
                <input type="number" min="1" value={placeForm.capacity} onChange={e => setPlaceForm(p => ({ ...p, capacity: e.target.value }))} className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">تلفن تماس</label>
                <input value={placeForm.contactPhone} onChange={e => setPlaceForm(p => ({ ...p, contactPhone: e.target.value }))} dir="ltr" className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm focus:outline-none text-left" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">آدرس</label>
              <textarea value={placeForm.address} onChange={e => setPlaceForm(p => ({ ...p, address: e.target.value }))} rows={2} className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm focus:outline-none resize-none" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowPlaceModal(false)} className="flex-1 py-2.5 rounded-xl border border-border text-sm text-text-muted">لغو</button>
              <button onClick={createPlace} disabled={placeSaving || !placeForm.name || !placeForm.regionId || !placeForm.capacity}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
                style={{ background: '#56c48a', color: '#070d15' }}>
                {placeSaving ? 'در حال ذخیره...' : 'ایجاد مکان'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Password Reset Modal */}
      {showPasswordModal && passwordTarget && (
        <Modal title={`بازنشانی رمز: ${passwordTarget.fullName}`} onClose={() => setShowPasswordModal(false)}>
          <div className="space-y-4">
            <div className="text-xs text-text-muted bg-white/[.04] rounded-xl p-3">
              رمز عبور برای کاربر <strong className="text-text-primary">{passwordTarget.email}</strong> تغییر خواهد کرد. کاربر از رمز فعلی خود مطلع نخواهید شد.
            </div>
            {pwError && <div className="text-xs text-red bg-red/10 border border-red/20 rounded-xl p-3">{pwError}</div>}
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">رمز عبور جدید</label>
              <input type="password" value={pwForm.password} onChange={e => setPwForm(p => ({ ...p, password: e.target.value }))} placeholder="حداقل ۶ کاراکتر" dir="ltr" className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">تأیید رمز عبور جدید</label>
              <input type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} placeholder="تکرار رمز عبور" dir="ltr" className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm focus:outline-none" />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowPasswordModal(false)} className="flex-1 py-2.5 rounded-xl border border-border text-sm text-text-muted">لغو</button>
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
