'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getStoredUser, logout, canAccess, getRedirectPath } from '@/lib/auth'
import api from '@/lib/api'
import dynamic from 'next/dynamic'

const MapView = dynamic(() => import('@/components/hq/MapView'), { ssr: false })

const TABS = [
  { id: 'overview', label: 'نظارت کلی' },
  { id: 'map', label: 'نقشه عملیاتی' },
  { id: 'approvals', label: 'سلسله‌مراتب' },
  { id: 'missing', label: 'گمشدگان' },
  { id: 'criteria', label: 'معیارها' },
  { id: 'reports', label: 'گزارش‌ها' },
]

export default function HQPage() {
  const router = useRouter()
  const user = getStoredUser()
  const [tab, setTab] = useState('overview')
  const [stats, setStats] = useState<any>(null)
  const [inspectionStats, setInspectionStats] = useState<any>(null)
  const [activity, setActivity] = useState<any[]>([])
  const [missingList, setMissingList] = useState<any[]>([])
  const [newMissing, setNewMissing] = useState({ name: '', age: '', gender: 'MALE', status: 'MISSING', description: '', lastSeenLocation: '', contactPhone: '' })
  const [minScore, setMinScore] = useState(60)
  const [maxIssues, setMaxIssues] = useState(2)
  const [loading, setLoading] = useState(true)
  const [savingCriteria, setSavingCriteria] = useState(false)

  useEffect(() => {
    if (!user) { router.replace('/'); return }
    if (!canAccess(user, 'HQ')) { router.replace(getRedirectPath(user)); return }
    Promise.all([
      api.get('/dashboard/hq'),
      api.get('/inspections/stats'),
      api.get('/dashboard/activity?limit=15'),
      api.get('/lost-found?status=MISSING'),
      api.get('/settings'),
    ]).then(([s, is, act, missing, sv]) => {
      setStats(s); setInspectionStats(is)
      setActivity(Array.isArray(act) ? act : [])
      setMissingList(Array.isArray(missing) ? missing : [])
      if (Array.isArray(sv)) {
        const minS = sv.find((x: any) => x.key === 'min_score_threshold')
        const maxI = sv.find((x: any) => x.key === 'max_issues_conditional')
        if (minS) setMinScore(parseInt(minS.value) || 60)
        if (maxI) setMaxIssues(parseInt(maxI.value) || 2)
      }
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  async function saveCriteria() {
    setSavingCriteria(true)
    try {
      await Promise.all([
        api.put('/settings/min_score_threshold', { value: String(minScore) }),
        api.put('/settings/max_issues_conditional', { value: String(maxIssues) }),
      ])
    } catch (e: any) { alert(e.message) }
    finally { setSavingCriteria(false) }
  }

  function doLogout() { logout(); router.push('/') }

  async function addMissing(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await api.post('/lost-found', { ...newMissing, age: parseInt(newMissing.age) || undefined, lastSeenAt: new Date().toISOString() })
      setMissingList(prev => [res, ...prev])
      setNewMissing({ name: '', age: '', gender: 'MALE', status: 'MISSING', description: '', lastSeenLocation: '', contactPhone: '' })
    } catch (e: any) { alert(e.message) }
  }

  const kpis = stats?.kpis || {}

  const KPI_CARDS = [
    { label: 'کل رکوردها', value: kpis.totalSubmissions || 0, unit: 'رکورد', color: '#5aa9e6', trend: '+۱۲٪', sub: 'از ۲۲ منطقه' },
    { label: 'تأیید شده', value: kpis.approvedSubmissions || 0, unit: 'مورد', color: '#56c48a', trend: `${kpis.approvalRate || 0}٪`, sub: 'نرخ تأیید' },
    { label: 'در انتظار بررسی', value: kpis.pendingSubmissions || 0, unit: 'مورد', color: '#e0c14f', trend: 'فوری', sub: 'نیاز به اقدام' },
    { label: 'بازدید مجدد', value: kpis.revisitSubmissions || 0, unit: 'مورد', color: '#e07a7a', trend: 'بازرسی', sub: 'در صف بازرس' },
    { label: 'گزارش شهروند', value: kpis.totalCitizenReports || 0, unit: 'گزارش', color: '#b08ce0', trend: 'جدید', sub: `${kpis.pendingReports || 0} در انتظار` },
    { label: 'اضطراری', value: kpis.totalEmergencies || 0, unit: 'مورد', color: '#e07a7a', trend: 'فوری', sub: 'نیاز به پاسخ سریع' },
    { label: 'گمشدگان فعال', value: kpis.activeMissing || 0, unit: 'نفر', color: '#e0c14f', trend: 'پیگیری', sub: 'ثبت‌شده' },
    { label: 'کاربران فعال', value: kpis.totalUsers || 0, unit: 'نفر', color: '#56c48a', trend: 'آنلاین', sub: 'در سامانه' },
  ]

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-text-muted">در حال بارگذاری...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 h-16 border-b border-border sticky top-0 z-30 bg-bg-dark">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full border border-gold/50 flex items-center justify-center text-[8px] text-gold font-mono" style={{ background: 'repeating-linear-gradient(135deg,rgba(194,163,90,.14) 0 5px,transparent 5px 10px)' }}>آرم</div>
          <div>
            <div className="font-bold text-[15px]">سامانهٔ یکپارچهٔ نظارت و پایش</div>
            <div className="text-[11px] text-text-muted">قرارگاه بازرسی و نظارت — داشبورد ستاد</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/[.03] p-1 rounded-xl border border-border">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${tab === t.id ? 'bg-gold/20 text-gold' : 'text-text-muted hover:text-text-primary'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-green">
            <span className="w-2 h-2 rounded-full bg-green live-pulse" />زنده
          </div>
          <span className="text-xs text-text-secondary border-r border-border pl-4">۱۵ تیر ۱۴۰۵</span>
          <button onClick={doLogout} className="text-[12.5px] text-text-muted px-3 py-1.5 border border-border rounded-lg hover:text-text-primary hover:border-border/50">خروج</button>
        </div>
      </header>

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <div className="p-5 fade-up">
          <div className="flex items-center justify-between mb-4">
            <div className="text-base font-bold">وضعیت لحظه‌ای مراسم</div>
            <div className="text-xs text-text-muted">آخرین به‌روزرسانی: لحظاتی پیش — تجمیع از ۲۲ منطقه</div>
          </div>

          {/* KPI Grid */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            {KPI_CARDS.map((k, i) => (
              <div key={i} className="bg-bg-card border border-border rounded-2xl p-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[3px] h-full rounded-full" style={{ background: k.color }} />
                <div className="flex items-center justify-between mb-2.5">
                  <div className="text-xs text-text-muted">{k.label}</div>
                  <div className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ color: k.color, background: `${k.color}22` }}>{k.trend}</div>
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <div className="text-[27px] font-black">{k.value.toLocaleString('fa-IR')}</div>
                  <div className="text-xs text-text-muted">{k.unit}</div>
                </div>
                <div className="h-1 bg-white/[.06] rounded-full mb-2">
                  <div className="h-full rounded-full bar-grow" style={{ width: `${Math.min((k.value / 100) * 100, 100)}%`, background: k.color }} />
                </div>
                <div className="text-[11px] text-text-dim">{k.sub}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[1.55fr_1fr] gap-3">
            {/* Regions table */}
            <div className="bg-bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-bold">عملکرد مناطق</div>
                <div className="text-xs text-text-muted">۶ منطقهٔ منتخب</div>
              </div>
              <div className="grid grid-cols-6 gap-2 text-[11px] text-text-dim pb-2 border-b border-border mb-1">
                {['منطقه', 'نواحی', 'آمادگی', 'اشغال', 'موکب', 'وضعیت'].map(h => <div key={h}>{h}</div>)}
              </div>
              {(stats?.regionStats || []).slice(0, 6).map((r: any, i: number) => (
                <div key={i} className="grid grid-cols-6 gap-2 items-center text-[12.5px] py-2.5 border-b border-border/50">
                  <div className="font-semibold text-text-primary">{r.name}</div>
                  <div className="text-text-secondary">{r._count?.children || 0}</div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-1 bg-white/[.07] rounded-full"><div className="h-full bg-green rounded-full" style={{ width: '84%' }} /></div>
                    <span className="text-[11px] text-text-secondary">۸۴٪</span>
                  </div>
                  <div className="text-text-secondary">۶۸٪</div>
                  <div className="text-text-secondary">۱۲</div>
                  <div><span className="text-[11px] font-semibold text-green bg-green-dim px-2 py-0.5 rounded-md">آماده</span></div>
                </div>
              ))}
            </div>

            {/* Right column: Alerts + Activity */}
            <div className="flex flex-col gap-3">
              <div className="bg-bg-card border border-border rounded-2xl p-4">
                <div className="text-sm font-bold mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red" />هشدارهای فعال
                </div>
                <div className="space-y-2">
                  {[
                    { level: 'بحرانی', txt: 'تراکم بالای جمعیت — مصلی ورودی شرقی', color: '#e07a7a', bg: 'rgba(224,122,122,.08)' },
                    { level: 'هشدار', txt: 'کمبود سرویس بهداشتی — ناحیه ۳ منطقه ۷', color: '#e0c14f', bg: 'rgba(224,193,79,.08)' },
                    { level: 'اطلاع', txt: 'ترافیک بزرگراه همت — انتظار ۲۰ دقیقه', color: '#5aa9e6', bg: 'rgba(90,169,230,.08)' },
                  ].map((a, i) => (
                    <div key={i} className="rounded-xl p-3" style={{ background: a.bg, border: `1px solid ${a.color}44` }}>
                      <div className="text-[11px] font-bold mb-1" style={{ color: a.color }}>{a.level}</div>
                      <div className="text-xs text-text-secondary leading-6">{a.txt}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-bg-card border border-border rounded-2xl p-4 flex-1">
                <div className="text-sm font-bold mb-3">جریان زندهٔ فعالیت</div>
                <div className="space-y-0">
                  {activity.slice(0, 8).map((a: any, i: number) => (
                    <div key={i} className="flex gap-2.5 py-2 border-b border-border/40">
                      <div className="text-[11px] text-text-dim min-w-[36px] pt-0.5">
                        {new Date(a.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="flex-1">
                        <span className="text-[10px] font-semibold text-blue bg-white/[.05] px-1.5 py-0.5 rounded ml-1.5">{a.entityType}</span>
                        <span className="text-xs text-text-secondary leading-6">{a.action} توسط {a.user?.fullName || 'سیستم'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAP */}
      {tab === 'map' && (
        <div className="p-5 grid grid-cols-[220px_1fr_260px] gap-3 fade-up">
          <div className="bg-bg-card border border-border rounded-2xl p-4 h-fit">
            <div className="text-sm font-bold mb-3">لایه‌های نقشه</div>
            {['محوطه وداع', 'مسیر تشییع', 'پارکینگ‌ها', 'سرویس بهداشتی', 'ایستگاه آب', 'موکب پذیرایی', 'پایگاه پزشکی', 'نقاط بحرانی'].map((l, i) => (
              <div key={i} className="flex items-center gap-2.5 py-2 px-2.5 rounded-lg hover:bg-white/[.04] cursor-pointer">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: ['#c2a35a','#5aa9e6','#56c48a','#e07a7a','#5aa9e6','#e0c14f','#b08ce0','#e07a7a'][i] }} />
                <span className="text-[12.5px] text-text-secondary flex-1">{l}</span>
                <span className="w-3.5 h-3.5 rounded border text-[8px] flex items-center justify-center" style={{ borderColor: ['#c2a35a','#5aa9e6','#56c48a','#e07a7a','#5aa9e6','#e0c14f','#b08ce0','#e07a7a'][i], background: ['#c2a35a','#5aa9e6','#56c48a','#e07a7a','#5aa9e6','#e0c14f','#b08ce0','#e07a7a'][i], color: '#070d15' }}>✓</span>
              </div>
            ))}
          </div>
          <div className="border border-border rounded-2xl overflow-hidden h-[580px] relative">
            <MapView />
          </div>
          <div className="flex flex-col gap-3">
            <div className="bg-gold-dim border border-gold/30 rounded-2xl p-4">
              <div className="text-sm text-gold font-bold mb-1.5">کانون رویداد — مصلی امام خمینی(ره)</div>
              <div className="text-xs text-text-secondary leading-7">محل برنامهٔ وداع (۱۳ و ۱۴ تیر) و آغاز مسیر تشییع (۱۵ تیر). تراکم پیش‌بینی‌شده: <span className="text-red font-bold">بسیار بالا</span></div>
            </div>
            <div className="bg-bg-card border border-border rounded-2xl p-4 flex-1">
              <div className="text-sm font-bold mb-3">خلاصهٔ پهنه‌ها</div>
              {[
                { name: 'محوطهٔ وداع', status: 'آماده', color: '#56c48a', bg: 'rgba(86,196,138,.12)' },
                { name: 'مسیر تشییع تا آزادی', status: '۷۸٪', color: '#e0c14f', bg: 'rgba(224,193,79,.12)' },
                { name: 'بهشت‌زهرا(س)', status: 'آماده', color: '#56c48a', bg: 'rgba(86,196,138,.12)' },
                { name: 'مبادی ورودی شهر', status: '۶۵٪', color: '#e0c14f', bg: 'rgba(224,193,79,.12)' },
                { name: 'پارکینگ‌ها و پایانه‌ها', status: 'آماده', color: '#56c48a', bg: 'rgba(86,196,138,.12)' },
              ].map((z, i) => (
                <div key={i} className="flex justify-between items-center py-2.5 text-[12.5px]">
                  <span className="text-text-secondary">{z.name}</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md" style={{ color: z.color, background: z.bg }}>{z.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* APPROVALS */}
      {tab === 'approvals' && (
        <div className="p-5 fade-up">
          <div className="text-base font-bold mb-1.5">سلسله‌مراتب نظارتی و گردش تأیید</div>
          <div className="text-xs text-text-muted mb-5">هر داده در ناحیه ثبت، در منطقه توسط بازرس تأیید، و سپس در ستاد تجمیع می‌شود</div>

          <div className="grid grid-cols-[1fr_32px_1fr_32px_1fr_32px_1fr] items-center gap-2 mb-5">
            {[
              { num: '۱', label: 'ناحیه — ثبت', desc: 'کاربر ناحیه داده‌ها را ثبت می‌کند', value: kpis.totalSubmissions || 0, unit: 'رکورد', color: '#56c48a', bg: 'rgba(86,196,138,.1)', border: 'rgba(86,196,138,.3)' },
              null,
              { num: '۲', label: 'قرارگاه — تأیید', desc: 'مسئول قرارگاه بررسی و ارجاع به بازرس', value: kpis.pendingSubmissions || 0, unit: 'در انتظار', color: '#b08ce0', bg: 'rgba(176,140,224,.1)', border: 'rgba(176,140,224,.3)' },
              null,
              { num: '۳', label: 'بازرس — بازرسی', desc: 'بازرس میدانی تأیید یا بازدید مجدد', value: kpis.revisitSubmissions || 0, unit: 'در صف', color: '#e0c14f', bg: 'rgba(224,193,79,.1)', border: 'rgba(224,193,79,.3)' },
              null,
              { num: '۴', label: 'ستاد — تجمیع', desc: 'داشبورد تحلیلی و گزارش‌ها', value: kpis.approvedSubmissions || 0, unit: 'تأیید', color: '#c2a35a', bg: 'rgba(194,163,90,.1)', border: 'rgba(194,163,90,.3)' },
            ].map((item, i) =>
              item === null
                ? <div key={i} className="text-center text-text-dim text-lg">→</div>
                : (
                  <div key={i} className="rounded-2xl p-3.5" style={{ background: item.bg, border: `1px solid ${item.border}` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold" style={{ background: `${item.color}22`, color: item.color }}>{item.num}</span>
                      <span className="font-bold text-[12.5px]">{item.label}</span>
                    </div>
                    <div className="text-[11px] text-text-secondary leading-6 mb-2">{item.desc}</div>
                    <div className="text-xl font-black" style={{ color: item.color }}>{item.value.toLocaleString('fa-IR')}<span className="text-xs text-text-muted font-normal mr-1">{item.unit}</span></div>
                  </div>
                )
            )}
          </div>

          <div className="bg-bg-card border border-border rounded-2xl p-4">
            <div className="text-sm font-bold mb-3">آخرین رکوردهای ثبت‌شده</div>
            <div className="grid grid-cols-6 gap-3 text-[11px] text-text-dim pb-2 border-b border-border">
              {['کد', 'حوزه', 'محل', 'منطقه', 'ثبت‌کننده', 'وضعیت'].map(h => <div key={h}>{h}</div>)}
            </div>
            <div className="text-xs text-text-muted text-center py-8">داده‌ای برای نمایش وجود ندارد</div>
          </div>
        </div>
      )}

      {/* MISSING PERSONS */}
      {tab === 'missing' && (
        <div className="p-5 fade-up">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-base font-bold">مدیریت گمشدگان</div>
              <div className="text-xs text-text-muted mt-1">ثبت و پیگیری افراد گمشده و پیداشده</div>
            </div>
            <div className="flex gap-3">
              <div className="flex items-center gap-2 bg-red-dim border border-red/25 rounded-xl px-3 py-2 text-sm">
                <span className="text-red font-black">{missingList.filter(m => m.status === 'MISSING').length}</span>
                <span className="text-text-secondary">گمشده</span>
              </div>
              <div className="flex items-center gap-2 bg-green-dim border border-green/25 rounded-xl px-3 py-2 text-sm">
                <span className="text-green font-black">{missingList.filter(m => m.status === 'FOUND').length}</span>
                <span className="text-text-secondary">پیدا شده</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_1.4fr] gap-4">
            <div className="bg-bg-card border border-border rounded-2xl p-5">
              <div className="text-sm font-bold mb-4">ثبت فرد گمشده / پیداشده</div>
              <form onSubmit={addMissing} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">نام</label>
                    <input value={newMissing.name} onChange={e => setNewMissing(p => ({...p, name: e.target.value}))} placeholder="نام و نام خانوادگی" className="w-full px-3 py-2 bg-bg-dark border border-border rounded-lg text-sm focus:outline-none focus:border-gold/50" />
                  </div>
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">سن</label>
                    <input value={newMissing.age} onChange={e => setNewMissing(p => ({...p, age: e.target.value}))} placeholder="مثلاً ۶" className="w-full px-3 py-2 bg-bg-dark border border-border rounded-lg text-sm focus:outline-none focus:border-gold/50" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">جنسیت</label>
                    <select value={newMissing.gender} onChange={e => setNewMissing(p => ({...p, gender: e.target.value}))} className="w-full px-3 py-2 bg-bg-dark border border-border rounded-lg text-sm focus:outline-none">
                      <option value="MALE">پسر/مرد</option><option value="FEMALE">دختر/زن</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">وضعیت</label>
                    <select value={newMissing.status} onChange={e => setNewMissing(p => ({...p, status: e.target.value}))} className="w-full px-3 py-2 bg-bg-dark border border-border rounded-lg text-sm focus:outline-none">
                      <option value="MISSING">گمشده</option><option value="FOUND">پیدا شده</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">مشخصات ظاهری</label>
                  <input value={newMissing.description} onChange={e => setNewMissing(p => ({...p, description: e.target.value}))} placeholder="لباس، رنگ مو، علائم..." className="w-full px-3 py-2 bg-bg-dark border border-border rounded-lg text-sm focus:outline-none focus:border-gold/50" />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">آخرین محل مشاهده</label>
                  <input value={newMissing.lastSeenLocation} onChange={e => setNewMissing(p => ({...p, lastSeenLocation: e.target.value}))} placeholder="مثلاً مصلی — ورودی شرقی" className="w-full px-3 py-2 bg-bg-dark border border-border rounded-lg text-sm focus:outline-none focus:border-gold/50" />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">تماس اعلام‌کننده</label>
                  <input type="tel" value={newMissing.contactPhone} onChange={e => setNewMissing(p => ({...p, contactPhone: e.target.value}))} placeholder="۰۹..." className="w-full px-3 py-2 bg-bg-dark border border-border rounded-lg text-sm font-mono focus:outline-none focus:border-gold/50" />
                </div>
                <button type="submit" className="w-full py-3 rounded-xl font-black text-sm" style={{ background: '#e0c14f', color: '#1a1206' }}>
                  ثبت در سامانهٔ گمشدگان
                </button>
              </form>
            </div>

            <div className="bg-bg-card border border-border rounded-2xl p-5">
              <div className="text-sm font-bold mb-4">لیست افراد ثبت‌شده</div>
              {missingList.length === 0 && <div className="text-center text-text-muted text-sm py-8">هیچ موردی ثبت نشده</div>}
              {missingList.map((m: any) => (
                <div key={m.id} className="flex gap-3 py-3.5 border-b border-border/40 fade-up">
                  <div className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center text-lg font-bold" style={{ background: m.status === 'MISSING' ? 'rgba(224,122,122,.15)' : 'rgba(86,196,138,.15)', color: m.status === 'MISSING' ? '#e07a7a' : '#56c48a', border: `1px solid ${m.status === 'MISSING' ? 'rgba(224,122,122,.3)' : 'rgba(86,196,138,.3)'}` }}>
                    {m.status === 'MISSING' ? '?' : '✓'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-bold">{m.name} <span className="text-xs text-text-muted font-normal">{m.gender === 'MALE' ? 'پسر' : 'دختر'}{m.age ? ` • ${m.age} ساله` : ''}</span></div>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg" style={{ color: m.status === 'MISSING' ? '#e07a7a' : '#56c48a', background: m.status === 'MISSING' ? 'rgba(224,122,122,.12)' : 'rgba(86,196,138,.12)' }}>{m.status === 'MISSING' ? 'گمشده' : 'پیدا شده'}</span>
                    </div>
                    <div className="text-xs text-text-secondary mb-1">{m.description}</div>
                    <div className="text-[11px] text-text-muted">{m.lastSeenLocation} • {m.contactPhone}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CRITERIA */}
      {tab === 'criteria' && (
        <div className="p-5 fade-up">
          <div className="text-base font-bold mb-1">تنظیم معیارهای ارزیابی</div>
          <div className="text-xs text-text-muted mb-5">مدیر کل می‌تواند آستانهٔ امتیاز و حداکثر ایراد قابل قبول برای تأیید را تعیین کند</div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-bg-card border border-border rounded-2xl p-5">
              <div className="text-sm font-bold mb-4">تنظیمات حکم ارزیابی</div>
              <div className="space-y-5">
                <div>
                  <label className="block text-xs text-text-secondary mb-2">حداقل امتیاز برای تأیید (درصد)</label>
                  <input type="range" min={40} max={90} value={minScore} onChange={e => setMinScore(parseInt(e.target.value))} className="w-full cursor-pointer accent-blue" />
                  <div className="flex justify-between text-[11px] text-text-muted mt-1"><span>۴۰٪</span><span className="font-bold text-blue">{minScore}٪</span><span>۹۰٪</span></div>
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-2">حداکثر ایراد برای تأیید مشروط</label>
                  <input type="range" min={0} max={5} value={maxIssues} onChange={e => setMaxIssues(parseInt(e.target.value))} className="w-full cursor-pointer accent-yellow" />
                  <div className="flex justify-between text-[11px] text-text-muted mt-1"><span>۰</span><span className="font-bold text-yellow">{maxIssues} ایراد</span><span>۵</span></div>
                </div>
              </div>
              <div className="bg-green-dim border border-green/25 rounded-xl p-3 mt-4">
                <div className="text-[11px] text-green leading-7">
                  <div className="font-bold mb-1">نحوهٔ حکم:</div>
                  <div>• امتیاز ≥{minScore}٪ + بدون ایراد = <strong>تأیید کامل</strong></div>
                  <div>• امتیاز ≥{minScore - 20}٪ + ≤{maxIssues} ایراد = <strong>تأیید مشروط</strong></div>
                  <div>• سایر موارد = <strong>مردود</strong></div>
                </div>
              </div>
              <button onClick={saveCriteria} disabled={savingCriteria}
                className="w-full mt-4 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                style={{ background: 'rgba(90,169,230,.15)', color: '#5aa9e6', border: '1px solid rgba(90,169,230,.3)' }}>
                {savingCriteria ? 'در حال ذخیره...' : 'ذخیره معیارها'}
              </button>
            </div>

            <div className="bg-bg-card border border-border rounded-2xl p-5">
              <div className="text-sm font-bold mb-4">بندهای اولویت‌دار</div>
              <div className="space-y-2.5">
                {[
                  { label: 'ظرفیت و امنیت', badge: 'اجباری', color: '#e07a7a' },
                  { label: 'سرویس بهداشتی و آب', badge: 'اولویت ۱', color: '#5aa9e6' },
                  { label: 'پذیرایی و غذا', badge: 'اولویت ۲', color: '#e0c14f' },
                  { label: 'حمل‌ونقل و دسترسی', badge: 'اولویت ۳', color: '#56c48a' },
                ].map((p, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl p-3" style={{ background: `${p.color}12`, border: `1px solid ${p.color}33` }}>
                    <span className="text-[12.5px] text-text-secondary">{p.label}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ color: p.color, background: `${p.color}22` }}>{p.badge}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REPORTS */}
      {tab === 'reports' && (
        <div className="p-5 fade-up">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-base font-bold">گزارش‌های سیستمی و تحلیلی</div>
              <div className="text-xs text-text-muted mt-1">گزارش روزانه به ستاد مرکزی</div>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 border border-gold/40 text-gold rounded-lg text-sm font-semibold">دریافت گزارش روزانه (PDF)</button>
              <button className="px-4 py-2 border border-border text-text-secondary rounded-lg text-sm">خروجی Excel</button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label: 'رکوردهای تأیید شده', value: kpis.approvedSubmissions || 0, color: '#56c48a' },
              { label: 'گزارش‌های شهروندی', value: kpis.totalCitizenReports || 0, color: '#5aa9e6' },
              { label: 'موارد اضطراری', value: kpis.totalEmergencies || 0, color: '#e07a7a' },
              { label: 'نرخ تأیید', value: `${kpis.approvalRate || 0}٪`, color: '#c2a35a' },
            ].map((r, i) => (
              <div key={i} className="bg-bg-card border border-border rounded-2xl p-4">
                <div className="text-xs text-text-muted mb-2">{r.label}</div>
                <div className="text-2xl font-black" style={{ color: r.color }}>{typeof r.value === 'number' ? r.value.toLocaleString('fa-IR') : r.value}</div>
              </div>
            ))}
          </div>

          <div className="bg-bg-card border border-border rounded-2xl p-4">
            <div className="text-sm font-bold mb-4">توزیع رکوردها بر اساس وضعیت</div>
            <div className="flex items-end gap-4 h-40 pb-2">
              {inspectionStats && Object.entries(inspectionStats).map(([status, count]: any) => (
                <div key={status} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <div className="text-xs font-bold text-text-secondary">{count}</div>
                  <div className="w-full rounded-t-lg bar-grow" style={{ height: `${Math.max((count / Math.max(...Object.values(inspectionStats) as number[])) * 100, 5)}%`, background: { APPROVED: '#56c48a', REJECTED: '#e07a7a', PENDING: '#e0c14f', REVISIT: '#5aa9e6', CONDITIONAL: '#b08ce0', COMMANDER_REVIEW: '#c2a35a', INSPECTOR_ASSIGNED: '#56c48a' }[status] || '#56708c' }} />
                  <div className="text-[10px] text-text-dim text-center leading-4">{{ APPROVED: 'تأیید', REJECTED: 'رد', PENDING: 'انتظار', REVISIT: 'بازدید', CONDITIONAL: 'مشروط', COMMANDER_REVIEW: 'قرارگاه', INSPECTOR_ASSIGNED: 'بازرس' }[status] || status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
