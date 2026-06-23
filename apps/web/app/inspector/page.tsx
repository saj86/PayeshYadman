'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getStoredUser, logout } from '@/lib/auth'
import api from '@/lib/api'

const TABS = [
  { id: 'queue', label: 'صف بازرسی' },
  { id: 'approved', label: 'تأیید شده' },
  { id: 'missing', label: 'گمشدگان' },
]

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: '#e07a7a', CRITICAL: '#e07a7a', MEDIUM: '#e0c14f', LOW: '#56c48a',
}

export default function InspectorPage() {
  const router = useRouter()
  const user = getStoredUser()
  const [tab, setTab] = useState('queue')
  const [queue, setQueue] = useState<any[]>([])
  const [approved, setApproved] = useState<any[]>([])
  const [missing, setMissing] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [checklist, setChecklist] = useState<any>(null)
  const [responses, setResponses] = useState<Record<string, boolean>>({})
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { router.push('/'); return }
    loadData()
  }, [])

  async function loadData() {
    try {
      const [q, cl, miss] = await Promise.all([
        api.get('/inspections/queue'),
        api.get('/checklists'),
        api.get('/lost-found'),
      ])
      const all = Array.isArray(q) ? q : []
      setQueue(all.filter((i: any) => !['APPROVED', 'REJECTED'].includes(i.status)))
      setApproved(all.filter((i: any) => i.status === 'APPROVED'))
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
    const total = items.length
    const passed = items.filter((item: any) => responses[item.id] === true).length
    const score = total > 0 ? Math.round((passed / total) * 100) : 0

    try {
      await api.post(`/inspections/${selected.id}/review`, {
        action,
        notes,
        score,
        checklistResponses: items.map((item: any) => ({
          checklistItemId: item.id,
          passed: responses[item.id] ?? false,
          notes: '',
        })),
      })
      setSelected(null)
      setResponses({})
      setNotes('')
      await loadData()
    } catch (e: any) { alert(e.message) }
  }

  const passed = Object.values(responses).filter(Boolean).length
  const totalItems = checklist?.items?.length || 0
  const score = totalItems > 0 ? Math.round((passed / totalItems) * 100) : 0

  if (!user) return null

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6" style={{ background: 'radial-gradient(800px 500px at 50% 0%,rgba(90,169,230,.08),transparent),#070d15' }}>
      {/* Phone frame */}
      <div className="w-[404px] bg-bg-dark rounded-[46px] overflow-hidden flex flex-col shadow-2xl" style={{ height: '812px', border: '9px solid #161f2c' }}>
        {/* Status bar */}
        <div className="h-8 flex items-center justify-center flex-shrink-0">
          <div className="w-28 h-6 bg-[#161f2c] rounded-b-2xl" />
        </div>

        {selected ? (
          /* Inspection Detail */
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-shrink-0">
              <button onClick={() => { setSelected(null); setResponses({}); setNotes('') }} className="text-text-muted text-lg">←</button>
              <div>
                <div className="text-sm font-bold">برگهٔ بازرسی</div>
                <div className="text-[11px] text-text-muted">{selected.location?.name}</div>
              </div>
              <div className="mr-auto">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg text-xs" style={{ background: 'rgba(224,193,79,.15)', color: '#e0c14f' }}>
                  امتیاز: {score}٪
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {/* Location info */}
              <div className="bg-blue-dim border border-blue/25 rounded-xl p-3">
                <div className="text-sm font-bold text-blue mb-1">{selected.location?.name}</div>
                <div className="text-xs text-text-secondary">{selected.location?.category} — {selected.location?.region?.name}</div>
                <div className="text-xs text-text-muted mt-1">{selected.notes}</div>
              </div>

              {/* Score bar */}
              <div className="bg-bg-card border border-border rounded-xl p-3">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-text-muted">پیشرفت چک‌لیست</span>
                  <span className="font-bold" style={{ color: score >= 60 ? '#56c48a' : score >= 40 ? '#e0c14f' : '#e07a7a' }}>{score}٪</span>
                </div>
                <div className="h-2 bg-white/[.06] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: score >= 60 ? '#56c48a' : score >= 40 ? '#e0c14f' : '#e07a7a' }} />
                </div>
                <div className="text-[10px] text-text-dim mt-1">{passed} از {totalItems} مورد تأیید</div>
              </div>

              {/* Checklist */}
              {checklist?.items?.map((item: any) => (
                <div key={item.id} onClick={() => setResponses(p => ({ ...p, [item.id]: !p[item.id] }))}
                  className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all"
                  style={{ background: responses[item.id] ? 'rgba(86,196,138,.08)' : 'rgba(255,255,255,.02)', borderColor: responses[item.id] ? 'rgba(86,196,138,.35)' : 'rgba(255,255,255,.08)' }}>
                  <div className="w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all" style={{ background: responses[item.id] ? '#56c48a' : 'transparent', borderColor: responses[item.id] ? '#56c48a' : 'rgba(255,255,255,.2)' }}>
                    {responses[item.id] && <span className="text-bg text-xs font-bold">✓</span>}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold">{item.label}</div>
                    <div className="text-[10px] text-text-dim">{item.category}{item.isMandatory ? ' • اجباری' : ''}</div>
                  </div>
                </div>
              ))}

              {/* Notes */}
              <div>
                <label className="block text-xs text-text-secondary mb-1">یادداشت بازرس</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="مشاهدات میدانی..." className="w-full px-3 py-2 bg-bg-dark border border-border rounded-xl text-xs focus:outline-none resize-none" />
              </div>
            </div>

            {/* Action buttons */}
            <div className="px-4 py-3 grid grid-cols-2 gap-2 flex-shrink-0 border-t border-border">
              <button onClick={() => submitReview('APPROVE')} className="py-2.5 rounded-xl text-sm font-bold transition-all" style={{ background: 'rgba(86,196,138,.2)', color: '#56c48a', border: '1px solid rgba(86,196,138,.35)' }}>✓ تأیید</button>
              <button onClick={() => submitReview('CONDITIONAL')} className="py-2.5 rounded-xl text-sm font-bold transition-all" style={{ background: 'rgba(224,193,79,.15)', color: '#e0c14f', border: '1px solid rgba(224,193,79,.3)' }}>~ مشروط</button>
              <button onClick={() => submitReview('REVISIT')} className="py-2.5 rounded-xl text-sm font-bold transition-all" style={{ background: 'rgba(90,169,230,.15)', color: '#5aa9e6', border: '1px solid rgba(90,169,230,.3)' }}>↺ بازدید مجدد</button>
              <button onClick={() => submitReview('REJECT')} className="py-2.5 rounded-xl text-sm font-bold transition-all" style={{ background: 'rgba(224,122,122,.15)', color: '#e07a7a', border: '1px solid rgba(224,122,122,.3)' }}>✗ رد</button>
            </div>
          </div>
        ) : (
          /* List view */
          <>
            <div className="px-5 py-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-blue font-semibold">اپ بازرس میدانی</div>
                  <div className="text-lg font-black mt-0.5">منطقه ۱۲ — بازرسی</div>
                </div>
                <button onClick={() => { logout(); router.push('/') }} className="w-9 h-9 rounded-full bg-white/[.06] flex items-center justify-center text-text-muted">×</button>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3.5">
                <div className="bg-yellow-dim border border-yellow/25 rounded-xl p-2.5 text-center">
                  <div className="text-xl font-black text-yellow">{queue.length}</div>
                  <div className="text-[10px] text-text-secondary">در صف بازرسی</div>
                </div>
                <div className="bg-green-dim border border-green/25 rounded-xl p-2.5 text-center">
                  <div className="text-xl font-black text-green">{approved.length}</div>
                  <div className="text-[10px] text-text-secondary">ارسال به ستاد</div>
                </div>
              </div>
              <div className="flex gap-1 mt-3 bg-white/[.04] p-1 rounded-xl">
                {TABS.map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)} className="flex-1 text-center py-2 rounded-lg text-xs font-semibold transition-all" style={{ background: tab === t.id ? 'rgba(255,255,255,.1)' : 'transparent', color: tab === t.id ? '#e9eef4' : '#7e93a8' }}>{t.label}</button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-5">
              {loading && <div className="text-center text-text-muted text-sm py-8">در حال بارگذاری...</div>}

              {tab === 'queue' && (
                <>
                  {queue.length === 0 && !loading && <div className="text-center text-text-muted text-sm py-10">صف خالی است</div>}
                  {queue.map((r: any) => (
                    <div key={r.id} onClick={() => setSelected(r)} className="bg-white/[.03] border border-border rounded-2xl p-3.5 mb-3 cursor-pointer hover:border-blue/50 hover:bg-blue-dim transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#5aa9e6' }} />
                          <span className="text-sm font-bold">{r.location?.category || 'عمومی'}</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: 'rgba(224,122,122,.15)', color: '#e07a7a' }}>فوری</span>
                      </div>
                      <div className="text-sm font-semibold mb-1">{r.location?.name}</div>
                      <div className="text-[11.5px] text-text-muted mb-2">{r.location?.region?.name} • {new Date(r.createdAt).toLocaleDateString('fa-IR')}</div>
                      {r.notes && <div className="text-xs text-text-secondary bg-white/[.03] rounded-lg p-2 mb-2 leading-6">{r.notes}</div>}
                      <div className="flex items-center justify-between border-t border-border/50 pt-2.5">
                        <span className="text-[11px] text-text-muted">در انتظار بازرسی</span>
                        <span className="text-xs font-bold text-blue">باز کردن برگه ←</span>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {tab === 'approved' && (
                <>
                  {approved.length === 0 && <div className="text-center text-text-muted text-sm py-10">موردی یافت نشد</div>}
                  {approved.map((r: any) => (
                    <div key={r.id} className="bg-green-dim border border-green/20 rounded-2xl p-3.5 mb-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-bold">{r.location?.category}</span>
                        <span className="text-green text-base">✓</span>
                      </div>
                      <div className="text-sm font-semibold">{r.location?.name}</div>
                      <div className="text-[11px] text-text-muted mt-1">{r.location?.region?.name}</div>
                    </div>
                  ))}
                </>
              )}

              {tab === 'missing' && (
                <>
                  <div className="text-xs text-text-muted my-2">{missing.filter(m => m.status === 'MISSING').length} گمشده • {missing.filter(m => m.status === 'FOUND').length} پیداشده</div>
                  {missing.map((m: any) => (
                    <div key={m.id} className="flex gap-3 py-3 border-b border-border/40">
                      <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-lg" style={{ background: m.status === 'MISSING' ? 'rgba(224,122,122,.15)' : 'rgba(86,196,138,.15)', color: m.status === 'MISSING' ? '#e07a7a' : '#56c48a' }}>
                        {m.status === 'MISSING' ? '?' : '✓'}
                      </div>
                      <div>
                        <div className="text-sm font-bold">{m.name}</div>
                        <div className="text-[11px] text-text-muted">{m.lastSeenLocation}</div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
