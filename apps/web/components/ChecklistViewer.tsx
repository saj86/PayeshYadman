'use client'
import { useState, useEffect } from 'react'
import api from '@/lib/api'

// ── Constants ──────────────────────────────────────────────────────────────

export const CHECKLIST_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT:                    { label: 'پیش‌نویس',         color: '#56708c' },
  SUBMITTED:                { label: 'ثبت شده',          color: '#e0c14f' },
  UNDER_REVIEW:             { label: 'در حال بررسی',     color: '#b08ce0' },
  RETURNED_FOR_CORRECTION:  { label: 'برگشت برای اصلاح', color: '#e07a7a' },
  CORRECTED:                { label: 'اصلاح شده',        color: '#e0a450' },
  APPROVED:                 { label: 'تأیید شده',         color: '#56c48a' },
  APPROVED_WITH_CONDITIONS: { label: 'تأیید مشروط',      color: '#5aa9e6' },
  REJECTED:                 { label: 'رد شده',            color: '#e07a7a' },
  CLOSED:                   { label: 'بسته شده',          color: '#56708c' },
}

const REVIEWABLE_STATUSES = ['SUBMITTED', 'CORRECTED', 'UNDER_REVIEW']

// ── Types ──────────────────────────────────────────────────────────────────

type Props = {
  submissionId: string
  canReview: boolean   // Admin/Commander/Support: can change status, return, approve
  onClose: () => void
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ChecklistViewer({ submissionId, canReview, onClose }: Props) {
  const [detail, setDetail] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const [showReturnModal, setShowReturnModal] = useState(false)
  const [showCondModal, setShowCondModal] = useState(false)
  const [returnReason, setReturnReason] = useState('')
  const [conditionNotes, setConditionNotes] = useState('')

  useEffect(() => { load() }, [submissionId])

  async function load() {
    setLoading(true)
    try {
      const data = await api.get(`/inspections/${submissionId}/checklist`)
      setDetail(data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function changeStatus(status: string, opts?: { reason?: string; conditionNotes?: string }) {
    setActionLoading(true)
    try {
      const updated = await api.put(`/inspections/${submissionId}/checklist/status`, { status, ...opts })
      setDetail(updated)
      setShowReturnModal(false)
      setShowCondModal(false)
      setReturnReason(''); setConditionNotes('')
    } catch (e: any) { alert(e.message) }
    finally { setActionLoading(false) }
  }

  if (loading || !detail) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(7,13,21,.85)' }}>
        <div className="bg-bg-dark border border-border rounded-2xl p-8 text-center text-text-muted text-sm">
          {loading ? 'در حال بارگذاری...' : 'خطا در بارگذاری'}
          <br />
          <button onClick={onClose} className="mt-4 text-xs underline">بستن</button>
        </div>
      </div>
    )
  }

  const cs = CHECKLIST_STATUS_LABELS[detail.checklistStatus || 'DRAFT']
  const canAct = canReview && REVIEWABLE_STATUSES.includes(detail.checklistStatus)
  const isClosed = ['APPROVED', 'APPROVED_WITH_CONDITIONS', 'REJECTED', 'CLOSED'].includes(detail.checklistStatus)

  // Group responses by category
  const byCategory: Record<string, any[]> = {}
  detail.checklistResponses?.forEach((r: any) => {
    const cat = r.checklistItem?.category || 'عمومی'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(r)
  })

  const passedCount = detail.checklistResponses?.filter((r: any) => r.passed).length || 0
  const totalCount = detail.checklistResponses?.length || 0

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12" style={{ background: 'rgba(7,13,21,.85)', backdropFilter: 'blur(6px)' }}>
      <div className="bg-bg-dark border border-border rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <div className="font-bold text-sm">{detail.location?.name}</div>
            <div className="text-xs text-text-muted mt-0.5">{detail.location?.region?.name} — {detail.location?.category}</div>
            {detail.assignments?.[0] && (
              <div className="text-xs text-blue mt-0.5">بازرس: {detail.assignments[0].assignedTo?.fullName}</div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl" style={{ color: cs.color, background: `${cs.color}20`, border: `1px solid ${cs.color}30` }}>{cs.label}</span>
            <button onClick={onClose} className="text-text-muted text-xl leading-none hover:text-text-primary">×</button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Score + summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-bg-card border border-border rounded-xl p-3 text-center">
              <div className="text-2xl font-black" style={{ color: (detail.score || 0) >= 60 ? '#56c48a' : '#e07a7a' }}>
                {detail.score != null ? `${detail.score}٪` : '—'}
              </div>
              <div className="text-[10px] text-text-dim mt-0.5">امتیاز کل</div>
            </div>
            <div className="bg-bg-card border border-border rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-green">{passedCount}</div>
              <div className="text-[10px] text-text-dim mt-0.5">موافق</div>
            </div>
            <div className="bg-bg-card border border-border rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-red">{totalCount - passedCount}</div>
              <div className="text-[10px] text-text-dim mt-0.5">مخالف</div>
            </div>
          </div>

          {/* Condition notes */}
          {detail.checklistConditionNotes && (
            <div className="bg-blue/10 border border-blue/20 rounded-xl p-3 text-xs text-blue leading-5">
              <span className="font-bold">شرایط تأیید: </span>{detail.checklistConditionNotes}
            </div>
          )}

          {/* Reviewer action buttons */}
          {canAct && (
            <div className="bg-bg-card border border-border rounded-xl p-3 space-y-2">
              <div className="text-xs font-bold text-text-secondary mb-2">اقدامات ناظر</div>
              <div className="grid grid-cols-2 gap-2">
                {detail.checklistStatus !== 'UNDER_REVIEW' && (
                  <button onClick={() => changeStatus('UNDER_REVIEW')} disabled={actionLoading}
                    className="py-2 rounded-xl text-xs font-bold border disabled:opacity-40 transition-all"
                    style={{ borderColor: 'rgba(176,140,224,.4)', color: '#b08ce0', background: 'rgba(176,140,224,.1)' }}>
                    شروع بررسی
                  </button>
                )}
                <button onClick={() => setShowReturnModal(true)} disabled={actionLoading}
                  className="py-2 rounded-xl text-xs font-bold border disabled:opacity-40 transition-all"
                  style={{ borderColor: 'rgba(224,122,122,.4)', color: '#e07a7a', background: 'rgba(224,122,122,.08)' }}>
                  بازگشت برای اصلاح
                </button>
                <button onClick={() => changeStatus('APPROVED')} disabled={actionLoading}
                  className="py-2 rounded-xl text-xs font-bold border disabled:opacity-40 transition-all"
                  style={{ borderColor: 'rgba(86,196,138,.4)', color: '#56c48a', background: 'rgba(86,196,138,.08)' }}>
                  تأیید
                </button>
                <button onClick={() => setShowCondModal(true)} disabled={actionLoading}
                  className="py-2 rounded-xl text-xs font-bold border disabled:opacity-40 transition-all"
                  style={{ borderColor: 'rgba(90,169,230,.4)', color: '#5aa9e6', background: 'rgba(90,169,230,.08)' }}>
                  تأیید مشروط
                </button>
              </div>
              <button onClick={() => changeStatus('REJECTED')} disabled={actionLoading}
                className="w-full py-2 rounded-xl text-xs font-bold border disabled:opacity-40 transition-all"
                style={{ borderColor: 'rgba(224,122,122,.3)', color: '#e07a7a', background: 'rgba(224,122,122,.05)' }}>
                رد چک‌لیست
              </button>
            </div>
          )}

          {canReview && isClosed && detail.checklistStatus !== 'CLOSED' && (
            <button onClick={() => changeStatus('CLOSED')} disabled={actionLoading}
              className="w-full py-2 rounded-xl text-xs border border-border text-text-muted disabled:opacity-40">
              بستن پرونده
            </button>
          )}

          {/* Notes */}
          {detail.notes && (
            <div className="bg-bg-card border border-border rounded-xl p-3">
              <div className="text-xs font-bold text-text-secondary mb-1">یادداشت بازرس</div>
              <div className="text-xs text-text-primary leading-6">{detail.notes}</div>
            </div>
          )}

          {/* Checklist items by category */}
          {Object.keys(byCategory).length > 0 && (
            <div className="space-y-4">
              <div className="text-xs font-bold text-text-secondary">موارد بررسی شده ({passedCount}/{totalCount})</div>
              {Object.entries(byCategory).map(([cat, responses]) => (
                <div key={cat} className="bg-bg-card border border-border rounded-xl overflow-hidden">
                  <div className="px-3 py-2 border-b border-border/60 text-[10px] font-bold text-text-dim uppercase">{cat}</div>
                  <div className="divide-y divide-border/40">
                    {responses.map((r: any) => (
                      <div key={r.id} className="flex items-start gap-2.5 px-3 py-2.5">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5"
                          style={r.passed
                            ? { background: 'rgba(86,196,138,.2)', color: '#56c48a' }
                            : { background: 'rgba(224,122,122,.15)', color: '#e07a7a' }}>
                          {r.passed ? '✓' : '✗'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-text-primary">{r.checklistItem?.label}</div>
                          {r.notes && (
                            <div className="text-[10px] text-text-dim mt-0.5 leading-4">{r.notes}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {r.checklistItem?.isMandatory && (
                            <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: 'rgba(224,193,79,.15)', color: '#e0c14f' }}>اجباری</span>
                          )}
                          {r.checklistItem?.weight > 1 && (
                            <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: 'rgba(90,169,230,.15)', color: '#5aa9e6' }}>×{r.checklistItem.weight}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {detail.checklistResponses?.length === 0 && (
            <div className="text-center py-6 text-text-muted text-xs border border-border rounded-xl">چک‌لیستی هنوز تکمیل نشده است</div>
          )}

          {/* Status history */}
          {detail.checklistHistory?.length > 0 && (
            <div>
              <div className="text-xs font-bold text-text-secondary mb-2">تاریخچه وضعیت</div>
              <div className="space-y-2">
                {detail.checklistHistory.map((h: any) => {
                  const toSt = CHECKLIST_STATUS_LABELS[h.toStatus] || { label: h.toStatus, color: '#56708c' }
                  const fromSt = h.fromStatus ? CHECKLIST_STATUS_LABELS[h.fromStatus] : null
                  return (
                    <div key={h.id} className="flex items-start gap-2 text-[10px] leading-5">
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: toSt.color }} />
                      <div className="flex-1">
                        {fromSt && <span style={{ color: fromSt.color }}>{fromSt.label}</span>}
                        {fromSt && <span className="text-text-dim"> → </span>}
                        <span style={{ color: toSt.color }}>{toSt.label}</span>
                        <span className="text-text-dim"> توسط {h.changedBy?.fullName} — {new Date(h.createdAt).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                        {h.reason && <div className="text-text-dim mt-0.5">دلیل: {h.reason}</div>}
                        {h.conditionNotes && <div className="text-blue mt-0.5">شرایط: {h.conditionNotes}</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Reviews */}
          {detail.reviews?.length > 0 && (
            <div>
              <div className="text-xs font-bold text-text-secondary mb-2">بررسی‌های ناظران</div>
              {detail.reviews.map((rv: any) => (
                <div key={rv.id} className="bg-bg-card border border-border rounded-xl p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary font-semibold">{rv.reviewer?.fullName}</span>
                    <span className="text-text-dim">{new Date(rv.createdAt).toLocaleDateString('fa-IR')}</span>
                  </div>
                  {rv.score != null && <div className="text-text-dim">امتیاز: <span className="font-bold" style={{ color: rv.score >= 60 ? '#56c48a' : '#e07a7a' }}>{rv.score}٪</span></div>}
                  {rv.notes && <div className="text-text-primary leading-5">{rv.notes}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Return for correction modal */}
      {showReturnModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(7,13,21,.7)' }}>
          <div className="bg-bg-dark border border-border rounded-2xl w-full max-w-md p-5 space-y-4">
            <div className="font-bold text-sm">بازگشت برای اصلاح</div>
            <div className="text-xs text-text-muted">دلیل بازگشت را برای بازرس شرح دهید.</div>
            <textarea value={returnReason} onChange={e => setReturnReason(e.target.value)} rows={3}
              placeholder="حداقل ۵ کاراکتر..." className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm focus:outline-none resize-none" />
            <div className="flex gap-2">
              <button onClick={() => { setShowReturnModal(false); setReturnReason('') }} className="flex-1 py-2.5 rounded-xl border border-border text-sm text-text-muted">لغو</button>
              <button onClick={() => changeStatus('RETURNED_FOR_CORRECTION', { reason: returnReason })}
                disabled={actionLoading || returnReason.trim().length < 5}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40" style={{ background: '#e07a7a', color: '#fff' }}>
                ارسال
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve with conditions modal */}
      {showCondModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(7,13,21,.7)' }}>
          <div className="bg-bg-dark border border-border rounded-2xl w-full max-w-md p-5 space-y-4">
            <div className="font-bold text-sm">تأیید مشروط</div>
            <div className="text-xs text-text-muted">شرایط تأیید را برای بازرس و مدیر مکان شرح دهید.</div>
            <textarea value={conditionNotes} onChange={e => setConditionNotes(e.target.value)} rows={3}
              placeholder="حداقل ۵ کاراکتر..." className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm focus:outline-none resize-none" />
            <div className="flex gap-2">
              <button onClick={() => { setShowCondModal(false); setConditionNotes('') }} className="flex-1 py-2.5 rounded-xl border border-border text-sm text-text-muted">لغو</button>
              <button onClick={() => changeStatus('APPROVED_WITH_CONDITIONS', { conditionNotes })}
                disabled={actionLoading || conditionNotes.trim().length < 5}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40" style={{ background: '#5aa9e6', color: '#070d15' }}>
                تأیید مشروط
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
