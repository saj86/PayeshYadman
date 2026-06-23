'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getStoredUser, logout, canAccess, getRedirectPath } from '@/lib/auth'
import api from '@/lib/api'

const TABS = ['داشبورد', 'نقش‌ها', 'مناطق', 'تنظیمات', 'کاربران']

export default function AdminPage() {
  const router = useRouter()
  const user = getStoredUser()
  const [tab, setTab] = useState('داشبورد')
  const [stats, setStats] = useState<any>(null)
  const [regions, setRegions] = useState<any[]>([])
  const [users, setUsers] = useState<any>({ data: [] })
  const [settings, setSettings] = useState<any[]>([])
  const [newUser, setNewUser] = useState({ email: '', fullName: '', password: 'Admin1234', roleNames: 'CITIZEN', appTypes: 'CITIZEN' })
  const [settingValues, setSettingValues] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!user) { router.replace('/'); return }
    if (!canAccess(user, 'ADMIN')) { router.replace(getRedirectPath(user)); return }
    loadAll()
  }, [])

  async function loadAll() {
    try {
      const [s, r, u, sv] = await Promise.all([
        api.get('/dashboard/hq'),
        api.get('/regions/tree'),
        api.get('/users?limit=50'),
        api.get('/settings'),
      ])
      setStats(s)
      setRegions(Array.isArray(r) ? r : [])
      setUsers(u)
      if (Array.isArray(sv)) {
        setSettings(sv)
        const vals: Record<string, string> = {}
        sv.forEach((s: any) => { vals[s.key] = s.value })
        setSettingValues(vals)
      }
    } catch(e) { console.error(e) }
  }

  async function saveSetting(key: string) {
    try {
      await api.put(`/settings/${key}`, { value: settingValues[key] || '' })
      alert('ذخیره شد')
    } catch (e: any) { alert(e.message) }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault()
    try {
      await api.post('/users', {
        email: newUser.email,
        fullName: newUser.fullName,
        password: newUser.password,
        roleNames: newUser.roleNames.split(',').map(r => r.trim()),
        appTypes: newUser.appTypes.split(',').map(a => a.trim()),
      })
      setNewUser({ email: '', fullName: '', password: 'Admin1234', roleNames: 'CITIZEN', appTypes: 'CITIZEN' })
      const u = await api.get('/users?limit=50')
      setUsers(u)
    } catch(e: any) { alert(e.message) }
  }

  const kpis = stats?.kpis || {}

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
                { label: 'رفتن به داشبورد ستاد', icon: '📊', path: '/hq', color: '#c2a35a' },
                { label: 'مدیریت کاربران', icon: '👥', path: undefined, action: () => setTab('کاربران'), color: '#5aa9e6' },
                { label: 'تنظیمات سیستم', icon: '⚙️', path: undefined, action: () => setTab('تنظیمات'), color: '#b08ce0' },
              ].map((a, i) => (
                <button key={i} onClick={() => a.path ? router.push(a.path) : a.action?.()}
                  className="bg-bg-card border border-border rounded-2xl p-5 text-right hover:border-gold/30 transition-all">
                  <div className="text-2xl mb-2">{a.icon}</div>
                  <div className="text-sm font-semibold" style={{ color: a.color }}>{a.label}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'کاربران' && (
          <div>
            <div className="grid grid-cols-[1fr_320px] gap-5">
              <div>
                <div className="text-base font-bold mb-3">لیست کاربران ({users.total || 0} نفر)</div>
                <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="grid grid-cols-4 gap-3 px-4 py-3 text-xs text-text-dim border-b border-border">
                    {['نام', 'ایمیل', 'نقش', 'اپ دسترسی'].map(h => <div key={h}>{h}</div>)}
                  </div>
                  {users.data?.slice(0, 20).map((u: any) => (
                    <div key={u.id} className="grid grid-cols-4 gap-3 px-4 py-3 items-center border-b border-border/30 text-xs">
                      <div className="font-semibold text-sm">{u.fullName}</div>
                      <div className="text-text-muted">{u.email}</div>
                      <div className="flex flex-wrap gap-1">
                        {u.userRoles?.map((ur: any) => (
                          <span key={ur.roleId} className="text-[9px] bg-gold-dim text-gold px-1 py-0.5 rounded">{ur.role?.name}</span>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {u.userAppAccess?.map((a: any) => (
                          <span key={a.appType} className="text-[9px] bg-blue-dim text-blue px-1 py-0.5 rounded">{a.appType}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-bg-card border border-border rounded-2xl p-5">
                <div className="text-sm font-bold mb-4">ایجاد کاربر جدید</div>
                <form onSubmit={createUser} className="space-y-3">
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">نام کامل</label>
                    <input required value={newUser.fullName} onChange={e => setNewUser(p => ({...p, fullName: e.target.value}))} className="w-full px-3 py-2 bg-bg-dark border border-border rounded-lg text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">ایمیل</label>
                    <input required type="email" value={newUser.email} onChange={e => setNewUser(p => ({...p, email: e.target.value}))} className="w-full px-3 py-2 bg-bg-dark border border-border rounded-lg text-sm focus:outline-none font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">رمز اولیه</label>
                    <input value={newUser.password} onChange={e => setNewUser(p => ({...p, password: e.target.value}))} className="w-full px-3 py-2 bg-bg-dark border border-border rounded-lg text-sm focus:outline-none font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">نقش (با کاما جدا کنید)</label>
                    <input value={newUser.roleNames} onChange={e => setNewUser(p => ({...p, roleNames: e.target.value}))} placeholder="CITIZEN, INSPECTOR ..." className="w-full px-3 py-2 bg-bg-dark border border-border rounded-lg text-sm focus:outline-none font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">دسترسی اپ</label>
                    <input value={newUser.appTypes} onChange={e => setNewUser(p => ({...p, appTypes: e.target.value}))} placeholder="CITIZEN, HQ ..." className="w-full px-3 py-2 bg-bg-dark border border-border rounded-lg text-sm focus:outline-none font-mono" />
                  </div>
                  <button type="submit" className="w-full py-2.5 rounded-xl font-bold text-sm" style={{ background: '#c2a35a', color: '#1a1206' }}>ایجاد کاربر</button>
                </form>
              </div>
            </div>
          </div>
        )}

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
                      <span className="text-[10px] text-text-dim mr-1">{r.level}</span>
                    </div>
                    {r._count && <span className="text-xs text-text-muted">{r._count.children} زیرمجموعه</span>}
                  </div>
                  {r.children?.length > 0 && (
                    <div className="mr-4 mt-2 space-y-1">
                      {r.children.slice(0, 5).map((c: any) => (
                        <div key={c.id} className="flex items-center gap-2 text-xs text-text-muted py-1 border-r-2 border-border pr-3">
                          <span>{c.name}</span>
                          <span className="text-text-dim">{c.code}</span>
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
                    <input
                      type={s.type}
                      value={settingValues[s.key] ?? ''}
                      onChange={e => setSettingValues(p => ({ ...p, [s.key]: e.target.value }))}
                      className="flex-1 px-3 py-2 bg-bg-dark border border-border rounded-lg text-sm focus:outline-none"
                    />
                    <button onClick={() => saveSetting(s.key)} className="px-3 py-2 border border-border rounded-lg text-xs text-text-muted hover:border-gold/40 hover:text-gold transition-all">ذخیره</button>
                  </div>
                  <div className="text-[11px] text-text-dim mt-1 font-mono">{s.key}</div>
                </div>
              ))}
            </div>
          </div>
        )}

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
      </div>
    </div>
  )
}
