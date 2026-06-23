'use client'
import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'

// ── Constants ──────────────────────────────────────────────────────────────

export const PLACE_TYPE_LABELS: Record<string, string> = {
  SCHOOL:           'مدرسه',
  MOSQUE:           'مسجد',
  SPORTS_HALL:      'سالن ورزشی',
  HUSAINIYEH:       'حسینیه',
  HOTEL:            'هتل',
  EMERGENCY_CENTER: 'مرکز اضطراری',
  WAREHOUSE:        'سوله / انبار',
  OTHER:            'سایر',
}

const PLACE_TYPES = Object.entries(PLACE_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))

export const PLACE_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING:  { label: 'در انتظار تأیید', color: '#e0c14f' },
  APPROVED: { label: 'تأیید شده',       color: '#56c48a' },
  REJECTED: { label: 'رد شده',          color: '#e07a7a' },
}

const FACILITY_FLAGS = [
  { key: 'hasKitchen',          label: 'آشپزخانه' },
  { key: 'hasMedical',          label: 'پایگاه امداد' },
  { key: 'hasParking',          label: 'پارکینگ' },
  { key: 'hasDisabilityAccess', label: 'دسترسی معلولین' },
  { key: 'hasBackupPower',      label: 'برق اضطراری' },
  { key: 'hasWater',            label: 'آب آشامیدنی' },
]

const PAGE_SIZE = 12

// ── Types ──────────────────────────────────────────────────────────────────

type Props = {
  canApprove: boolean
  canDelete:  boolean
  canCreate:  boolean
}

// ── Helpers ────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(7,13,21,.85)', backdropFilter: 'blur(6px)' }}>
      <div className="bg-bg-dark border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-bg-dark z-10">
          <div className="font-bold text-sm">{title}</div>
          <button onClick={onClose} className="text-text-muted text-xl leading-none hover:text-text-primary">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function Toast({ msg, color, onClose }: { msg: string; color: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-2xl text-sm font-bold shadow-xl"
      style={{ background: `${color}20`, color, border: `1px solid ${color}50` }}>
      {msg}
    </div>
  )
}

function FacilityBadge({ has, label }: { has: boolean; label: string }) {
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
      style={has
        ? { background: 'rgba(86,196,138,.15)', color: '#56c48a', border: '1px solid rgba(86,196,138,.3)' }
        : { background: 'rgba(255,255,255,.04)', color: '#56708c', border: '1px solid rgba(255,255,255,.08)' }}>
      {has ? '✓' : '✗'} {label}
    </span>
  )
}

const MEAL_SERVICE_TYPES = [
  { value: 'NONE',    label: 'بدون سرویس غذایی' },
  { value: 'PARTIAL', label: 'سرویس جزئی (یک وعده)' },
  { value: 'FULL',    label: 'سرویس کامل (سه وعده)' },
]

function emptyForm() {
  return {
    name: '', type: 'OTHER', address: '', regionId: '', description: '',
    capacity: '', maleCapacity: '', femaleCapacity: '',
    contactPhone: '', emergencyPhone: '', licenseNumber: '',
    ownerName: '', ownerPhone: '',
    floorCount: '', roomCount: '', toiletCount: '',
    hasKitchen: false, kitchenCapacity: '', hasCooking: false,
    hasRefrigerator: false, hasFoodStorage: false, mealServiceType: 'NONE',
    kitchenNotes: '',
    hasMedical: false, hasParking: false,
    hasDisabilityAccess: false, hasBackupPower: false, hasWater: true,
  }
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function AccommodationManager({ canApprove, canDelete, canCreate }: Props) {
  const [places, setPlaces] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)

  const [applications, setApplications] = useState<any[]>([])
  const [regions, setRegions] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [inspectors, setInspectors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'places' | 'applications'>('places')

  // Filters
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [regionFilter, setRegionFilter] = useState('')
  const [inspectorFilter, setInspectorFilter] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Detail / modals
  const [selectedPlace, setSelectedPlace] = useState<any>(null)
  const [showPlaceModal, setShowPlaceModal] = useState(false)
  const [editingPlace, setEditingPlace] = useState<any>(null)
  const [placeForm, setPlaceForm] = useState(emptyForm())
  const [placeSaving, setPlaceSaving] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<any>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [selectedApp, setSelectedApp] = useState<any>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [toast, setToast] = useState<{ msg: string; color: string } | null>(null)

  function showToast(msg: string, color = '#56c48a') { setToast({ msg, color }) }
  function setF(k: string, v: any) { setPlaceForm(f => ({ ...f, [k]: v })) }

  // Load support data (regions + users) once
  useEffect(() => {
    Promise.all([
      api.get('/regions'),
      api.get('/users?limit=200&status=active'),
    ]).then(([r, u]) => {
      setRegions(Array.isArray(r) ? r : r?.data || [])
      const users: any[] = u?.data || []
      setAllUsers(users)
      setInspectors(users.filter((u: any) => u.userRoles?.some((ur: any) => ur.role?.name === 'INSPECTOR')))
    }).catch(console.error)
  }, [])

  const loadPlaces = useCallback(async (pg: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(pg), limit: String(PAGE_SIZE), sortBy, sortOrder,
      })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      if (regionFilter) params.set('regionId', regionFilter)
      if (inspectorFilter) params.set('inspectorId', inspectorFilter)
      const res = await api.get(`/accommodation/places?${params}`)
      setPlaces(res?.data || [])
      setTotal(res?.total ?? 0)
      setTotalPages(res?.totalPages ?? 1)
      setPage(pg)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [search, statusFilter, regionFilter, inspectorFilter, sortBy, sortOrder])

  async function loadApplications() {
    try {
      const apps = await api.get('/accommodation/applications')
      setApplications(Array.isArray(apps) ? apps : [])
    } catch (e) { console.error(e) }
  }

  // Reload when filters/sort change (reset to page 1)
  useEffect(() => {
    if (activeTab === 'places') loadPlaces(1)
    else loadApplications()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, statusFilter, regionFilter, inspectorFilter, sortBy, sortOrder, search])

  function applySearch() {
    setSearch(searchInput)
    setPage(1)
  }

  function clearFilters() {
    setStatusFilter(''); setRegionFilter(''); setInspectorFilter('')
    setSearchInput(''); setSearch(''); setPage(1)
  }

  const hasActiveFilters = !!(statusFilter || regionFilter || inspectorFilter || search)

  // ── CRUD helpers ───────────────────────────────────────────────────────────

  function openCreate() { setEditingPlace(null); setPlaceForm(emptyForm()); setShowPlaceModal(true) }

  function openEdit(pl: any) {
    setEditingPlace(pl)
    setPlaceForm({
      name: pl.name || '', type: pl.type || 'OTHER',
      address: pl.address || '', regionId: pl.regionId || '', description: pl.description || '',
      capacity: String(pl.capacity || ''), maleCapacity: String(pl.maleCapacity || ''),
      femaleCapacity: String(pl.femaleCapacity || ''),
      contactPhone: pl.contactPhone || '', emergencyPhone: pl.emergencyPhone || '',
      licenseNumber: pl.licenseNumber || '',
      ownerName: pl.ownerName || '', ownerPhone: pl.ownerPhone || '',
      floorCount: String(pl.floorCount || ''), roomCount: String(pl.roomCount || ''),
      toiletCount: String(pl.toiletCount || ''),
      hasKitchen: pl.hasKitchen ?? false, kitchenCapacity: String(pl.kitchenCapacity || ''),
      hasCooking: pl.hasCooking ?? false, hasRefrigerator: pl.hasRefrigerator ?? false,
      hasFoodStorage: pl.hasFoodStorage ?? false, mealServiceType: pl.mealServiceType || 'NONE',
      kitchenNotes: pl.kitchenNotes || '',
      hasMedical: pl.hasMedical ?? false,
      hasParking: pl.hasParking ?? false, hasDisabilityAccess: pl.hasDisabilityAccess ?? false,
      hasBackupPower: pl.hasBackupPower ?? false, hasWater: pl.hasWater ?? true,
    })
    setShowPlaceModal(true)
  }

  function parseNum(v: string) { const n = parseInt(v, 10); return isNaN(n) ? undefined : n }

  async function savePlace() {
    setPlaceSaving(true)
    try {
      const data = {
        name: placeForm.name, type: placeForm.type, address: placeForm.address,
        regionId: placeForm.regionId, description: placeForm.description || undefined,
        capacity: parseNum(placeForm.capacity) ?? 0,
        maleCapacity: parseNum(placeForm.maleCapacity),
        femaleCapacity: parseNum(placeForm.femaleCapacity),
        contactPhone: placeForm.contactPhone || undefined,
        emergencyPhone: placeForm.emergencyPhone || undefined,
        licenseNumber: placeForm.licenseNumber || undefined,
        ownerName: placeForm.ownerName || undefined,
        ownerPhone: placeForm.ownerPhone || undefined,
        floorCount: parseNum(placeForm.floorCount),
        roomCount: parseNum(placeForm.roomCount),
        toiletCount: parseNum(placeForm.toiletCount),
        hasKitchen: placeForm.hasKitchen,
        kitchenCapacity: parseNum(placeForm.kitchenCapacity),
        hasCooking: placeForm.hasCooking, hasRefrigerator: placeForm.hasRefrigerator,
        hasFoodStorage: placeForm.hasFoodStorage,
        mealServiceType: placeForm.mealServiceType || undefined,
        kitchenNotes: placeForm.kitchenNotes || undefined,
        hasMedical: placeForm.hasMedical,
        hasParking: placeForm.hasParking, hasDisabilityAccess: placeForm.hasDisabilityAccess,
        hasBackupPower: placeForm.hasBackupPower, hasWater: placeForm.hasWater,
      }
      if (editingPlace) {
        const updated = await api.put(`/accommodation/places/${editingPlace.id}`, data)
        if (selectedPlace?.id === editingPlace.id) setSelectedPlace(updated)
      } else {
        await api.post('/accommodation/places', data)
      }
      setShowPlaceModal(false)
      showToast(editingPlace ? 'مکان بروزرسانی شد' : 'مکان جدید ایجاد شد')
      await loadPlaces(editingPlace ? page : 1)
    } catch (e: any) { alert(e.message) }
    finally { setPlaceSaving(false) }
  }

  async function approvePlace(id: string) {
    try {
      const updated = await api.put(`/accommodation/places/${id}/status`, { status: 'APPROVED' })
      showToast('مکان تأیید شد ✓')
      // If currently filtering by PENDING, clear filter so the approved place stays visible
      if (statusFilter === 'PENDING') setStatusFilter('')
      else await loadPlaces(page)
      if (selectedPlace?.id === id) setSelectedPlace(updated)
    } catch (e: any) { alert(e.message) }
  }

  async function rejectPlace() {
    if (!rejectTarget) return
    try {
      await api.put(`/accommodation/places/${rejectTarget.id}/status`, { status: 'REJECTED', rejectionReason: rejectReason })
      showToast('مکان رد شد', '#e07a7a')
      setRejectTarget(null); setRejectReason('')
      if (selectedPlace?.id === rejectTarget.id) setSelectedPlace(null)
      await loadPlaces(page)
    } catch (e: any) { alert(e.message) }
  }

  async function assignInspector(placeId: string, inspectorId: string | null) {
    try {
      const updated = await api.put(`/accommodation/places/${placeId}/assign-inspector`, { inspectorId })
      showToast(inspectorId ? 'بازرس تعیین شد' : 'بازرس برداشته شد')
      await loadPlaces(page)
      if (selectedPlace?.id === placeId) setSelectedPlace(updated)
    } catch (e: any) { alert(e.message) }
  }

  async function assignManager(placeId: string, userId: string) {
    try {
      await api.put(`/accommodation/places/${placeId}/manager`, { userId })
      showToast('مدیر مکان تعیین شد')
      await loadPlaces(page)
    } catch (e: any) { alert(e.message) }
  }

  async function deletePlace(id: string) {
    if (!confirm('آیا از حذف این مکان اطمینان دارید؟')) return
    try {
      await api.delete(`/accommodation/places/${id}`)
      showToast('مکان حذف شد', '#e07a7a')
      setSelectedPlace(null)
      await loadPlaces(places.length === 1 && page > 1 ? page - 1 : page)
    } catch (e: any) { alert(e.message) }
  }

  async function reviewApp(status: 'APPROVED' | 'REJECTED') {
    if (!selectedApp) return
    try {
      await api.put(`/accommodation/applications/${selectedApp.id}/review`, { status, reviewNote })
      showToast(status === 'APPROVED' ? 'درخواست تأیید شد' : 'درخواست رد شد', status === 'APPROVED' ? '#56c48a' : '#e07a7a')
      setSelectedApp(null); setReviewNote('')
      await loadApplications()
    } catch (e: any) { alert(e.message) }
  }

  // ── Place detail panel ──────────────────────────────────────────────────
  if (selectedPlace) {
    const st = PLACE_STATUS_LABELS[selectedPlace.status] || PLACE_STATUS_LABELS.PENDING
    return (
      <div>
        {toast && <Toast msg={toast.msg} color={toast.color} onClose={() => setToast(null)} />}
        <button onClick={() => setSelectedPlace(null)} className="text-sm text-text-muted hover:text-text-primary mb-4 inline-flex items-center gap-1">← بازگشت به لیست</button>

        <div className="grid grid-cols-[1fr_300px] gap-4">
          {/* Main info */}
          <div className="space-y-4">
            <div className="bg-bg-card border border-border rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="text-lg font-black">{selectedPlace.name}</div>
                  <div className="text-xs text-text-muted mt-0.5">{PLACE_TYPE_LABELS[selectedPlace.type] || selectedPlace.type} — {selectedPlace.region?.name}</div>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl flex-shrink-0" style={{ color: st.color, background: `${st.color}20`, border: `1px solid ${st.color}40` }}>{st.label}</span>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs mb-4">
                {[
                  ['آدرس', selectedPlace.address],
                  ['ظرفیت کل', `${selectedPlace.capacity} نفر`],
                  ['ظرفیت آقایان', selectedPlace.maleCapacity ? `${selectedPlace.maleCapacity} نفر` : '—'],
                  ['ظرفیت بانوان', selectedPlace.femaleCapacity ? `${selectedPlace.femaleCapacity} نفر` : '—'],
                  ['اشغال فعلی', `${selectedPlace.currentOccupancy} نفر`],
                  ['تلفن تماس', selectedPlace.contactPhone || '—'],
                  ['تلفن اضطراری', selectedPlace.emergencyPhone || '—'],
                  ['شماره مجوز', selectedPlace.licenseNumber || '—'],
                  ['تعداد طبقه', selectedPlace.floorCount ?? '—'],
                  ['تعداد اتاق', selectedPlace.roomCount ?? '—'],
                  ['تعداد سرویس', selectedPlace.toiletCount ?? '—'],
                  ['مالک/مسئول', selectedPlace.ownerName || '—'],
                  ['تلفن مالک', selectedPlace.ownerPhone || '—'],
                ].map(([l, v]) => (
                  <div key={String(l)} className="flex gap-2">
                    <span className="text-text-muted min-w-[90px]">{l}:</span>
                    <span className="text-text-primary font-medium">{v}</span>
                  </div>
                ))}
              </div>

              {selectedPlace.description && (
                <div className="bg-bg-dark rounded-xl p-3 text-xs text-text-secondary leading-6">{selectedPlace.description}</div>
              )}
            </div>

            <div className="bg-bg-card border border-border rounded-2xl p-4">
              <div className="text-xs font-bold text-text-secondary mb-3">امکانات</div>
              <div className="flex flex-wrap gap-2">
                {FACILITY_FLAGS.map(f => <FacilityBadge key={f.key} has={selectedPlace[f.key]} label={f.label} />)}
              </div>
            </div>

            {selectedPlace.hasKitchen && (
              <div className="bg-bg-card border border-border rounded-2xl p-4">
                <div className="text-xs font-bold text-text-secondary mb-3">آشپزخانه و سرویس غذایی</div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs mb-3">
                  {selectedPlace.kitchenCapacity && (
                    <div className="flex gap-2"><span className="text-text-muted">ظرفیت پخت:</span><strong>{selectedPlace.kitchenCapacity} وعده/روز</strong></div>
                  )}
                  {selectedPlace.mealServiceType && selectedPlace.mealServiceType !== 'NONE' && (
                    <div className="flex gap-2"><span className="text-text-muted">سرویس غذا:</span><strong>{MEAL_SERVICE_TYPES.find(t => t.value === selectedPlace.mealServiceType)?.label || selectedPlace.mealServiceType}</strong></div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {[{ key: 'hasCooking', label: 'اجاق/فر' }, { key: 'hasRefrigerator', label: 'یخچال' }, { key: 'hasFoodStorage', label: 'انبار غذا' }].map(f => (
                    <FacilityBadge key={f.key} has={selectedPlace[f.key]} label={f.label} />
                  ))}
                </div>
                {selectedPlace.kitchenNotes && <div className="text-xs text-text-secondary bg-white/[.03] rounded-lg p-2 leading-5">{selectedPlace.kitchenNotes}</div>}
              </div>
            )}

            <div className="bg-bg-card border border-border rounded-2xl p-4 text-xs space-y-1.5">
              <div className="font-bold text-text-secondary mb-2">اطلاعات ثبت</div>
              <div className="text-text-muted">ثبت توسط: <span className="text-text-primary">{selectedPlace.createdBy?.fullName || '—'}</span></div>
              {selectedPlace.createdAt && <div className="text-text-muted">تاریخ ثبت: <span className="text-text-primary">{new Date(selectedPlace.createdAt).toLocaleString('fa-IR')}</span></div>}
              {selectedPlace.approvedBy && <div className="text-text-muted">تأیید توسط: <span className="text-green">{selectedPlace.approvedBy.fullName}</span></div>}
              {selectedPlace.approvedAt && <div className="text-text-muted">تاریخ تأیید: <span className="text-text-primary">{new Date(selectedPlace.approvedAt).toLocaleString('fa-IR')}</span></div>}
              {selectedPlace.rejectionReason && <div className="text-text-muted">دلیل رد: <span className="text-red-400">{selectedPlace.rejectionReason}</span></div>}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-3">
            {canApprove && selectedPlace.status === 'PENDING' && (
              <div className="bg-bg-card border border-yellow/30 rounded-2xl p-4 space-y-2">
                <div className="text-xs font-bold text-yellow mb-2">تأیید / رد مکان</div>
                <button onClick={() => approvePlace(selectedPlace.id)} className="w-full py-2.5 rounded-xl text-sm font-bold" style={{ background: 'rgba(86,196,138,.2)', color: '#56c48a', border: '1px solid rgba(86,196,138,.4)' }}>✓ تأیید مکان</button>
                <button onClick={() => { setRejectTarget(selectedPlace); setRejectReason('') }} className="w-full py-2.5 rounded-xl text-sm font-bold" style={{ background: 'rgba(224,122,122,.15)', color: '#e07a7a', border: '1px solid rgba(224,122,122,.3)' }}>✗ رد مکان</button>
              </div>
            )}
            {canApprove && selectedPlace.status === 'APPROVED' && (
              <div className="bg-bg-card border border-green/20 rounded-2xl p-3">
                <div className="text-xs text-green font-bold text-center">✓ تأیید شده</div>
              </div>
            )}
            {canApprove && (
              <div className="bg-bg-card border border-border rounded-2xl p-4">
                <div className="text-xs font-bold text-text-secondary mb-2">تعیین بازرس</div>
                <select value={selectedPlace.assignedInspectorId || ''} onChange={e => assignInspector(selectedPlace.id, e.target.value || null)}
                  className="w-full px-3 py-2 bg-bg-dark border border-border rounded-xl text-sm focus:outline-none">
                  <option value="">بدون بازرس</option>
                  {inspectors.map((i: any) => <option key={i.id} value={i.id}>{i.fullName}</option>)}
                </select>
                {selectedPlace.assignedInspector && (
                  <div className="text-xs text-blue mt-1.5">بازرس فعلی: {selectedPlace.assignedInspector.fullName}</div>
                )}
              </div>
            )}
            <div className="bg-bg-card border border-border rounded-2xl p-4">
              <div className="text-xs font-bold text-text-secondary mb-2">مدیر مکان</div>
              <select defaultValue={selectedPlace.managerId || ''} onChange={e => assignManager(selectedPlace.id, e.target.value)}
                className="w-full px-3 py-2 bg-bg-dark border border-border rounded-xl text-sm focus:outline-none">
                <option value="">انتخاب مدیر...</option>
                {allUsers.map((u: any) => <option key={u.id} value={u.id}>{u.fullName} — {u.email}</option>)}
              </select>
              {selectedPlace.manager && <div className="text-xs text-green mt-1.5">مدیر: {selectedPlace.manager.fullName}</div>}
            </div>
            <button onClick={() => openEdit(selectedPlace)} className="w-full py-2.5 rounded-xl text-sm border border-border text-text-muted hover:border-blue/40 hover:text-blue transition-all">ویرایش اطلاعات</button>
            {canDelete && selectedPlace.status !== 'APPROVED' && (
              <button onClick={() => deletePlace(selectedPlace.id)} className="w-full py-2.5 rounded-xl text-sm border border-red/30 text-red hover:bg-red/10 transition-all">حذف مکان</button>
            )}
          </div>
        </div>

        {/* Reject modal from detail view */}
        {rejectTarget && (
          <Modal title={`رد مکان: ${rejectTarget.name}`} onClose={() => setRejectTarget(null)}>
            <RejectBody reason={rejectReason} onChange={setRejectReason} onCancel={() => setRejectTarget(null)} onConfirm={rejectPlace} />
          </Modal>
        )}

        {showPlaceModal && (
          <PlaceModal title={editingPlace ? `ویرایش: ${editingPlace.name}` : 'ایجاد مکان اسکان'}
            form={placeForm} setF={setF} regions={regions} saving={placeSaving}
            onSave={savePlace} onClose={() => setShowPlaceModal(false)} isEdit={!!editingPlace} />
        )}
      </div>
    )
  }

  // ── List view ────────────────────────────────────────────────────────────
  return (
    <div>
      {toast && <Toast msg={toast.msg} color={toast.color} onClose={() => setToast(null)} />}

      {/* Tab + create button */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex gap-1 bg-white/[.03] p-1 rounded-xl border border-border">
          <button onClick={() => setActiveTab('places')} className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'places' ? 'bg-green/20 text-green' : 'text-text-muted'}`}>
            اماکن ({total.toLocaleString('fa-IR')})
          </button>
          <button onClick={() => setActiveTab('applications')} className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'applications' ? 'bg-blue/20 text-blue' : 'text-text-muted'}`}>
            درخواست‌ها ({applications.filter(a => a.status === 'SUBMITTED').length})
          </button>
        </div>
        {canCreate && activeTab === 'places' && (
          <button onClick={openCreate} className="px-4 py-1.5 rounded-lg text-xs font-bold" style={{ background: '#56c48a', color: '#070d15' }}>+ ایجاد مکان</button>
        )}
      </div>

      {/* Filter row — places only */}
      {activeTab === 'places' && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="flex items-center gap-1 flex-1 min-w-[180px]">
            <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applySearch()}
              placeholder="جستجوی نام مکان..." className="flex-1 px-3 py-1.5 bg-bg-card border border-border rounded-lg text-xs focus:outline-none" />
            <button onClick={applySearch} className="px-3 py-1.5 border border-border rounded-lg text-xs text-text-muted hover:border-white/20">جستجو</button>
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-bg-card border border-border rounded-lg text-xs focus:outline-none">
            <option value="">همه وضعیت‌ها</option>
            {Object.entries(PLACE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)}
            className="px-3 py-1.5 bg-bg-card border border-border rounded-lg text-xs focus:outline-none">
            <option value="">همه مناطق</option>
            {regions.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <select value={inspectorFilter} onChange={e => setInspectorFilter(e.target.value)}
            className="px-3 py-1.5 bg-bg-card border border-border rounded-lg text-xs focus:outline-none">
            <option value="">همه بازرسان</option>
            {inspectors.map((i: any) => <option key={i.id} value={i.id}>{i.fullName}</option>)}
          </select>
          <select value={`${sortBy}-${sortOrder}`} onChange={e => { const [s, o] = e.target.value.split('-'); setSortBy(s); setSortOrder(o as 'asc' | 'desc') }}
            className="px-3 py-1.5 bg-bg-card border border-border rounded-lg text-xs focus:outline-none">
            <option value="createdAt-desc">جدیدترین</option>
            <option value="createdAt-asc">قدیمی‌ترین</option>
            <option value="name-asc">نام (الف-ی)</option>
            <option value="capacity-desc">بیشترین ظرفیت</option>
            <option value="currentOccupancy-desc">بیشترین اشغال</option>
          </select>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="px-3 py-1.5 rounded-lg text-xs text-text-muted border border-border hover:border-red/30 hover:text-red transition-all">× پاک کردن</button>
          )}
        </div>
      )}

      {/* Places list */}
      {activeTab === 'places' && (
        <div>
          {loading && <div className="text-center py-10 text-text-muted text-sm">بارگذاری...</div>}
          {!loading && places.length === 0 && (
            <div className="text-center py-12 text-text-muted text-sm border border-border rounded-2xl">
              {hasActiveFilters ? 'مکانی با این فیلترها یافت نشد' : 'هیچ مکانی ثبت نشده است'}
            </div>
          )}
          <div className="space-y-3">
            {places.map((pl: any) => {
              const st = PLACE_STATUS_LABELS[pl.status] || PLACE_STATUS_LABELS.PENDING
              const occupancyPct = pl.capacity > 0 ? Math.round((pl.currentOccupancy / pl.capacity) * 100) : 0
              return (
                <div key={pl.id} onClick={() => setSelectedPlace(pl)}
                  className="bg-bg-card border border-border rounded-2xl p-4 cursor-pointer hover:border-blue/40 transition-all">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-bold">{pl.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[.05] text-text-muted">{PLACE_TYPE_LABELS[pl.type] || pl.type}</span>
                      </div>
                      <div className="text-xs text-text-muted">{pl.address} — {pl.region?.name}</div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg flex-shrink-0" style={{ color: st.color, background: `${st.color}20` }}>{st.label}</span>
                  </div>

                  <div className="grid grid-cols-4 gap-3 text-xs mb-3">
                    <div><span className="text-text-dim">ظرفیت: </span><strong>{pl.capacity}</strong></div>
                    <div><span className="text-text-dim">اشغال: </span><strong style={{ color: occupancyPct > 80 ? '#e07a7a' : '#56c48a' }}>{pl.currentOccupancy}</strong></div>
                    <div><span className="text-text-dim">مدیر: </span><strong className={pl.manager ? 'text-green' : 'text-text-dim'}>{pl.manager?.fullName || '—'}</strong></div>
                    <div><span className="text-text-dim">بازرس: </span><strong className={pl.assignedInspector ? 'text-blue' : 'text-text-dim'}>{pl.assignedInspector?.fullName || '—'}</strong></div>
                  </div>

                  <div className="h-1.5 bg-white/[.06] rounded-full mb-2">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(occupancyPct, 100)}%`, background: occupancyPct > 80 ? '#e07a7a' : '#56c48a' }} />
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {FACILITY_FLAGS.filter(f => pl[f.key]).map(f => (
                      <span key={f.key} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(86,196,138,.12)', color: '#56c48a' }}>{f.label}</span>
                    ))}
                  </div>

                  {canApprove && pl.status === 'PENDING' && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-border" onClick={e => e.stopPropagation()}>
                      <button onClick={() => approvePlace(pl.id)} className="flex-1 py-1.5 rounded-lg text-xs font-bold" style={{ background: 'rgba(86,196,138,.2)', color: '#56c48a' }}>✓ تأیید</button>
                      <button onClick={() => { setRejectTarget(pl); setRejectReason('') }} className="flex-1 py-1.5 rounded-lg text-xs font-bold" style={{ background: 'rgba(224,122,122,.15)', color: '#e07a7a' }}>✗ رد</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-5">
              <div className="text-xs text-text-muted">{total.toLocaleString('fa-IR')} مکان</div>
              <div className="flex items-center gap-1">
                <button disabled={page <= 1} onClick={() => loadPlaces(page - 1)}
                  className="w-8 h-8 rounded-lg border border-border text-text-muted text-xs disabled:opacity-30 hover:border-white/20">◄</button>
                {buildPageNumbers(page, totalPages).map((p, i) =>
                  p === '…' ? (
                    <span key={`ellipsis-${i}`} className="w-8 text-center text-xs text-text-dim">…</span>
                  ) : (
                    <button key={p} onClick={() => loadPlaces(p as number)}
                      className={`w-8 h-8 rounded-lg text-xs font-semibold border transition-all ${p === page ? 'bg-green/20 text-green border-green/30' : 'border-border text-text-muted hover:border-white/20'}`}>
                      {(p as number).toLocaleString('fa-IR')}
                    </button>
                  )
                )}
                <button disabled={page >= totalPages} onClick={() => loadPlaces(page + 1)}
                  className="w-8 h-8 rounded-lg border border-border text-text-muted text-xs disabled:opacity-30 hover:border-white/20">►</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Applications list */}
      {activeTab === 'applications' && (
        <div className="space-y-3">
          {applications.map((app: any) => {
            const st = { SUBMITTED: { label: 'ثبت شده', color: '#e0c14f' }, UNDER_REVIEW: { label: 'در بررسی', color: '#b08ce0' }, APPROVED: { label: 'تأیید', color: '#56c48a' }, REJECTED: { label: 'رد', color: '#e07a7a' }, NEEDS_INFO: { label: 'نیاز به اطلاعات', color: '#e0a450' } }[app.status as string] || { label: app.status, color: '#56708c' }
            return (
              <div key={app.id} className="bg-bg-card border border-border rounded-2xl p-4 cursor-pointer hover:border-blue/30 transition-all" onClick={() => { setSelectedApp(app); setReviewNote('') }}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="text-sm font-bold">{app.name}</div>
                    <div className="text-xs text-text-muted mt-0.5">{app.address} — {app.region?.name}</div>
                    <div className="text-xs text-text-dim mt-1">ثبت: {app.submittedBy?.fullName} • ظرفیت: {app.capacity}</div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg flex-shrink-0" style={{ color: st.color, background: `${st.color}20` }}>{st.label}</span>
                </div>
              </div>
            )
          })}
          {applications.length === 0 && <div className="text-center py-10 text-text-muted text-sm border border-border rounded-2xl">درخواستی وجود ندارد</div>}
        </div>
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <Modal title={`رد مکان: ${rejectTarget.name}`} onClose={() => setRejectTarget(null)}>
          <RejectBody reason={rejectReason} onChange={setRejectReason} onCancel={() => setRejectTarget(null)} onConfirm={rejectPlace} />
        </Modal>
      )}

      {/* Application review modal */}
      {selectedApp && canApprove && (
        <Modal title={`بررسی درخواست: ${selectedApp.name}`} onClose={() => setSelectedApp(null)}>
          <div className="space-y-4">
            <div className="bg-bg rounded-xl p-3 space-y-1 text-xs">
              {([['آدرس', selectedApp.address], ['منطقه', selectedApp.region?.name], ['ظرفیت', `${selectedApp.capacity} نفر`], ['مسئول', `${selectedApp.contactName} — ${selectedApp.contactEmail}`], ['توضیحات', selectedApp.description], ['ثبت‌کننده', selectedApp.submittedBy?.fullName]] as [string, string][]).filter(([, v]) => v).map(([l, v]) => (
                <div key={l}><span className="text-text-muted">{l}: </span>{v}</div>
              ))}
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">یادداشت بررسی</label>
              <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} rows={3} className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm focus:outline-none resize-none" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => reviewApp('REJECTED')} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: 'rgba(224,122,122,.15)', color: '#e07a7a', border: '1px solid rgba(224,122,122,.3)' }}>رد</button>
              <button onClick={() => reviewApp('APPROVED')} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: 'rgba(86,196,138,.15)', color: '#56c48a', border: '1px solid rgba(86,196,138,.3)' }}>تأیید</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Place create/edit modal */}
      {showPlaceModal && (
        <PlaceModal title={editingPlace ? `ویرایش: ${editingPlace.name}` : 'ایجاد مکان اسکان'}
          form={placeForm} setF={setF} regions={regions} saving={placeSaving}
          onSave={savePlace} onClose={() => setShowPlaceModal(false)} isEdit={!!editingPlace} />
      )}
    </div>
  )
}

// ── Subcomponents ──────────────────────────────────────────────────────────

function RejectBody({ reason, onChange, onCancel, onConfirm }: { reason: string; onChange: (v: string) => void; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="space-y-4">
      <div className="text-xs text-text-muted bg-white/[.04] rounded-xl p-3">دلیل رد این مکان را وارد کنید. این اطلاعات ذخیره خواهد شد.</div>
      <div>
        <label className="block text-xs text-text-secondary mb-1.5">دلیل رد</label>
        <textarea value={reason} onChange={e => onChange(e.target.value)} rows={3}
          className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm focus:outline-none resize-none"
          placeholder="مثلاً: مدارک ناقص، ظرفیت اعلامی نادرست..." />
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-border text-sm text-text-muted">لغو</button>
        <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: '#e07a7a', color: '#fff' }}>رد مکان</button>
      </div>
    </div>
  )
}

function PlaceModal({ title, form, setF, regions, saving, onSave, onClose, isEdit }: {
  title: string; form: any; setF: (k: string, v: any) => void; regions: any[];
  saving: boolean; onSave: () => void; onClose: () => void; isEdit: boolean;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs text-text-secondary mb-1">نام مکان *</label>
            <input value={form.name} onChange={e => setF('name', e.target.value)} className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm focus:outline-none" placeholder="مثال: مدرسه شهید بهشتی" />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">نوع مکان *</label>
            <select value={form.type} onChange={e => setF('type', e.target.value)} className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm focus:outline-none">
              {Object.entries(PLACE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">منطقه *</label>
            <select value={form.regionId} onChange={e => setF('regionId', e.target.value)} className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm focus:outline-none">
              <option value="">انتخاب منطقه...</option>
              {regions.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-text-secondary mb-1">آدرس *</label>
            <input value={form.address} onChange={e => setF('address', e.target.value)} className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm focus:outline-none" />
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-text-secondary mb-2">ظرفیت</div>
          <div className="grid grid-cols-3 gap-3">
            {([['capacity', 'کل *'], ['maleCapacity', 'آقایان'], ['femaleCapacity', 'بانوان']] as [string, string][]).map(([k, l]) => (
              <div key={k}>
                <label className="block text-xs text-text-secondary mb-1">{l}</label>
                <input type="number" min="0" value={form[k]} onChange={e => setF(k, e.target.value)} className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm focus:outline-none" />
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-text-secondary mb-2">مشخصات فیزیکی</div>
          <div className="grid grid-cols-3 gap-3">
            {([['floorCount', 'طبقه'], ['roomCount', 'اتاق'], ['toiletCount', 'سرویس']] as [string, string][]).map(([k, l]) => (
              <div key={k}>
                <label className="block text-xs text-text-secondary mb-1">{l}</label>
                <input type="number" min="0" value={form[k]} onChange={e => setF(k, e.target.value)} className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm focus:outline-none" />
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-text-secondary mb-2">اطلاعات تماس</div>
          <div className="grid grid-cols-2 gap-3">
            {([['contactPhone', 'تلفن تماس'], ['emergencyPhone', 'تلفن اضطراری'], ['licenseNumber', 'شماره مجوز'], ['ownerName', 'نام مالک/مسئول'], ['ownerPhone', 'تلفن مالک']] as [string, string][]).map(([k, l]) => (
              <div key={k}>
                <label className="block text-xs text-text-secondary mb-1">{l}</label>
                <input value={form[k]} onChange={e => setF(k, e.target.value)} className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm focus:outline-none" />
              </div>
            ))}
          </div>
        </div>

        {/* Kitchen / Food section */}
        <div className="border border-border rounded-xl p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-text-secondary">آشپزخانه و سرویس غذایی</div>
            <button type="button" onClick={() => setF('hasKitchen', !form.hasKitchen)}
              className="px-3 py-1 rounded-lg text-xs border transition-all"
              style={form.hasKitchen
                ? { background: 'rgba(86,196,138,.2)', color: '#56c48a', borderColor: 'rgba(86,196,138,.4)' }
                : { borderColor: 'rgba(255,255,255,.1)', color: '#7e93a8' }}>
              {form.hasKitchen ? '✓ دارد' : 'ندارد'}
            </button>
          </div>

          {form.hasKitchen && (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-secondary mb-1">ظرفیت پخت (وعده/روز)</label>
                  <input type="number" min="0" value={form.kitchenCapacity} onChange={e => setF('kitchenCapacity', e.target.value)}
                    className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">نوع سرویس غذایی</label>
                  <select value={form.mealServiceType} onChange={e => setF('mealServiceType', e.target.value)}
                    className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm focus:outline-none">
                    {MEAL_SERVICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'hasCooking',     label: 'اجاق/فر' },
                  { key: 'hasRefrigerator', label: 'یخچال' },
                  { key: 'hasFoodStorage',  label: 'انبار غذا' },
                ].map(f => (
                  <button key={f.key} type="button" onClick={() => setF(f.key, !form[f.key])}
                    className="px-3 py-1.5 rounded-lg text-xs border transition-all"
                    style={(form as any)[f.key]
                      ? { background: 'rgba(86,196,138,.2)', color: '#56c48a', borderColor: 'rgba(86,196,138,.4)' }
                      : { borderColor: 'rgba(255,255,255,.1)', color: '#7e93a8' }}>
                    {f.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs text-text-secondary mb-1">یادداشت آشپزخانه</label>
                <textarea value={form.kitchenNotes} onChange={e => setF('kitchenNotes', e.target.value)} rows={2}
                  className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm focus:outline-none resize-none"
                  placeholder="جزئیات تجهیزات، محدودیت‌ها، شرایط خاص..." />
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="text-xs font-semibold text-text-secondary mb-2">سایر امکانات</div>
          <div className="flex flex-wrap gap-2">
            {FACILITY_FLAGS.filter(f => !['hasKitchen'].includes(f.key)).map(f => (
              <button key={f.key} type="button" onClick={() => setF(f.key, !form[f.key])}
                className="px-3 py-1.5 rounded-lg text-xs border transition-all"
                style={form[f.key]
                  ? { background: 'rgba(86,196,138,.2)', color: '#56c48a', borderColor: 'rgba(86,196,138,.4)' }
                  : { borderColor: 'rgba(255,255,255,.1)', color: '#7e93a8' }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-text-secondary mb-1">توضیحات</label>
          <textarea value={form.description} onChange={e => setF('description', e.target.value)} rows={2} className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm focus:outline-none resize-none" />
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm text-text-muted">لغو</button>
          <button onClick={onSave} disabled={saving || !form.name || !form.regionId || !form.capacity}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
            style={{ background: '#56c48a', color: '#070d15' }}>
            {saving ? 'در حال ذخیره...' : isEdit ? 'ذخیره تغییرات' : 'ایجاد مکان'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// Smart pagination: show first, last, current ±2, with ellipsis
function buildPageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '…')[] = [1]
  if (current > 3) pages.push('…')
  for (let p = Math.max(2, current - 2); p <= Math.min(total - 1, current + 2); p++) pages.push(p)
  if (current < total - 2) pages.push('…')
  pages.push(total)
  return pages
}
