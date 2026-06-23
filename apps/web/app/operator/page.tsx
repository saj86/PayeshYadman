'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getStoredUser, logout, canAccess, getRedirectPath } from '@/lib/auth'
import api from '@/lib/api'

const CATEGORIES = [
  'آلودگی محیطی', 'زیرساخت', 'ایمنی', 'خدمات شهری',
  'فضای سبز', 'نور و روشنایی', 'حمل‌ونقل', 'سایر',
]

const PRIORITIES = [
  { value: 'LOW',      label: 'کم',      color: '#56c48a' },
  { value: 'MEDIUM',   label: 'متوسط',   color: '#5aa9e6' },
  { value: 'HIGH',     label: 'بالا',    color: '#e0c14f' },
  { value: 'CRITICAL', label: 'بحرانی', color: '#e07a7a' },
]

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING:     { label: 'در انتظار',     color: '#e0c14f' },
  ASSIGNED:    { label: 'ارجاع شده',    color: '#5aa9e6' },
  IN_PROGRESS: { label: 'در حال بررسی', color: '#b08ce0' },
  RESOLVED:    { label: 'رفع شده',       color: '#56c48a' },
  CLOSED:      { label: 'بسته شده',     color: '#7e93a8' },
}

const EMPTY_FORM = {
  callerName: '', callerPhone: '', category: '', title: '',
  description: '', address: '', priority: 'MEDIUM',
}

export default function OperatorPage() {
  const router = useRouter()
  const user = getStoredUser()
  const [tab, setTab] = useState<'new' | 'list'>('new')
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [submitting, setSubmitting] = useState(false)
  const [successId, setSuccessId] = useState<string | null>(null)
  const [reports, setReports] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loadingList, setLoadingList] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [todayCount, setTodayCount] = useState(0)

  useEffect(() => {
    if (!user) { router.replace('/'); return }
    if (!canAccess(user, 'OPERATOR_137')) { router.replace(getRedirectPath(user)); return }
    loadStats()
  }, [])

  useEffect(() => {
    if (tab === 'list') loadReports()
  }, [tab, page, filterStatus])

  async function loadStats() {
    try {
      const res = await api.get('/reports?source=OPERATOR_137&limit=1')
      setTodayCount(res?.total ?? 0)
    } catch {}
  }

  const loadReports = useCallback(async () => {
    setLoadingList(true)
    try {
      const params = new URLSearchParams({ source: 'OPERATOR_137', page: String(page), limit: '15' })
      if (filterStatus) params.set('status', filterStatus)
      const res = await api.get(`/reports?${params}`)
      setReports(res?.data || [])
      setTotal(res?.total || 0)
    } catch (e) { console.error(e) }
    finally { setLoadingList(false) }
  }, [page, filterStatus])

  function setF(k: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }))
  }

  async function submitReport(e: React.FormEvent) {
    e.preventDefault()
    if (!form.callerName || !form.callerPhone || !form.category || !form.title || !form.description) return
    setSubmitting(true)
    try {
      const res = await api.post('/reports', { ...form, source: 'OPERATOR_137' })
      setSuccessId(res.id)
      setForm({ ...EMPTY_FORM })
      setTodayCount(c => c + 1)
    } catch (e: any) { alert(e.message || 'خطا در ثبت گزارش') }
    finally { setSubmitting(false) }
  }

  if (!user) return null

  const totalPages = Math.ceil(total / 15)

  return (
    <div className="min-h-screen bg-bg flex flex-col" dir="rtl">
      {/* Header */}
      <header className="flex items-center justify-between px-5 h-14 border-b border-border sticky top-0 z-30 bg-bg-dark">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black"
            style={{ background: 'rgba(86,196,138,.15)', color: '#56c48a', border: '1px solid rgba(86,196,138,.3)' }}>
            ۱۳۷
          </div>
          <div>
            <div className="font-bold text-sm">سامانه ۱۳۷ شهرداری</div>
            <div className="text-[11px] text-text-muted">{user.fullName}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-[11px] text-text-muted px-2 py-1 bg-white/[.03] rounded-lg border border-border">
            امروز: <span className="text-green font-bold">{todayCount}</span> گزارش
          </div>
          <button onClick={() => { logout(); router.push('/') }}
            className="text-xs text-text-muted px-3 py-1.5 border border-border rounded-lg hover:border-white/20">
            خروج
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <div className="flex gap-1 p-3 border-b border-border bg-bg-dark">
        <button onClick={() => setTab('new')}
          className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${tab === 'new' ? 'text-bg' : 'text-text-muted hover:text-text-primary'}`}
          style={tab === 'new' ? { background: '#56c48a' } : {}}>
          ثبت تماس جدید
        </button>
        <button onClick={() => { setTab('list'); setPage(1) }}
          className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${tab === 'list' ? 'text-bg' : 'text-text-muted hover:text-text-primary'}`}
          style={tab === 'list' ? { background: '#5aa9e6' } : {}}>
          گزارش‌های ثبت شده
        </button>
      </div>

      <div className="flex-1 p-4 max-w-2xl mx-auto w-full fade-up">

        {/* ── New Call Form ── */}
        {tab === 'new' && (
          <div>
            {successId && (
              <div className="mb-4 p-4 rounded-2xl border flex items-start gap-3"
                style={{ background: 'rgba(86,196,138,.08)', borderColor: 'rgba(86,196,138,.3)' }}>
                <span className="text-green text-lg">✓</span>
                <div>
                  <div className="text-sm font-bold text-green">گزارش با موفقیت ثبت شد</div>
                  <div className="text-xs text-text-muted mt-0.5">کد پیگیری: <span className="font-mono text-text-primary">{successId.slice(-8).toUpperCase()}</span></div>
                </div>
                <button onClick={() => setSuccessId(null)} className="mr-auto text-text-muted text-lg leading-none">×</button>
              </div>
            )}

            <form onSubmit={submitReport} className="space-y-4">
              {/* Caller info block */}
              <div className="bg-bg-card border border-border rounded-2xl p-4">
                <div className="text-xs font-bold text-text-secondary mb-3 flex items-center gap-2">
                  <span style={{ color: '#56c48a' }}>☎</span> اطلاعات تماس‌گیرنده
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">نام شهروند <span className="text-red">*</span></label>
                    <input required value={form.callerName} onChange={setF('callerName')}
                      placeholder="نام و نام خانوادگی"
                      className="w-full px-3 py-2.5 bg-bg-dark border border-border rounded-xl text-sm focus:outline-none focus:border-green/40" />
                  </div>
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">شماره تماس <span className="text-red">*</span></label>
                    <input required type="tel" value={form.callerPhone} onChange={setF('callerPhone')}
                      placeholder="۰۹۱۲..." dir="ltr"
                      className="w-full px-3 py-2.5 bg-bg-dark border border-border rounded-xl text-sm font-mono focus:outline-none focus:border-green/40" />
                  </div>
                </div>
              </div>

              {/* Report details */}
              <div className="bg-bg-card border border-border rounded-2xl p-4 space-y-3">
                <div className="text-xs font-bold text-text-secondary mb-1 flex items-center gap-2">
                  <span style={{ color: '#5aa9e6' }}>📋</span> جزئیات گزارش
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">دسته‌بندی <span className="text-red">*</span></label>
                    <select required value={form.category} onChange={setF('category')}
                      className="w-full px-3 py-2.5 bg-bg-dark border border-border rounded-xl text-sm focus:outline-none focus:border-blue/40">
                      <option value="">انتخاب کنید...</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">اولویت</label>
                    <div className="flex gap-1">
                      {PRIORITIES.map(p => (
                        <button type="button" key={p.value} onClick={() => setForm(f => ({ ...f, priority: p.value }))}
                          className="flex-1 py-2 rounded-lg text-[10px] font-bold border transition-all"
                          style={form.priority === p.value
                            ? { background: `${p.color}25`, color: p.color, borderColor: `${p.color}50` }
                            : { borderColor: 'rgba(255,255,255,.1)', color: '#7e93a8' }}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-text-secondary mb-1">عنوان گزارش <span className="text-red">*</span></label>
                  <input required value={form.title} onChange={setF('title')}
                    placeholder="خلاصه مشکل را بنویسید..."
                    className="w-full px-3 py-2.5 bg-bg-dark border border-border rounded-xl text-sm focus:outline-none focus:border-blue/40" />
                </div>

                <div>
                  <label className="block text-xs text-text-secondary mb-1">توضیحات <span className="text-red">*</span></label>
                  <textarea required value={form.description} onChange={setF('description')}
                    rows={4} placeholder="توضیحات کامل شهروند را ثبت کنید..."
                    className="w-full px-3 py-2.5 bg-bg-dark border border-border rounded-xl text-sm focus:outline-none focus:border-blue/40 resize-none leading-6" />
                </div>

                <div>
                  <label className="block text-xs text-text-secondary mb-1">آدرس محل</label>
                  <input value={form.address} onChange={setF('address')}
                    placeholder="آدرس دقیق مشکل گزارش شده..."
                    className="w-full px-3 py-2.5 bg-bg-dark border border-border rounded-xl text-sm focus:outline-none focus:border-blue/40" />
                </div>
              </div>

              <button type="submit" disabled={submitting}
                className="w-full py-3 rounded-2xl font-bold text-sm transition-all disabled:opacity-40"
                style={{ background: submitting ? 'rgba(86,196,138,.5)' : '#56c48a', color: '#070d15' }}>
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
                    در حال ثبت...
                  </span>
                ) : 'ثبت گزارش تماس'}
              </button>
            </form>
          </div>
        )}

        {/* ── Reports List ── */}
        {tab === 'list' && (
          <div>
            {/* Filters */}
            <div className="flex gap-2 mb-4">
              <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
                className="px-3 py-2 bg-bg-card border border-border rounded-xl text-sm flex-1 focus:outline-none focus:border-blue/40">
                <option value="">همه وضعیت‌ها</option>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <div className="text-xs text-text-muted flex items-center px-3 py-2 bg-bg-card border border-border rounded-xl">
                {total} گزارش
              </div>
            </div>

            {loadingList && (
              <div className="text-center py-12 text-text-muted text-sm">در حال بارگذاری...</div>
            )}

            {!loadingList && reports.length === 0 && (
              <div className="text-center py-16 text-text-muted text-sm border border-border rounded-2xl">
                گزارشی ثبت نشده
              </div>
            )}

            <div className="space-y-3">
              {reports.map((r: any) => {
                const st = STATUS_LABELS[r.status] || STATUS_LABELS.PENDING
                const pr = PRIORITIES.find(p => p.value === r.priority) || PRIORITIES[1]
                return (
                  <div key={r.id} className="bg-bg-card border border-border rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold truncate">{r.title}</div>
                        <div className="text-xs text-text-muted mt-0.5">{r.category}</div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{ color: pr.color, background: `${pr.color}20` }}>{pr.label}</span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg"
                          style={{ color: st.color, background: `${st.color}20` }}>{st.label}</span>
                      </div>
                    </div>

                    {/* Caller info */}
                    {(r.callerName || r.callerPhone) && (
                      <div className="flex items-center gap-3 text-xs text-text-secondary mb-2 bg-white/[.03] rounded-lg px-3 py-1.5">
                        <span>☎ {r.callerName}</span>
                        {r.callerPhone && <span className="font-mono">{r.callerPhone}</span>}
                      </div>
                    )}

                    {r.description && (
                      <div className="text-xs text-text-secondary leading-6 mb-2 line-clamp-2">{r.description}</div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-text-dim pt-2 border-t border-border/40">
                      {r.address && <span className="truncate flex-1 ml-2">{r.address}</span>}
                      <span className="flex-shrink-0">{new Date(r.createdAt).toLocaleString('fa-IR')}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-4 py-2 rounded-xl text-sm border border-border disabled:opacity-30 hover:border-white/20">
                  قبلی
                </button>
                <span className="text-sm text-text-muted px-2">{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-4 py-2 rounded-xl text-sm border border-border disabled:opacity-30 hover:border-white/20">
                  بعدی
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
