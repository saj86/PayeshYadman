'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getStoredUser, logout, canAccess, getRedirectPath } from '@/lib/auth'
import api from '@/lib/api'

const TABS = [
  { id: 'queue',         label: 'صف بازرسی' },
  { id: 'done',          label: 'انجام‌شده' },
  { id: 'reports',       label: 'گزارش‌های شهری' },
  { id: 'accommodation', label: 'اماکن اسکان' },
  { id: 'missing',       label: 'گمشدگان' },
]

const CHECKLIST_STATUS_LABELS: Record<string, { label: string; color: string }> = {
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

const EDITABLE_CHECKLIST_STATUSES = ['DRAFT', 'RETURNED_FOR_CORRECTION']
const LOCKED_CHECKLIST_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'APPROVED_WITH_CONDITIONS', 'REJECTED', 'CLOSED']

const PLACE_TYPE_LABELS: Record<string, string> = {
  SCHOOL: 'مدرسه', MOSQUE: 'مسجد', SPORTS_HALL: 'سالن ورزشی',
  HUSAINIYEH: 'حسینیه', HOTEL: 'هتل', EMERGENCY_CENTER: 'مرکز اضطراری',
  WAREHOUSE: 'سوله', OTHER: 'سایر',
}

const FACILITY_FLAGS = [
  { key: 'hasKitchen', label: 'آشپزخانه' }, { key: 'hasMedical', label: 'امداد' },
  { key: 'hasParking', label: 'پارکینگ' }, { key: 'hasDisabilityAccess', label: 'معلولین' },
  { key: 'hasBackupPower', label: 'برق اضطراری' }, { key: 'hasWater', label: 'آب' },
]

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

export default function InspectorPage() {
  const router = useRouter()
  const user = getStoredUser()
  const [tab, setTab] = useState('queue')
  const [queue, setQueue] = useState<any[]>([])
  const [done, setDone] = useState<any[]>([])
  const [citizenReports, setCitizenReports] = useState<any[]>([])
  const [missing, setMissing] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [checklist, setChecklist] = useState<any>(null)
  const [responses, setResponses] = useState<Record<string, boolean>>({})
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState<any>(null)
  const [reportStatus, setReportStatus] = useState('')
  const [myPlaces, setMyPlaces] = useState<any[]>([])
  const [selectedPlace, setSelectedPlace] = useState<any>(null)
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({})
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState('')
  const [checklistSubmitting, setChecklistSubmitting] = useState(false)
  const [checklistHistory, setChecklistHistory] = useState<any[]>([])

  useEffect(() => {
    if (!user) { router.replace('/'); return }
    if (!canAccess(user, 'INSPECTOR')) { router.replace(getRedirectPath(user)); return }
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [q, doneRes, cl, miss, rpts, places] = await Promise.all([
        api.get('/inspections?status=INSPECTOR_ASSIGNED&limit=50'),
        api.get('/inspections?status=APPROVED&limit=50'),
        api.get('/checklists'),
        api.get('/lost-found'),
        api.get('/reports'),
        api.get('/accommodation/places/my-inspector'),
      ])
      setQueue(q?.data || [])
      setDone(doneRes?.data || [])
      setCitizenReports(rpts?.data || [])
      setMyPlaces(Array.isArray(places) ? places : [])
      if (cl && cl.length > 0) {
        const full = await api.get(`/checklists/${cl[0].id}`)
        setChecklist(full)
      }
      setMissing(Array.isArray(miss) ? miss : [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  function calcWeightedScore(items: any[], resp: Record<string, boolean>) {
    const totalWeight = items.reduce((s: number, i: any) => s + (i.weight || 1), 0)
    if (totalWeight === 0) return 0
    const passedWeight = items.filter((i: any) => resp[i.id] === true).reduce((s: number, i: any) => s + (i.weight || 1), 0)
    return Math.round((passedWeight / totalWeight) * 100)
  }

  async function openInspection(submission: any) {
    setSelected(submission)
    setResponses({})
    setItemNotes({})
    setNotes(submission.notes || '')
    setExpandedItem(null)
    setSubmitError('')
    setChecklistHistory([])

    // Load existing checklist responses and history if any
    try {
      const detail = await api.get(`/inspections/${submission.id}/checklist`)
      if (detail?.checklistResponses?.length) {
        const respMap: Record<string, boolean> = {}
        const noteMap: Record<string, string> = {}
        detail.checklistResponses.forEach((r: any) => {
          respMap[r.checklistItemId] = r.passed
          if (r.notes) noteMap[r.checklistItemId] = r.notes
        })
        setResponses(respMap)
        setItemNotes(noteMap)
      }
      if (detail?.checklistHistory?.length) {
        setChecklistHistory(detail.checklistHistory)
      }
    } catch { /* no existing responses yet */ }
  }

  async function submitChecklist() {
    if (!selected) return
    const items: any[] = checklist?.items || []
    setChecklistSubmitting(true)
    setSubmitError('')
    try {
      await api.post(`/inspections/${selected.id}/checklist/submit`, {
        checklistResponses: items.map((item: any) => ({
          checklistItemId: item.id,
          passed: responses[item.id] ?? false,
          notes: itemNotes[item.id] || null,
        })),
        notes,
      })
      // Reload the updated submission
      const updated = await api.get(`/inspections/${selected.id}`)
      setSelected(updated)
      const history = await api.get(`/inspections/${selected.id}/checklist/history`)
      setChecklistHistory(Array.isArray(history) ? history : [])
    } catch (e: any) { setSubmitError(e.message) }
    finally { setChecklistSubmitting(false) }
  }

  async function submitReview(action: 'APPROVE' | 'REJECT' | 'REVISIT' | 'CONDITIONAL') {
    if (!selected) return
    setSubmitError('')
    const items: any[] = checklist?.items || []
    const mandatoryItems = items.filter((i: any) => i.isMandatory)
    const unrespondedMandatory = mandatoryItems.filter((i: any) => responses[i.id] === undefined)

    // Client-side validation
    if (action === 'CONDITIONAL' && notes.trim().length < 5) {
      setSubmitError('تأیید مشروط نیازمند ذکر شرط یا توضیح است (حداقل ۵ کاراکتر).')
      return
    }
    if ((action === 'APPROVE' || action === 'CONDITIONAL') && unrespondedMandatory.length > 0) {
      setSubmitError(`موارد اجباری پاسخ داده نشده: ${unrespondedMandatory.map((i: any) => i.label).join('، ')}`)
      return
    }

    const weightedScore = calcWeightedScore(items, responses)
    try {
      await api.post(`/inspections/${selected.id}/review`, {
        action, notes, score: weightedScore,
        checklistResponses: items.map((item: any) => ({
          checklistItemId: item.id,
          passed: responses[item.id] ?? false,
          notes: itemNotes[item.id] || null,
        })),
      })
      setSelected(null)
      setResponses({})
      setNotes('')
      setItemNotes({})
      setExpandedItem(null)
      setSubmitError('')
      await loadData()
    } catch (e: any) { setSubmitError(e.message) }
  }

  async function updateReportStatus(id: string, status: string) {
    try {
      await api.put(`/reports/${id}/status`, { status })
      setSelectedReport((r: any) => r ? { ...r, status } : r)
      setCitizenReports(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    } catch (e: any) { alert(e.message) }
  }

  const items: any[] = checklist?.items || []
  const score = calcWeightedScore(items, responses)
  const passedCount = items.filter((i: any) => responses[i.id] === true).length
  const totalItems = items.length
  const mandatoryItems = items.filter((i: any) => i.isMandatory)
  const unrespondedMandatory = mandatoryItems.filter((i: any) => responses[i.id] === undefined).length

  if (!user) return null

  // ── Inspection detail view ──────────────────────────────────────────────────
  if (selected) {
    const scoreColor = score >= 60 ? '#56c48a' : score >= 40 ? '#e0c14f' : '#e07a7a'
    const byCategory: Record<string, any[]> = {}
    for (const item of items) {
      ;(byCategory[item.category] = byCategory[item.category] || []).push(item)
    }

    const clStatus = selected.checklistStatus || 'DRAFT'
    const clSt = CHECKLIST_STATUS_LABELS[clStatus]
    const isEditable = EDITABLE_CHECKLIST_STATUSES.includes(clStatus)
    const isLocked = LOCKED_CHECKLIST_STATUSES.includes(clStatus)
    const correctionReason = clStatus === 'RETURNED_FOR_CORRECTION'
      ? checklistHistory.find((h: any) => h.toStatus === 'RETURNED_FOR_CORRECTION')?.reason
      : null

    return (
      <div className="min-h-screen bg-bg" dir="rtl">
        <header className="sticky top-0 z-20 bg-bg-dark border-b border-border px-4 h-14 flex items-center gap-3">
          <button onClick={() => { setSelected(null); setResponses({}); setNotes(''); setItemNotes({}); setExpandedItem(null); setSubmitError('') }} className="text-text-muted text-xl">←</button>
          <div className="flex-1">
            <div className="text-sm font-bold">برگهٔ بازرسی</div>
            <div className="text-[11px] text-text-muted">{selected.location?.name}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg" style={{ color: clSt?.color, background: `${clSt?.color}20` }}>{clSt?.label}</span>
            {isEditable && (
              <span className="text-xs font-bold px-3 py-1.5 rounded-xl" style={{ background: `${scoreColor}20`, color: scoreColor, border: `1px solid ${scoreColor}40` }}>
                {score}٪
              </span>
            )}
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
          {/* Correction reason banner */}
          {correctionReason && (
            <div className="bg-red/10 border border-red/30 rounded-2xl p-4">
              <div className="text-xs font-bold text-red-400 mb-1">چک‌لیست برای اصلاح بازگشت داده شد</div>
              <div className="text-xs text-text-secondary leading-5">{correctionReason}</div>
            </div>
          )}

          {/* Locked banner */}
          {isLocked && (
            <div className="bg-blue/10 border border-blue/20 rounded-2xl p-3 text-xs text-blue">
              چک‌لیست در وضعیت «{clSt?.label}» است و قابل ویرایش نیست.
            </div>
          )}

          {/* Location info */}
          <div className="bg-blue-dim border border-blue/25 rounded-2xl p-4">
            <div className="text-sm font-bold text-blue mb-1">{selected.location?.name}</div>
            <div className="text-xs text-text-secondary">{selected.location?.category} — {selected.location?.region?.name}</div>
            {selected.notes && <div className="text-xs text-text-muted mt-2 pt-2 border-t border-blue/20">{selected.notes}</div>}
          </div>

          {/* Progress bar */}
          <div className="bg-bg-card border border-border rounded-2xl p-4">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-text-muted">امتیاز وزنی کل</span>
              <span className="font-black text-sm" style={{ color: scoreColor }}>{score}٪</span>
            </div>
            <div className="h-2.5 bg-white/[.06] rounded-full overflow-hidden mb-2">
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${score}%`, background: scoreColor }} />
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-text-dim">{passedCount} از {totalItems} مورد تأیید</span>
              {unrespondedMandatory > 0 && (
                <span className="text-red-400 font-bold">{unrespondedMandatory} مورد اجباری پاسخ نشده</span>
              )}
            </div>
          </div>

          {/* Checklist by category */}
          {Object.entries(byCategory).map(([cat, catItems]) => (
            <div key={cat} className="bg-bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-2.5 bg-white/[.03] border-b border-border flex items-center justify-between">
                <span className="text-xs font-bold text-text-secondary">{cat}</span>
                <span className="text-[10px] text-text-dim">{catItems.filter((i: any) => responses[i.id] === true).length}/{catItems.length}</span>
              </div>
              <div className="divide-y divide-border/40">
                {catItems.map((item: any) => {
                  const answered = responses[item.id] !== undefined
                  const passed = responses[item.id] === true
                  const isExpanded = expandedItem === item.id
                  return (
                    <div key={item.id} style={isLocked ? { opacity: 0.75 } : {}}>
                      <div className="flex items-center gap-3 p-3.5"
                        style={{ background: passed ? 'rgba(86,196,138,.05)' : answered ? 'rgba(224,122,122,.05)' : 'transparent' }}>
                        {/* Pass/Fail toggle */}
                        <button
                          disabled={isLocked}
                          onClick={() => !isLocked && setResponses(p => {
                            if (p[item.id] === undefined) return { ...p, [item.id]: true }
                            if (p[item.id] === true) return { ...p, [item.id]: false }
                            const n = { ...p }; delete n[item.id]; return n
                          })}
                          className="w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all disabled:cursor-not-allowed"
                          style={passed
                            ? { background: '#56c48a', borderColor: '#56c48a', color: '#070d15' }
                            : answered
                            ? { background: 'rgba(224,122,122,.2)', borderColor: '#e07a7a', color: '#e07a7a' }
                            : { background: 'transparent', borderColor: 'rgba(255,255,255,.15)', color: '#56708c' }}>
                          {passed ? '✓' : answered ? '✗' : '?'}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold">{item.label}</span>
                            {item.isMandatory && <span className="text-[9px] px-1 py-0.5 rounded font-bold" style={{ background: 'rgba(224,193,79,.15)', color: '#e0c14f' }}>اجباری</span>}
                            {(item.weight || 1) > 1 && <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: 'rgba(90,169,230,.1)', color: '#5aa9e6' }}>×{item.weight}</span>}
                          </div>
                        </div>

                        {/* Note toggle */}
                        <button onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                          className="text-[10px] px-2 py-1 rounded border flex-shrink-0 transition-all"
                          style={itemNotes[item.id] ? { borderColor: 'rgba(90,169,230,.4)', color: '#5aa9e6' } : { borderColor: 'rgba(255,255,255,.08)', color: '#56708c' }}>
                          یادداشت
                        </button>
                      </div>
                      {isExpanded && (
                        <div className="px-4 pb-3">
                          <textarea
                            value={itemNotes[item.id] || ''}
                            onChange={e => setItemNotes(p => ({ ...p, [item.id]: e.target.value }))}
                            placeholder="یادداشت برای این مورد..."
                            rows={2}
                            className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-xs focus:outline-none resize-none"
                            onClick={e => e.stopPropagation()} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* General notes */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">
              یادداشت کلی بازرس
              {isEditable && <span className="text-[10px] text-yellow mr-2 font-normal">(برای تأیید مشروط اجباری است)</span>}
            </label>
            <textarea value={notes} onChange={e => { setNotes(e.target.value); setSubmitError('') }} rows={3}
              disabled={isLocked}
              placeholder="مشاهدات کلی میدانی، شرایط مشروط، توضیحات..."
              className="w-full px-3 py-2.5 bg-bg-dark border border-border rounded-xl text-xs focus:outline-none resize-none disabled:opacity-60 disabled:cursor-not-allowed" />
          </div>

          {/* Validation error */}
          {submitError && (
            <div className="bg-red/10 border border-red/30 rounded-xl p-3 text-xs text-red-400">{submitError}</div>
          )}

          {/* Checklist history */}
          {checklistHistory.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-text-secondary">تاریخچه چک‌لیست</div>
              {checklistHistory.map((h: any) => {
                const toSt = CHECKLIST_STATUS_LABELS[h.toStatus] || { label: h.toStatus, color: '#56708c' }
                return (
                  <div key={h.id} className="text-[10px] border-r-2 pr-2 leading-5" style={{ borderColor: toSt.color }}>
                    <span style={{ color: toSt.color }}>{toSt.label}</span>
                    <span className="text-text-dim"> — {h.changedBy?.fullName} • {new Date(h.createdAt).toLocaleDateString('fa-IR')}</span>
                    {h.reason && <div className="text-red-400 mt-0.5">دلیل: {h.reason}</div>}
                  </div>
                )
              })}
            </div>
          )}

          {/* Submit checklist button (editable states) */}
          {isEditable && (
            <button onClick={submitChecklist} disabled={checklistSubmitting}
              className="w-full py-3 rounded-2xl text-sm font-bold disabled:opacity-40 transition-all"
              style={{ background: '#5aa9e6', color: '#070d15' }}>
              {checklistSubmitting ? 'در حال ارسال...' : clStatus === 'RETURNED_FOR_CORRECTION' ? '↺ ارسال مجدد چک‌لیست' : '↑ ثبت و ارسال چک‌لیست'}
            </button>
          )}

          {/* Action buttons (inspection review) */}
          <div className="grid grid-cols-2 gap-2 pb-6">
            <button onClick={() => submitReview('APPROVE')}
              className="py-3 rounded-2xl text-sm font-bold transition-all"
              style={{ background: 'rgba(86,196,138,.2)', color: '#56c48a', border: '1px solid rgba(86,196,138,.35)' }}>
              ✓ تأیید بازرسی
            </button>
            <button onClick={() => submitReview('CONDITIONAL')}
              className="py-3 rounded-2xl text-sm font-bold transition-all"
              style={{ background: 'rgba(224,193,79,.15)', color: '#e0c14f', border: '1px solid rgba(224,193,79,.3)' }}>
              ~ تأیید مشروط
            </button>
            <button onClick={() => submitReview('REVISIT')}
              className="py-3 rounded-2xl text-sm font-bold transition-all"
              style={{ background: 'rgba(90,169,230,.15)', color: '#5aa9e6', border: '1px solid rgba(90,169,230,.3)' }}>
              ↺ بازدید مجدد
            </button>
            <button onClick={() => submitReview('REJECT')}
              className="py-3 rounded-2xl text-sm font-bold transition-all"
              style={{ background: 'rgba(224,122,122,.15)', color: '#e07a7a', border: '1px solid rgba(224,122,122,.3)' }}>
              ✗ رد بازرسی
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Accommodation place detail ─────────────────────────────────────────────
  if (selectedPlace) {
    const occupancyPct = selectedPlace.capacity > 0 ? Math.round((selectedPlace.currentOccupancy / selectedPlace.capacity) * 100) : 0
    return (
      <div className="min-h-screen bg-bg" dir="rtl">
        <header className="sticky top-0 z-20 bg-bg-dark border-b border-border px-4 h-14 flex items-center gap-3">
          <button onClick={() => setSelectedPlace(null)} className="text-text-muted text-xl">←</button>
          <div className="flex-1">
            <div className="text-sm font-bold">{selectedPlace.name}</div>
            <div className="text-[11px] text-text-muted">{PLACE_TYPE_LABELS[selectedPlace.type] || selectedPlace.type}</div>
          </div>
          <span className="text-[10px] font-bold px-2 py-1 rounded-lg"
            style={selectedPlace.status === 'APPROVED' ? { background: 'rgba(86,196,138,.15)', color: '#56c48a' } : { background: 'rgba(224,193,79,.15)', color: '#e0c14f' }}>
            {selectedPlace.status === 'APPROVED' ? 'تأیید شده' : selectedPlace.status === 'PENDING' ? 'در انتظار' : 'رد شده'}
          </span>
        </header>

        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
          {/* Occupancy */}
          <div className="bg-bg-card border border-border rounded-2xl p-4">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-text-muted">اشغال ({selectedPlace.currentOccupancy} / {selectedPlace.capacity} نفر)</span>
              <span className="font-bold" style={{ color: occupancyPct > 80 ? '#e07a7a' : '#56c48a' }}>{occupancyPct}٪</span>
            </div>
            <div className="h-2 bg-white/[.06] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(occupancyPct, 100)}%`, background: occupancyPct > 80 ? '#e07a7a' : '#56c48a' }} />
            </div>
            <div className="flex gap-4 mt-3 text-xs">
              {selectedPlace.maleCapacity && <div className="text-text-muted">آقایان: <strong className="text-text-primary">{selectedPlace.maleCapacity}</strong></div>}
              {selectedPlace.femaleCapacity && <div className="text-text-muted">بانوان: <strong className="text-text-primary">{selectedPlace.femaleCapacity}</strong></div>}
            </div>
          </div>

          {/* Info grid */}
          <div className="bg-bg-card border border-border rounded-2xl p-4 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
            {[
              ['آدرس', selectedPlace.address],
              ['منطقه', selectedPlace.region?.name],
              ['تلفن تماس', selectedPlace.contactPhone],
              ['تلفن اضطراری', selectedPlace.emergencyPhone],
              ['شماره مجوز', selectedPlace.licenseNumber],
              ['طبقه', selectedPlace.floorCount],
              ['اتاق', selectedPlace.roomCount],
              ['سرویس', selectedPlace.toiletCount],
              ['مالک/مسئول', selectedPlace.ownerName],
              ['تلفن مالک', selectedPlace.ownerPhone],
              ['مدیر مکان', selectedPlace.manager?.fullName],
            ].filter(([, v]) => v != null && v !== '').map(([l, v]) => (
              <div key={l as string} className="flex gap-1.5">
                <span className="text-text-muted min-w-[70px]">{l}:</span>
                <span className="text-text-primary font-medium">{v}</span>
              </div>
            ))}
          </div>

          {/* Facilities */}
          <div className="bg-bg-card border border-border rounded-2xl p-4">
            <div className="text-xs font-bold text-text-secondary mb-2">امکانات</div>
            <div className="flex flex-wrap gap-2">
              {FACILITY_FLAGS.map(f => (
                <span key={f.key} className="text-[10px] px-2 py-1 rounded-lg font-semibold"
                  style={(selectedPlace as any)[f.key]
                    ? { background: 'rgba(86,196,138,.15)', color: '#56c48a', border: '1px solid rgba(86,196,138,.3)' }
                    : { background: 'rgba(255,255,255,.04)', color: '#56708c', border: '1px solid rgba(255,255,255,.08)' }}>
                  {(selectedPlace as any)[f.key] ? '✓' : '✗'} {f.label}
                </span>
              ))}
            </div>
          </div>

          {selectedPlace.description && (
            <div className="bg-bg-card border border-border rounded-2xl p-4">
              <div className="text-xs font-bold text-text-secondary mb-1.5">توضیحات</div>
              <div className="text-xs text-text-secondary leading-6">{selectedPlace.description}</div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Citizen report detail ──────────────────────────────────────────────────
  if (selectedReport) {
    const st = REPORT_STATUS[selectedReport.status] || REPORT_STATUS.PENDING
    return (
      <div className="min-h-screen bg-bg" dir="rtl">
        <header className="sticky top-0 z-20 bg-bg-dark border-b border-border px-4 h-14 flex items-center gap-3">
          <button onClick={() => setSelectedReport(null)} className="text-text-muted text-xl">←</button>
          <div className="flex-1">
            <div className="text-sm font-bold">{selectedReport.title}</div>
            <div className="text-[11px] text-text-muted">{selectedReport.category}</div>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg" style={{ color: st.color, background: `${st.color}20` }}>{st.label}</span>
        </header>

        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
          <div className="bg-bg-card border border-border rounded-2xl p-4 space-y-2">
            <div className="text-xs text-text-secondary leading-6">{selectedReport.description}</div>
            {selectedReport.address && <div className="text-xs text-text-dim">📍 {selectedReport.address}</div>}
            <div className="text-xs text-text-dim">ثبت: {new Date(selectedReport.createdAt).toLocaleString('fa-IR')}</div>
            {selectedReport.reporter && <div className="text-xs text-text-dim">توسط: {selectedReport.reporter.fullName}</div>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-2">تغییر وضعیت</label>
            <div className="grid grid-cols-2 gap-2">
              {['IN_PROGRESS', 'NEEDS_INFO', 'RESOLVED'].map(s => {
                const st = REPORT_STATUS[s]
                const isActive = selectedReport.status === s
                return (
                  <button key={s} onClick={() => updateReportStatus(selectedReport.id, s)}
                    className="py-2.5 rounded-xl text-xs font-bold border transition-all"
                    style={isActive
                      ? { background: `${st.color}25`, color: st.color, borderColor: `${st.color}50` }
                      : { borderColor: 'rgba(255,255,255,.1)', color: '#7e93a8' }}>
                    {st.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── List view ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg" dir="rtl">
      <header className="sticky top-0 z-20 bg-bg-dark border-b border-border px-4 h-14 flex items-center justify-between">
        <div>
          <div className="text-[10px] text-blue font-semibold">اپ بازرس میدانی</div>
          <div className="text-base font-black">{user.fullName}</div>
        </div>
        <button onClick={() => { logout(); router.push('/') }} className="text-xs text-text-muted px-3 py-1.5 border border-border rounded-lg">خروج</button>
      </header>

      {/* Stats */}
      <div className="px-4 py-4 grid grid-cols-4 gap-2">
        <div className="bg-bg-card border border-yellow/25 rounded-2xl p-3 text-center">
          <div className="text-2xl font-black text-yellow">{queue.length}</div>
          <div className="text-[10px] text-text-secondary">در صف</div>
        </div>
        <div className="bg-bg-card border border-green/25 rounded-2xl p-3 text-center">
          <div className="text-2xl font-black text-green">{done.length}</div>
          <div className="text-[10px] text-text-secondary">انجام‌شده</div>
        </div>
        <div className="bg-bg-card border border-blue/25 rounded-2xl p-3 text-center">
          <div className="text-2xl font-black" style={{ color: '#5aa9e6' }}>{citizenReports.filter(r => r.status === 'ASSIGNED').length}</div>
          <div className="text-[10px] text-text-secondary">گزارش شهری</div>
        </div>
        <div className="bg-bg-card border border-purple/25 rounded-2xl p-3 text-center">
          <div className="text-2xl font-black" style={{ color: '#b08ce0' }}>{myPlaces.length}</div>
          <div className="text-[10px] text-text-secondary">اماکن اسکان</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pb-3 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${tab === t.id ? 'text-bg' : 'text-text-muted hover:text-text-primary border border-border'}`}
            style={tab === t.id ? { background: '#5aa9e6' } : {}}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-6">
        {loading && <div className="text-center text-text-muted text-sm py-10">در حال بارگذاری...</div>}

        {tab === 'queue' && !loading && (
          <>
            {queue.length === 0 && <div className="text-center text-text-muted text-sm py-12 border border-border rounded-2xl">صف خالی است</div>}
            <div className="space-y-3">
              {queue.map((r: any) => {
                const clSt = CHECKLIST_STATUS_LABELS[r.checklistStatus || 'DRAFT']
                const isReturned = r.checklistStatus === 'RETURNED_FOR_CORRECTION'
                return (
                  <div key={r.id} onClick={() => openInspection(r)}
                    className={`bg-bg-card border rounded-2xl p-4 cursor-pointer transition-all ${isReturned ? 'border-red/40' : 'border-border hover:border-blue/50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold">{r.location?.category || 'عمومی'}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg" style={{ color: clSt.color, background: `${clSt.color}20` }}>{clSt.label}</span>
                      </div>
                    </div>
                    <div className="text-sm font-semibold">{r.location?.name}</div>
                    <div className="text-[11px] text-text-muted mt-1">{r.location?.region?.name} • {new Date(r.createdAt).toLocaleDateString('fa-IR')}</div>
                    {isReturned && <div className="text-[10px] text-red-400 mt-1 font-semibold">⚠ برای اصلاح برگشت داده شده</div>}
                    <div className="text-xs font-bold text-blue mt-2">باز کردن برگه ←</div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {tab === 'done' && !loading && (
          <>
            {done.length === 0 && <div className="text-center text-text-muted text-sm py-12 border border-border rounded-2xl">موردی یافت نشد</div>}
            <div className="space-y-3">
              {done.map((r: any) => (
                <div key={r.id} className="bg-bg-card border border-green/20 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold">{r.location?.category}</span>
                    <span className="text-green">✓</span>
                  </div>
                  <div className="text-sm font-semibold">{r.location?.name}</div>
                  <div className="text-[11px] text-text-muted mt-1">{r.location?.region?.name}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'reports' && !loading && (
          <>
            {citizenReports.length === 0 && <div className="text-center text-text-muted text-sm py-12 border border-border rounded-2xl">گزارش شهری ارجاع‌شده‌ای وجود ندارد</div>}
            <div className="space-y-3">
              {citizenReports.map((r: any) => {
                const st = REPORT_STATUS[r.status] || REPORT_STATUS.PENDING
                return (
                  <div key={r.id} onClick={() => setSelectedReport(r)}
                    className="bg-bg-card border border-border rounded-2xl p-4 cursor-pointer hover:border-blue/40 transition-all">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="text-sm font-bold">{r.title}</div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0" style={{ color: st.color, background: `${st.color}20` }}>{st.label}</span>
                    </div>
                    <div className="text-[11px] text-text-muted">{r.category}</div>
                    {r.address && <div className="text-[11px] text-text-dim mt-1">📍 {r.address}</div>}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {tab === 'accommodation' && !loading && (
          <>
            {myPlaces.length === 0 && (
              <div className="text-center text-text-muted text-sm py-12 border border-border rounded-2xl">هیچ مکانی به شما تخصیص داده نشده</div>
            )}
            <div className="space-y-3">
              {myPlaces.map((pl: any) => {
                const occupancyPct = pl.capacity > 0 ? Math.round((pl.currentOccupancy / pl.capacity) * 100) : 0
                return (
                  <div key={pl.id} onClick={() => setSelectedPlace(pl)}
                    className="bg-bg-card border border-border rounded-2xl p-4 cursor-pointer hover:border-purple/40 transition-all">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-bold">{pl.name}</span>
                          <span className="text-[10px] bg-white/[.05] text-text-muted px-1.5 py-0.5 rounded">{PLACE_TYPE_LABELS[pl.type] || pl.type}</span>
                        </div>
                        <div className="text-[11px] text-text-muted">{pl.address} — {pl.region?.name}</div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg flex-shrink-0"
                        style={pl.status === 'APPROVED'
                          ? { background: 'rgba(86,196,138,.15)', color: '#56c48a' }
                          : { background: 'rgba(224,193,79,.15)', color: '#e0c14f' }}>
                        {pl.status === 'APPROVED' ? 'تأیید شده' : 'در انتظار'}
                      </span>
                    </div>

                    <div className="h-1.5 bg-white/[.06] rounded-full mb-2">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(occupancyPct, 100)}%`, background: occupancyPct > 80 ? '#e07a7a' : '#56c48a' }} />
                    </div>

                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-text-muted">ظرفیت: <strong className="text-text-primary">{pl.capacity}</strong></span>
                      <span className="text-text-muted">اشغال: <strong style={{ color: occupancyPct > 80 ? '#e07a7a' : '#56c48a' }}>{pl.currentOccupancy}</strong></span>
                      {pl.contactPhone && <span className="text-text-dim">📞 {pl.contactPhone}</span>}
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {FACILITY_FLAGS.filter(f => pl[f.key]).map(f => (
                        <span key={f.key} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(86,196,138,.12)', color: '#56c48a' }}>{f.label}</span>
                      ))}
                    </div>
                    <div className="text-xs font-bold text-purple mt-2">مشاهده جزئیات ←</div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {tab === 'missing' && !loading && (
          <>
            <div className="text-xs text-text-muted mb-3">
              {missing.filter(m => m.status === 'MISSING').length} گمشده • {missing.filter(m => m.status === 'FOUND').length} پیداشده
            </div>
            <div className="space-y-2">
              {missing.map((m: any) => (
                <div key={m.id} className="flex gap-3 p-3.5 bg-bg-card border border-border rounded-2xl">
                  <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-lg"
                    style={{ background: m.status === 'MISSING' ? 'rgba(224,122,122,.15)' : 'rgba(86,196,138,.15)', color: m.status === 'MISSING' ? '#e07a7a' : '#56c48a' }}>
                    {m.status === 'MISSING' ? '?' : '✓'}
                  </div>
                  <div>
                    <div className="text-sm font-bold">{m.name}</div>
                    <div className="text-[11px] text-text-muted">{m.lastSeenLocation}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
