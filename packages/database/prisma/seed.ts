import {
  PrismaClient, AppType, RegionLevel,
  InspectionStatus, ReviewAction,
  CitizenReportStatus, CitizenReportPriority,
  AccommodationRequestStatus,
  LostFoundStatus, Gender,
  EmergencyStatus, EmergencyPriority,
  AssignmentStatus,
  SupportTicketStatus, SupportTicketPriority,
} from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const hash = (pw: string) => bcrypt.hashSync(pw, 10)
const DEFAULT_PW = 'Admin1234'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}
function hoursAgo(n: number): Date {
  return new Date(Date.now() - n * 3600_000)
}

async function main() {
  console.log('🌱 Seeding database...\n')

  // ─── 1. Clear operational data (safe to re-run) ───────────────────────────
  await prisma.notificationEvent.deleteMany({})
  await prisma.auditLog.deleteMany({})
  await prisma.supportTicket.deleteMany({})
  await prisma.comment.deleteMany({})
  await prisma.attachment.deleteMany({})
  await prisma.checklistResponse.deleteMany({})
  await prisma.inspectionReview.deleteMany({})
  await prisma.assignment.deleteMany({})
  await prisma.inspectionSubmission.deleteMany({})
  await prisma.inspectionLocation.deleteMany({})
  await prisma.checklistItem.deleteMany({})
  await prisma.checklist.deleteMany({})
  await prisma.accommodationRequest.deleteMany({})
  await prisma.accommodationPlace.deleteMany({})
  await prisma.emergencyReport.deleteMany({})
  await prisma.lostFoundPerson.deleteMany({})
  await prisma.citizenReport.deleteMany({})
  // Clear app access so role/appType changes in config take effect on re-seed
  await prisma.userAppAccess.deleteMany({})
  await prisma.userRole.deleteMany({})
  console.log('✅ Operational data cleared')

  // ─── 2. Permissions ───────────────────────────────────────────────────────
  const resources = [
    'users', 'roles', 'regions', 'inspections', 'checklists',
    'reports', 'accommodation', 'lost-found', 'emergency',
    'assignments', 'dashboard', 'audit-logs', 'support', 'settings',
  ]
  const actions = ['create', 'read', 'update', 'delete', 'approve', 'reject', 'assign']
  const perms: Record<string, string> = {}

  for (const res of resources) {
    for (const act of actions) {
      const name = `${res}:${act}`
      const p = await prisma.permission.upsert({
        where: { name },
        update: {},
        create: { name, displayName: `${act} ${res}`, resource: res, action: act },
      })
      perms[name] = p.id
    }
  }
  console.log('✅ Permissions seeded')

  // ─── 3. Roles ─────────────────────────────────────────────────────────────
  const rolesConfig = [
    {
      name: 'SUPER_ADMIN', displayName: 'مدیر کل سیستم',
      description: 'دسترسی کامل به تمام بخش‌های سیستم',
      perms: Object.keys(perms),
      appTypes: [AppType.ADMIN, AppType.HQ, AppType.SUPPORT],
    },
    {
      name: 'HQ_MANAGER', displayName: 'مسئول ستاد',
      description: 'داشبورد ستادی، گزارش‌ها، نقشه عملیاتی',
      perms: [
        'dashboard:read', 'inspections:read', 'inspections:approve', 'inspections:reject',
        'reports:read', 'regions:read', 'users:read', 'audit-logs:read',
        'lost-found:read', 'lost-found:update', 'emergency:read', 'assignments:create',
        'assignments:read', 'checklists:read', 'accommodation:read', 'settings:read',
      ],
      appTypes: [AppType.HQ],
    },
    {
      name: 'COMMANDER', displayName: 'مسئول قرارگاه',
      description: 'بررسی رکوردهای ناحیه و ارجاع به بازرس',
      perms: [
        'inspections:read', 'inspections:approve', 'inspections:assign',
        'assignments:create', 'assignments:read', 'regions:read',
        'dashboard:read', 'lost-found:read', 'emergency:read',
      ],
      appTypes: [AppType.DISTRICT],
    },
    {
      name: 'INSPECTOR', displayName: 'بازرس میدانی',
      description: 'بازرسی میدانی، تأیید/رد رکوردها، چک‌لیست',
      perms: [
        'inspections:read', 'inspections:approve', 'inspections:reject',
        'assignments:read', 'assignments:update', 'checklists:read',
        'lost-found:read', 'lost-found:create', 'emergency:read',
      ],
      appTypes: [AppType.INSPECTOR],
    },
    {
      name: 'DISTRICT_MANAGER', displayName: 'مسئول ناحیه',
      description: 'ثبت داده‌های خدمات ناحیه',
      perms: ['inspections:create', 'inspections:read', 'regions:read', 'checklists:read', 'dashboard:read'],
      appTypes: [AppType.DISTRICT],
    },
    {
      name: 'CITIZEN', displayName: 'شهروند',
      description: 'ثبت گزارش، درخواست اسکان، گمشده',
      perms: [
        'reports:create', 'reports:read', 'accommodation:create',
        'accommodation:read', 'lost-found:create', 'lost-found:read', 'emergency:create',
      ],
      appTypes: [AppType.CITIZEN],
    },
    {
      name: 'ACCOMMODATION_MANAGER', displayName: 'مسئول اسکان',
      description: 'مدیریت اماکن اسکان و درخواست‌ها',
      perms: [
        'accommodation:create', 'accommodation:read', 'accommodation:update',
        'lost-found:create', 'lost-found:read', 'lost-found:update', 'regions:read',
      ],
      appTypes: [AppType.ACCOMMODATION],
    },
    {
      name: 'SUPPORT', displayName: 'پشتیبانی سیستم',
      description: 'مدیریت کاربران، تیکت‌ها، لاگ سیستم',
      perms: [
        'users:read', 'users:create', 'users:update',
        'support:create', 'support:read', 'support:update',
        'audit-logs:read', 'dashboard:read',
      ],
      appTypes: [AppType.SUPPORT],
    },
  ]

  const roleIds: Record<string, string> = {}
  for (const rd of rolesConfig) {
    const role = await prisma.role.upsert({
      where: { name: rd.name },
      update: { displayName: rd.displayName, description: rd.description },
      create: { name: rd.name, displayName: rd.displayName, description: rd.description },
    })
    roleIds[rd.name] = role.id
    for (const pn of rd.perms) {
      if (perms[pn]) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: perms[pn] } },
          update: {},
          create: { roleId: role.id, permissionId: perms[pn] },
        })
      }
    }
  }
  console.log('✅ Roles seeded')

  // ─── 4. Regions ───────────────────────────────────────────────────────────
  const city = await prisma.region.upsert({
    where: { code: 'TEH' },
    update: {},
    create: { name: 'شهر تهران', code: 'TEH', level: RegionLevel.CITY },
  })

  const regionNames = [
    'منطقه ۱', 'منطقه ۲', 'منطقه ۳', 'منطقه ۴', 'منطقه ۵',
    'منطقه ۶', 'منطقه ۷', 'منطقه ۸', 'منطقه ۹', 'منطقه ۱۰',
    'منطقه ۱۱', 'منطقه ۱۲', 'منطقه ۱۳', 'منطقه ۱۴', 'منطقه ۱۵',
    'منطقه ۱۶', 'منطقه ۱۷', 'منطقه ۱۸', 'منطقه ۱۹', 'منطقه ۲۰',
    'منطقه ۲۱', 'منطقه ۲۲',
  ]
  const rids: string[] = []
  for (let i = 0; i < 22; i++) {
    const code = `TEH-R${String(i + 1).padStart(2, '0')}`
    const r = await prisma.region.upsert({
      where: { code },
      update: {},
      create: { name: regionNames[i], code, level: RegionLevel.REGION, parentId: city.id },
    })
    rids.push(r.id)
  }

  // Districts under regions 6, 11, 12
  const districtDefs = [
    { code: 'TEH-R06-D1', name: 'ناحیه ۱ منطقه ۶', parentIdx: 5 },
    { code: 'TEH-R06-D2', name: 'ناحیه ۲ منطقه ۶', parentIdx: 5 },
    { code: 'TEH-R06-D3', name: 'ناحیه ۳ منطقه ۶', parentIdx: 5 },
    { code: 'TEH-R11-D1', name: 'ناحیه ۱ منطقه ۱۱', parentIdx: 10 },
    { code: 'TEH-R11-D2', name: 'ناحیه ۲ منطقه ۱۱', parentIdx: 10 },
    { code: 'TEH-R12-D1', name: 'ناحیه ۱ منطقه ۱۲', parentIdx: 11 },
    { code: 'TEH-R12-D2', name: 'ناحیه ۲ منطقه ۱۲', parentIdx: 11 },
    { code: 'TEH-R12-D3', name: 'ناحیه ۳ منطقه ۱۲', parentIdx: 11 },
    { code: 'TEH-R12-D4', name: 'ناحیه ۴ منطقه ۱۲', parentIdx: 11 },
    { code: 'TEH-R12-D5', name: 'ناحیه ۵ منطقه ۱۲', parentIdx: 11 },
    { code: 'TEH-R19-D1', name: 'ناحیه ۱ منطقه ۱۹', parentIdx: 18 },
    { code: 'TEH-R19-D2', name: 'ناحیه ۲ منطقه ۱۹', parentIdx: 18 },
  ]
  const districtIds: Record<string, string> = {}
  for (const dd of districtDefs) {
    const d = await prisma.region.upsert({
      where: { code: dd.code },
      update: {},
      create: { name: dd.name, code: dd.code, level: RegionLevel.DISTRICT, parentId: rids[dd.parentIdx] },
    })
    districtIds[dd.code] = d.id
  }

  // Zones under region 12 districts
  const zoneDefs = [
    { code: 'TEH-R12-D1-Z1', name: 'محله امیریه', parentCode: 'TEH-R12-D1' },
    { code: 'TEH-R12-D1-Z2', name: 'محله گمرک', parentCode: 'TEH-R12-D1' },
    { code: 'TEH-R12-D2-Z1', name: 'محله مولوی', parentCode: 'TEH-R12-D2' },
    { code: 'TEH-R12-D3-Z1', name: 'محله محمدیه', parentCode: 'TEH-R12-D3' },
  ]
  for (const zd of zoneDefs) {
    await prisma.region.upsert({
      where: { code: zd.code },
      update: {},
      create: { name: zd.name, code: zd.code, level: RegionLevel.ZONE, parentId: districtIds[zd.parentCode] },
    })
  }
  console.log('✅ Regions seeded (city + 22 regions + 12 districts + 4 zones)')

  // ─── 5. Users ─────────────────────────────────────────────────────────────
  const usersConfig = [
    { id_key: 'admin',   email: 'admin@payesh.ir',         fullName: 'مدیر کل سیستم',         role: 'SUPER_ADMIN',           appTypes: [AppType.ADMIN, AppType.HQ, AppType.SUPPORT] },
    { id_key: 'hq',      email: 'hq@payesh.ir',            fullName: 'مسئول ستاد مرکزی',       role: 'HQ_MANAGER',            appTypes: [AppType.HQ] },
    { id_key: 'cmd',     email: 'commander@payesh.ir',     fullName: 'مسئول قرارگاه منطقه ۱۲', role: 'COMMANDER',             appTypes: [AppType.COMMANDER] },
    { id_key: 'ins',     email: 'inspector@payesh.ir',     fullName: 'بازرس میدانی — احمدی',   role: 'INSPECTOR',             appTypes: [AppType.INSPECTOR] },
    { id_key: 'ins2',    email: 'inspector2@payesh.ir',    fullName: 'بازرس میدانی — رضایی',   role: 'INSPECTOR',             appTypes: [AppType.INSPECTOR] },
    { id_key: 'dist',    email: 'district@payesh.ir',      fullName: 'مسئول ناحیه ۱',          role: 'DISTRICT_MANAGER',      appTypes: [AppType.DISTRICT] },
    { id_key: 'cit',     email: 'citizen@payesh.ir',       fullName: 'علی محمدی',              role: 'CITIZEN',               appTypes: [AppType.CITIZEN] },
    { id_key: 'cit2',    email: 'citizen2@payesh.ir',      fullName: 'فاطمه کریمی',            role: 'CITIZEN',               appTypes: [AppType.CITIZEN] },
    { id_key: 'cit3',    email: 'citizen3@payesh.ir',      fullName: 'حسین رحیمی',             role: 'CITIZEN',               appTypes: [AppType.CITIZEN] },
    { id_key: 'sup',     email: 'support@payesh.ir',       fullName: 'کارشناس پشتیبانی',        role: 'SUPPORT',               appTypes: [AppType.SUPPORT] },
    { id_key: 'accom',   email: 'accommodation@payesh.ir', fullName: 'مسئول اسکان منطقه ۱۲',  role: 'ACCOMMODATION_MANAGER', appTypes: [AppType.ACCOMMODATION] },
  ]

  const U: Record<string, string> = {}
  for (const uc of usersConfig) {
    const u = await prisma.user.upsert({
      where: { email: uc.email },
      update: {},
      create: { email: uc.email, fullName: uc.fullName, passwordHash: hash(DEFAULT_PW), isActive: true },
    })
    U[uc.id_key] = u.id
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: u.id, roleId: roleIds[uc.role] } },
      update: {},
      create: { userId: u.id, roleId: roleIds[uc.role] },
    })
    for (const at of uc.appTypes) {
      await prisma.userAppAccess.upsert({
        where: { userId_appType: { userId: u.id, appType: at } },
        update: {},
        create: { userId: u.id, appType: at, isActive: true },
      })
    }
  }

  // Assign region managers
  await prisma.region.update({ where: { code: 'TEH-R12-D1' }, data: { managerId: U.dist } })
  console.log('✅ Users seeded (11 users across all roles)')

  // ─── 6. Inspection Locations ──────────────────────────────────────────────
  const locData = [
    { id: 'loc-001', name: 'مصلی امام خمینی(ره)', address: 'بزرگراه همت — مصلی', lat: 35.7219, lng: 51.3347, category: 'محوطه وداع', regionId: rids[11] },
    { id: 'loc-002', name: 'پارکینگ ورودی شرقی مصلی', address: 'مصلی — ورودی شرقی', lat: 35.7215, lng: 51.3360, category: 'پارکینگ', regionId: rids[11] },
    { id: 'loc-003', name: 'سرویس بهداشتی بلوک A', address: 'مصلی — بلوک الف', lat: 35.7220, lng: 51.3340, category: 'سرویس بهداشتی', regionId: rids[11] },
    { id: 'loc-004', name: 'ایستگاه آب‌رسانی شماره ۱', address: 'مسیر تشییع — خیابان آزادی', lat: 35.7010, lng: 51.3385, category: 'آب‌رسانی', regionId: rids[11] },
    { id: 'loc-005', name: 'موکب پذیرایی منطقه ۱۲', address: 'میدان محمدیه', lat: 35.6788, lng: 51.4230, category: 'پذیرایی', regionId: rids[11] },
    { id: 'loc-006', name: 'بهشت زهرا(س) — ورودی اصلی', address: 'بزرگراه آرامستان — ورودی اصلی', lat: 35.5970, lng: 51.3800, category: 'محوطه تدفین', regionId: rids[18] },
    { id: 'loc-007', name: 'ایستگاه آب‌رسانی شماره ۲', address: 'خیابان انقلاب — نبش فلسطین', lat: 35.7025, lng: 51.3901, category: 'آب‌رسانی', regionId: rids[5] },
    { id: 'loc-008', name: 'پایگاه اورژانس موکب', address: 'مصلی — پایگاه جنوبی', lat: 35.7200, lng: 51.3355, category: 'پزشکی', regionId: rids[11] },
  ]
  for (const l of locData) {
    await prisma.inspectionLocation.create({ data: l })
  }
  console.log('✅ Inspection locations seeded')

  // ─── 7. Checklist ─────────────────────────────────────────────────────────
  const cl = await prisma.checklist.create({
    data: { id: 'cl-main', name: 'چک‌لیست استاندارد نظارت میدانی', version: 1, isActive: true },
  })
  const itemDefs = [
    { id: 'cli-01', label: 'ظرفیت و امنیت محوطه', category: 'ایمنی',       isMandatory: true,  weight: 2.0, order: 1 },
    { id: 'cli-02', label: 'سرویس بهداشتی کافی',   category: 'بهداشت',     isMandatory: true,  weight: 1.5, order: 2 },
    { id: 'cli-03', label: 'تأمین آب آشامیدنی',    category: 'بهداشت',     isMandatory: true,  weight: 1.5, order: 3 },
    { id: 'cli-04', label: 'پذیرایی مناسب',         category: 'پذیرایی',    isMandatory: false, weight: 1.0, order: 4 },
    { id: 'cli-05', label: 'دسترسی حمل‌ونقل عمومی', category: 'حمل‌ونقل',  isMandatory: false, weight: 1.0, order: 5 },
    { id: 'cli-06', label: 'نیروی پزشکی حاضر',      category: 'پزشکی',      isMandatory: true,  weight: 2.0, order: 6 },
    { id: 'cli-07', label: 'سیستم اطلاع‌رسانی فعال', category: 'ارتباطات', isMandatory: false, weight: 0.5, order: 7 },
    { id: 'cli-08', label: 'روشنایی کافی',           category: 'تجهیزات',   isMandatory: false, weight: 0.5, order: 8 },
    { id: 'cli-09', label: 'علائم هدایت جمعیت',     category: 'ایمنی',      isMandatory: true,  weight: 1.5, order: 9 },
    { id: 'cli-10', label: 'گروه مدیریت بحران',      category: 'ایمنی',      isMandatory: true,  weight: 2.0, order: 10 },
  ]
  for (const item of itemDefs) {
    await prisma.checklistItem.create({ data: { ...item, checklistId: cl.id } })
  }
  console.log('✅ Checklist seeded (10 items)')

  // ─── 8. Inspection Submissions + Reviews + Checklist Responses ────────────
  // Helper to create checklist responses (all pass → high score)
  const allPass = itemDefs.map(i => ({ checklistItemId: i.id, passed: true }))
  const mostPass = itemDefs.map((i, idx) => ({ checklistItemId: i.id, passed: idx !== 1 && idx !== 5 })) // fail 2 mandatory
  const halfPass = itemDefs.map((i, idx) => ({ checklistItemId: i.id, passed: idx < 5 }))
  const lowPass  = itemDefs.map((i, idx) => ({ checklistItemId: i.id, passed: idx < 3 }))

  type SubDef = {
    id: string; locId: string; status: InspectionStatus; score?: number;
    review?: { action: ReviewAction; notes: string; score?: number }
    responses?: { checklistItemId: string; passed: boolean }[]
    assignment?: { assignedToKey: string }
    createdDaysAgo: number
  }

  const submissions: SubDef[] = [
    // APPROVED (5)
    { id: 'sub-001', locId: 'loc-001', status: 'APPROVED', score: 92,
      responses: allPass, review: { action: 'APPROVE', notes: 'وضعیت محوطه بسیار مطلوب است. تمام بندها مورد تأیید.', score: 92 }, createdDaysAgo: 7 },
    { id: 'sub-002', locId: 'loc-002', status: 'APPROVED', score: 87,
      responses: allPass, review: { action: 'APPROVE', notes: 'پارکینگ با ظرفیت کافی و سازماندهی مناسب.', score: 87 }, createdDaysAgo: 6 },
    { id: 'sub-003', locId: 'loc-004', status: 'APPROVED', score: 85,
      responses: allPass, review: { action: 'APPROVE', notes: 'آب‌رسانی در سطح ایستگاه ۱ کاملاً مهیا است.', score: 85 }, createdDaysAgo: 5 },
    { id: 'sub-004', locId: 'loc-007', status: 'APPROVED', score: 90,
      responses: allPass, review: { action: 'APPROVE', notes: 'ایستگاه آب‌رسانی شماره ۲ وضعیت ممتاز دارد.', score: 90 }, createdDaysAgo: 4 },
    { id: 'sub-005', locId: 'loc-008', status: 'APPROVED', score: 95,
      responses: allPass, review: { action: 'APPROVE', notes: 'پایگاه اورژانس کاملاً آماده و مجهز.', score: 95 }, createdDaysAgo: 3 },
    // CONDITIONAL (2)
    { id: 'sub-006', locId: 'loc-003', status: 'CONDITIONAL', score: 65,
      responses: mostPass, review: { action: 'CONDITIONAL', notes: 'سرویس بهداشتی و نیروی پزشکی ناکافی — باید تا ۲۴ ساعت رفع شود.', score: 65 }, createdDaysAgo: 5 },
    { id: 'sub-007', locId: 'loc-005', status: 'CONDITIONAL', score: 68,
      responses: mostPass, review: { action: 'CONDITIONAL', notes: 'پذیرایی نامناسب — نیاز به تأمین آب و غذا بیشتر.', score: 68 }, createdDaysAgo: 3 },
    // REJECTED (2)
    { id: 'sub-008', locId: 'loc-006', status: 'REJECTED', score: 32,
      responses: lowPass, review: { action: 'REJECT', notes: 'شرایط ایمنی و بهداشتی کاملاً نامناسب. محوطه جهت برگزاری مناسب نیست.', score: 32 }, createdDaysAgo: 8 },
    { id: 'sub-009', locId: 'loc-003', status: 'REJECTED', score: 40,
      responses: halfPass, review: { action: 'REJECT', notes: 'نیروی پزشکی حاضر نبوده و علائم هدایت نصب نشده.', score: 40 }, createdDaysAgo: 6 },
    // REVISIT (1)
    { id: 'sub-010', locId: 'loc-005', status: 'REVISIT', score: 55,
      responses: halfPass, review: { action: 'REVISIT', notes: 'مشکلات جزئی در پذیرایی — بازرسی مجدد در ۴۸ ساعت.', score: 55 }, createdDaysAgo: 4 },
    // INSPECTOR_ASSIGNED (2)
    { id: 'sub-011', locId: 'loc-001', status: 'INSPECTOR_ASSIGNED',
      assignment: { assignedToKey: 'ins' }, createdDaysAgo: 2 },
    { id: 'sub-012', locId: 'loc-002', status: 'INSPECTOR_ASSIGNED',
      assignment: { assignedToKey: 'ins2' }, createdDaysAgo: 1 },
    // COMMANDER_REVIEW (1)
    { id: 'sub-013', locId: 'loc-004', status: 'COMMANDER_REVIEW', createdDaysAgo: 1 },
    // PENDING (2)
    { id: 'sub-014', locId: 'loc-007', status: 'PENDING', createdDaysAgo: 0 },
    { id: 'sub-015', locId: 'loc-008', status: 'PENDING', createdDaysAgo: 0 },
  ]

  for (const s of submissions) {
    const createdAt = daysAgo(s.createdDaysAgo)
    await prisma.inspectionSubmission.create({
      data: { id: s.id, locationId: s.locId, submittedById: U.dist, status: s.status, score: s.score, createdAt, updatedAt: createdAt },
    })

    if (s.responses) {
      for (const r of s.responses) {
        await prisma.checklistResponse.create({
          data: { submissionId: s.id, checklistItemId: r.checklistItemId, passed: r.passed },
        })
      }
    }

    if (s.review) {
      await prisma.inspectionReview.create({
        data: { submissionId: s.id, reviewerId: U.ins, action: s.review.action, notes: s.review.notes, score: s.review.score, createdAt },
      })
    }

    if (s.assignment) {
      await prisma.assignment.create({
        data: {
          inspectionSubmissionId: s.id,
          assignedToId: U[s.assignment.assignedToKey],
          assignedById: U.cmd,
          status: AssignmentStatus.PENDING,
          dueAt: new Date(Date.now() + 2 * 86400_000),
          createdAt,
        },
      })
    }
  }
  console.log('✅ Inspection submissions seeded (15 submissions across all statuses)')

  // ─── 9. Citizen Reports ───────────────────────────────────────────────────
  type ReportDef = { id: string; reporterKey: string; category: string; title: string; description: string; lat?: number; lng?: number; address?: string; status: CitizenReportStatus; priority: CitizenReportPriority; daysAgo: number }

  const reports: ReportDef[] = [
    { id: 'rpt-01', reporterKey: 'cit',  category: 'آلودگی',       title: 'تجمع زباله در خیابان ولیعصر',  description: 'زباله‌های انباشته در کنار پیاده‌رو رفع نشده.',      lat: 35.724, lng: 51.412, address: 'خیابان ولیعصر — بین صادقیه و کریمخان', status: 'PENDING',     priority: 'MEDIUM', daysAgo: 1 },
    { id: 'rpt-02', reporterKey: 'cit2', category: 'زیرساخت',      title: 'گودال خطرناک کنار جوی آب',     description: 'حفاری رها شده بدون علائم ایمنی.',                    lat: 35.710, lng: 51.390, address: 'خیابان انقلاب — جلوی دانشگاه تهران', status: 'ASSIGNED',    priority: 'HIGH',   daysAgo: 2 },
    { id: 'rpt-03', reporterKey: 'cit3', category: 'آلودگی',       title: 'بوی تعفن از کانال فاضلاب',      description: 'کانال فاضلاب مسدود شده و بوی نامطبوع دارد.',        lat: 35.690, lng: 51.430, address: 'میدان محمدیه — خیابان مولوی',         status: 'IN_PROGRESS', priority: 'HIGH',   daysAgo: 3 },
    { id: 'rpt-04', reporterKey: 'cit',  category: 'ایمنی',         title: 'چراغ راهنمایی خاموش',          description: 'چراغ تقاطع از دیروز کار نمی‌کند — خطر تصادف.',    lat: 35.715, lng: 51.405, address: 'تقاطع جمهوری و فردوسی',              status: 'RESOLVED',    priority: 'MEDIUM', daysAgo: 4 },
    { id: 'rpt-05', reporterKey: 'cit2', category: 'خدمات شهری',   title: 'آب محله قطع است',               description: 'آب از ساعت ۶ صبح قطع است. اطلاع‌رسانی نشده.',      lat: 35.700, lng: 51.421, address: 'خیابان امیرآباد — بن‌بست رضوی',        status: 'RESOLVED',    priority: 'CRITICAL',daysAgo: 5 },
    { id: 'rpt-06', reporterKey: 'cit3', category: 'آلودگی',       title: 'دود غلیظ از کارگاه مجاور',      description: 'کارگاه بدون مجوز تولید دود سیاه می‌کند.',           lat: 35.718, lng: 51.400, address: 'خیابان آزادی — نزدیک مصلی',          status: 'PENDING',     priority: 'HIGH',   daysAgo: 0 },
    { id: 'rpt-07', reporterKey: 'cit',  category: 'زیرساخت',      title: 'پوشش کانال باز شده',            description: 'درپوش فلزی کانال آب برداشته شده — خطر سقوط.',     lat: 35.705, lng: 51.418, address: 'خیابان شریعتی — بالاتر از سه‌راه',   status: 'PENDING',     priority: 'HIGH',   daysAgo: 0 },
    { id: 'rpt-08', reporterKey: 'cit2', category: 'خدمات شهری',   title: 'چمن‌های پارک خشک شده',          description: 'فضای سبز پارک ملت آبیاری نمی‌شود.',                lat: 35.730, lng: 51.380, address: 'پارک ملت — ورودی اصلی',               status: 'CLOSED',      priority: 'LOW',    daysAgo: 10 },
    { id: 'rpt-09', reporterKey: 'cit3', category: 'ایمنی',         title: 'کودک در چاه بازی',             description: 'دریچه چاه تلفن باز مانده و بچه‌ها اطراف آن بازی می‌کنند.', lat: 35.698, lng: 51.440, address: 'کوچه شهید حسنی — خیابان مولوی', status: 'IN_PROGRESS', priority: 'CRITICAL',daysAgo: 1 },
    { id: 'rpt-10', reporterKey: 'cit',  category: 'آلودگی',       title: 'رنگ‌پاشی روی دیوار تاریخی',    description: 'دیوار قدیمی مسجد با نوشته تخریب شده.',              lat: 35.678, lng: 51.425, address: 'خیابان ری — جنب مسجد امام',          status: 'ASSIGNED',    priority: 'MEDIUM', daysAgo: 2 },
    { id: 'rpt-11', reporterKey: 'cit2', category: 'زیرساخت',      title: 'خط‌کشی خیابان پاک شده',         description: 'خط‌کشی عابر پیاده کاملاً محو شده.',                lat: 35.720, lng: 51.408, address: 'خیابان قزوین — جلوی مدرسه',          status: 'PENDING',     priority: 'LOW',    daysAgo: 3 },
    { id: 'rpt-12', reporterKey: 'cit3', category: 'ایمنی',         title: 'گاز طبیعی بوی گاز می‌دهد',    description: 'بوی تند گاز در کوچه — نشت احتمالی.',                lat: 35.712, lng: 51.395, address: 'خیابان امام خمینی — کوچه فرهنگ',     status: 'RESOLVED',    priority: 'CRITICAL',daysAgo: 6 },
  ]

  for (const r of reports) {
    const createdAt = daysAgo(r.daysAgo)
    await prisma.citizenReport.create({
      data: {
        id: r.id, reporterId: U[r.reporterKey], category: r.category, title: r.title,
        description: r.description, lat: r.lat, lng: r.lng, address: r.address,
        status: r.status, priority: r.priority,
        assignedToId: ['ASSIGNED', 'IN_PROGRESS'].includes(r.status) ? U.hq : undefined,
        createdAt, updatedAt: createdAt,
      },
    })
  }
  console.log('✅ Citizen reports seeded (12 reports)')

  // ─── 10. Accommodation Places ─────────────────────────────────────────────
  const places = [
    { id: 'place-01', name: 'مدرسه شهید بهشتی',       address: 'خیابان امیرآباد، کوچه ۳',         regionId: rids[5],  capacity: 200, currentOccupancy: 120, contactPhone: '021-88001234' },
    { id: 'place-02', name: 'سالن ورزشی آزادی',        address: 'مجموعه ورزشی آزادی',               regionId: rids[10], capacity: 500, currentOccupancy: 340, contactPhone: '021-66001122' },
    { id: 'place-03', name: 'مسجد امام رضا(ع)',         address: 'میدان شهدا — کوچه حسنی',          regionId: rids[11], capacity: 150, currentOccupancy: 80,  contactPhone: '021-55001500', managerId: U.accom, lat: 35.679, lng: 51.423 },
    { id: 'place-04', name: 'حسینیه اعظم منطقه ۱۱',   address: 'خیابان رستمی — کوچه ۱۵',         regionId: rids[10], capacity: 300, currentOccupancy: 0,   contactPhone: '021-55882200' },
    { id: 'place-05', name: 'مدرسه ابوریحان',           address: 'خیابان پیروزی — نبش ارمغان',      regionId: rids[14], capacity: 180, currentOccupancy: 45,  contactPhone: '021-77113344' },
  ]
  for (const p of places) {
    await prisma.accommodationPlace.create({ data: { ...p, isActive: true } })
  }
  console.log('✅ Accommodation places seeded (5 places)')

  // ─── 11. Accommodation Requests ───────────────────────────────────────────
  type AccomReqDef = { id: string; rkey: string; placeId: string; guests: number; nights: number; status: AccommodationRequestStatus; notes?: string; daysAgo: number }
  const accomRequests: AccomReqDef[] = [
    { id: 'areq-01', rkey: 'cit',  placeId: 'place-01', guests: 4, nights: 2, status: 'APPROVED',  notes: 'خانواده چهار نفره از مشهد', daysAgo: 5 },
    { id: 'areq-02', rkey: 'cit2', placeId: 'place-02', guests: 2, nights: 3, status: 'APPROVED',  notes: 'زوج جوان — نیاز به اتاق جداگانه', daysAgo: 4 },
    { id: 'areq-03', rkey: 'cit3', placeId: 'place-03', guests: 6, nights: 1, status: 'APPROVED',  notes: 'گروه ۶ نفره از قم', daysAgo: 3 },
    { id: 'areq-04', rkey: 'cit',  placeId: 'place-04', guests: 3, nights: 2, status: 'APPROVED',  notes: 'خانواده محمدی', daysAgo: 6 },
    { id: 'areq-05', rkey: 'cit2', placeId: 'place-01', guests: 5, nights: 3, status: 'PENDING',   notes: 'گروه دانشجویی', daysAgo: 0 },
    { id: 'areq-06', rkey: 'cit3', placeId: 'place-05', guests: 2, nights: 2, status: 'PENDING',   notes: 'زوج سالمند', daysAgo: 0 },
    { id: 'areq-07', rkey: 'cit',  placeId: 'place-02', guests: 8, nights: 2, status: 'PENDING',   notes: 'هیئت منطقه ۱۳', daysAgo: 1 },
    { id: 'areq-08', rkey: 'cit2', placeId: 'place-03', guests: 10, nights: 1, status: 'REJECTED', notes: 'ظرفیت تکمیل بود', daysAgo: 7 },
    { id: 'areq-09', rkey: 'cit3', placeId: 'place-04', guests: 4, nights: 4, status: 'COMPLETED', notes: 'اتمام اقامت — رضایت کامل', daysAgo: 10 },
    { id: 'areq-10', rkey: 'cit',  placeId: 'place-05', guests: 3, nights: 2, status: 'CANCELLED', notes: 'لغو توسط متقاضی', daysAgo: 8 },
  ]
  for (const r of accomRequests) {
    await prisma.accommodationRequest.create({
      data: { id: r.id, requesterId: U[r.rkey], placeId: r.placeId, guestsCount: r.guests, nights: r.nights, status: r.status, notes: r.notes, createdAt: daysAgo(r.daysAgo) },
    })
  }
  console.log('✅ Accommodation requests seeded (10 requests)')

  // ─── 12. Lost / Found ─────────────────────────────────────────────────────
  type LFDef = { id: string; rkey: string; name: string; age?: number; gender?: Gender; description: string; lastSeenLocation: string; daysAgo: number; status: LostFoundStatus; contactPhone?: string }
  const lfData: LFDef[] = [
    { id: 'lf-01', rkey: 'cit',  name: 'محمد رضایی',   age: 7,  gender: 'MALE',   description: 'پسر بچه با پیراهن آبی و کفش سفید. موهای کوتاه مشکی.',           lastSeenLocation: 'مصلی — درب شمالی', daysAgo: 1, status: 'MISSING', contactPhone: '09121111111' },
    { id: 'lf-02', rkey: 'cit2', name: 'زهرا احمدی',   age: 65, gender: 'FEMALE', description: 'خانم سالمند با چادر مشکی و کیف آبی. دارای عصا.',                 lastSeenLocation: 'میدان محمدیه',     daysAgo: 2, status: 'MISSING', contactPhone: '09132222222' },
    { id: 'lf-03', rkey: 'cit3', name: 'امیر حسین صادقی', age: 12, gender: 'MALE', description: 'پسر با لباس یکسره خاکستری. نشانه مادرزادی روی گونه راست.', lastSeenLocation: 'بهشت زهرا — بلوک ۲۵', daysAgo: 3, status: 'MISSING', contactPhone: '09143333333' },
    { id: 'lf-04', rkey: 'cit',  name: 'فاطمه نوری',   age: 45, gender: 'FEMALE', description: 'خانم میانسال — پیدا شده نزدیک موکب منطقه ۱۲.',                   lastSeenLocation: 'موکب منطقه ۱۲',   daysAgo: 4, status: 'FOUND',   contactPhone: '09154444444' },
    { id: 'lf-05', rkey: 'cit2', name: 'علی اکبر کریمی', age: 8, gender: 'MALE',  description: 'کودک گمشده — با خانواده‌اش در مصلی پیدا شد.',                    lastSeenLocation: 'مصلی — بلوک الف', daysAgo: 5, status: 'FOUND',   contactPhone: '09165555555' },
    { id: 'lf-06', rkey: 'cit3', name: 'مریم صالحی',   age: 30, gender: 'FEMALE', description: 'خانم جوان با مانتو سبز — هنوز پیدا نشده.',                       lastSeenLocation: 'پارکینگ بهشت زهرا', daysAgo: 0, status: 'MISSING', contactPhone: '09176666666' },
  ]
  for (const lf of lfData) {
    await prisma.lostFoundPerson.create({
      data: { id: lf.id, reportedById: U[lf.rkey], name: lf.name, age: lf.age, gender: lf.gender, description: lf.description, lastSeenLocation: lf.lastSeenLocation, lastSeenAt: daysAgo(lf.daysAgo + 1), status: lf.status, contactPhone: lf.contactPhone, createdAt: daysAgo(lf.daysAgo) },
    })
  }
  console.log('✅ Lost/found persons seeded (6 records — 4 missing, 2 found)')

  // ─── 13. Emergency Reports ────────────────────────────────────────────────
  type EmgDef = { id: string; rkey: string; type: string; description: string; lat?: number; lng?: number; status: EmergencyStatus; priority: EmergencyPriority; assignedKey?: string; hoursAgo: number }
  const emergencies: EmgDef[] = [
    { id: 'emg-01', rkey: 'cit',  type: 'تصادف',        description: 'تصادف دو خودرو در تقاطع — یک مصدوم دارد.',              lat: 35.720, lng: 51.408, status: 'PENDING',    priority: 'CRITICAL', hoursAgo: 1 },
    { id: 'emg-02', rkey: 'cit2', type: 'حریق',         description: 'آتش‌سوزی جزئی در موکب پذیرایی — دود قابل رویت.',       lat: 35.679, lng: 51.423, status: 'DISPATCHED', priority: 'HIGH',     assignedKey: 'hq', hoursAgo: 3 },
    { id: 'emg-03', rkey: 'cit3', type: 'سقوط',         description: 'افتادن سالمند داخل کانال آب.',                          lat: 35.701, lng: 51.391, status: 'ON_SCENE',   priority: 'CRITICAL', assignedKey: 'hq', hoursAgo: 2 },
    { id: 'emg-04', rkey: 'cit',  type: 'ازدحام خطرناک', description: 'ازدحام بیش از ظرفیت در درب ورودی مصلی — خطر له شدن.', lat: 35.722, lng: 51.335, status: 'RESOLVED',   priority: 'HIGH',     hoursAgo: 12 },
    { id: 'emg-05', rkey: 'cit2', type: 'سرقت',         description: 'سرقت از حجاج در پارکینگ.',                              lat: 35.721, lng: 51.336, status: 'PENDING',    priority: 'MEDIUM',   hoursAgo: 0 },
    { id: 'emg-06', rkey: 'cit3', type: 'مفقود شدن',    description: 'کودک ۵ ساله از خانواده جدا شده — منطقه بهشت زهرا.',    lat: 35.597, lng: 51.380, status: 'DISPATCHED', priority: 'HIGH',     assignedKey: 'hq', hoursAgo: 4 },
  ]
  for (const e of emergencies) {
    const createdAt = hoursAgo(e.hoursAgo)
    await prisma.emergencyReport.create({
      data: { id: e.id, reporterId: U[e.rkey], type: e.type, description: e.description, lat: e.lat, lng: e.lng, status: e.status, priority: e.priority, assignedToId: e.assignedKey ? U[e.assignedKey] : undefined, createdAt },
    })
  }
  console.log('✅ Emergency reports seeded (6 reports)')

  // ─── 14. Support Tickets ──────────────────────────────────────────────────
  type TktDef = { id: string; rkey: string; category: string; title: string; description: string; status: SupportTicketStatus; priority: SupportTicketPriority; daysAgo: number; assignedKey?: string }
  const tickets: TktDef[] = [
    { id: 'tkt-01', rkey: 'cit',  category: 'دسترسی', title: 'رمز عبور فراموش شده', description: 'کاربر نمی‌تواند وارد سیستم شود — رمز فراموش کرده.', status: 'RESOLVED',    priority: 'MEDIUM', daysAgo: 5, assignedKey: 'sup' },
    { id: 'tkt-02', rkey: 'ins',  category: 'باگ',    title: 'چک‌لیست ذخیره نمی‌شود', description: 'در بازرسی میدانی، دکمه ذخیره چک‌لیست کار نمی‌کند.', status: 'IN_PROGRESS', priority: 'HIGH',   daysAgo: 2, assignedKey: 'sup' },
    { id: 'tkt-03', rkey: 'dist', category: 'آموزش',  title: 'نحوه ثبت گزارش ناحیه', description: 'آموزش نحوه ثبت رکورد بازرسی را نیاز دارم.', status: 'RESOLVED',    priority: 'LOW',    daysAgo: 7 },
    { id: 'tkt-04', rkey: 'cit2', category: 'باگ',    title: 'عکس آپلود نمی‌شود', description: 'در هنگام ثبت گزارش، آپلود تصویر با خطا مواجه می‌شود.', status: 'OPEN',        priority: 'MEDIUM', daysAgo: 1 },
    { id: 'tkt-05', rkey: 'hq',   category: 'عملکرد', title: 'داشبورد کند است', description: 'بارگذاری صفحه داشبورد ستادی بیش از ۱۰ ثانیه طول می‌کشد.', status: 'IN_PROGRESS', priority: 'HIGH',   daysAgo: 3, assignedKey: 'sup' },
    { id: 'tkt-06', rkey: 'cit3', category: 'محتوا',  title: 'خطا در آدرس نقشه', description: 'آدرس نمایش داده شده روی نقشه اشتباه است.', status: 'OPEN',        priority: 'LOW',    daysAgo: 0 },
    { id: 'tkt-07', rkey: 'cmd',  category: 'دسترسی', title: 'بخش ارجاع به بازرس نمایش نمی‌دهد', description: 'پس از آپدیت، قرارگاه نمی‌تواند بازرس اضافه کند.', status: 'OPEN', priority: 'URGENT', daysAgo: 0, assignedKey: 'sup' },
    { id: 'tkt-08', rkey: 'accom', category: 'ویژگی', title: 'امکان صادر کردن اکسل', description: 'آیا می‌توان لیست درخواست‌های اسکان را اکسل گرفت؟', status: 'CLOSED', priority: 'LOW', daysAgo: 14 },
  ]
  for (const t of tickets) {
    const createdAt = daysAgo(t.daysAgo)
    await prisma.supportTicket.create({
      data: { id: t.id, reportedById: U[t.rkey], category: t.category, title: t.title, description: t.description, status: t.status, priority: t.priority, assignedToId: t.assignedKey ? U[t.assignedKey] : undefined, createdAt, updatedAt: createdAt },
    })
  }
  console.log('✅ Support tickets seeded (8 tickets)')

  // ─── 15. Audit Logs ───────────────────────────────────────────────────────
  const auditEntries = [
    { id: 'aud-01', userId: U.admin,  action: 'LOGIN',    entityType: 'User',                entityId: U.admin,  createdAt: hoursAgo(1) },
    { id: 'aud-02', userId: U.dist,   action: 'CREATE',   entityType: 'InspectionSubmission', entityId: 'sub-015', createdAt: hoursAgo(2) },
    { id: 'aud-03', userId: U.dist,   action: 'CREATE',   entityType: 'InspectionSubmission', entityId: 'sub-014', createdAt: hoursAgo(3) },
    { id: 'aud-04', userId: U.cmd,    action: 'ASSIGN',   entityType: 'InspectionSubmission', entityId: 'sub-012', createdAt: hoursAgo(4) },
    { id: 'aud-05', userId: U.cmd,    action: 'ASSIGN',   entityType: 'InspectionSubmission', entityId: 'sub-011', createdAt: hoursAgo(5) },
    { id: 'aud-06', userId: U.ins,    action: 'APPROVE',  entityType: 'InspectionSubmission', entityId: 'sub-005', createdAt: daysAgo(3) },
    { id: 'aud-07', userId: U.ins,    action: 'CONDITIONAL', entityType: 'InspectionSubmission', entityId: 'sub-007', createdAt: daysAgo(3) },
    { id: 'aud-08', userId: U.ins,    action: 'REJECT',   entityType: 'InspectionSubmission', entityId: 'sub-008', createdAt: daysAgo(4) },
    { id: 'aud-09', userId: U.cit,    action: 'CREATE',   entityType: 'CitizenReport',         entityId: 'rpt-07', createdAt: hoursAgo(6) },
    { id: 'aud-10', userId: U.cit2,   action: 'CREATE',   entityType: 'CitizenReport',         entityId: 'rpt-06', createdAt: hoursAgo(7) },
    { id: 'aud-11', userId: U.hq,     action: 'UPDATE',   entityType: 'CitizenReport',         entityId: 'rpt-02', createdAt: daysAgo(2) },
    { id: 'aud-12', userId: U.hq,     action: 'UPDATE',   entityType: 'CitizenReport',         entityId: 'rpt-04', createdAt: daysAgo(4) },
    { id: 'aud-13', userId: U.cit,    action: 'CREATE',   entityType: 'EmergencyReport',       entityId: 'emg-01', createdAt: hoursAgo(1) },
    { id: 'aud-14', userId: U.cit3,   action: 'CREATE',   entityType: 'LostFoundPerson',       entityId: 'lf-06',  createdAt: hoursAgo(2) },
    { id: 'aud-15', userId: U.cit,    action: 'CREATE',   entityType: 'AccommodationRequest',  entityId: 'areq-05', createdAt: hoursAgo(3) },
    { id: 'aud-16', userId: U.accom,  action: 'APPROVE',  entityType: 'AccommodationRequest',  entityId: 'areq-01', createdAt: daysAgo(5) },
    { id: 'aud-17', userId: U.sup,    action: 'UPDATE',   entityType: 'SupportTicket',         entityId: 'tkt-01', createdAt: daysAgo(5) },
    { id: 'aud-18', userId: U.admin,  action: 'CREATE',   entityType: 'User',                  entityId: U.ins2,   createdAt: daysAgo(14) },
    { id: 'aud-19', userId: U.hq,     action: 'LOGIN',    entityType: 'User',                  entityId: U.hq,     createdAt: hoursAgo(8) },
    { id: 'aud-20', userId: U.ins,    action: 'REVISIT',  entityType: 'InspectionSubmission',  entityId: 'sub-010', createdAt: daysAgo(4) },
  ]
  for (const a of auditEntries) {
    await prisma.auditLog.create({ data: a })
  }
  console.log('✅ Audit logs seeded (20 entries)')

  // ─── 16. Notifications ────────────────────────────────────────────────────
  const notifications = [
    { id: 'ntf-01', userId: U.ins,  type: 'ASSIGNMENT',     title: 'مأموریت جدید',          body: 'بازرسی مصلی امام خمینی به شما محول شد.',     data: { submissionId: 'sub-011' }, createdAt: hoursAgo(5) },
    { id: 'ntf-02', userId: U.ins2, type: 'ASSIGNMENT',     title: 'مأموریت جدید',          body: 'بازرسی پارکینگ شرقی به شما ارجاع داده شد.',  data: { submissionId: 'sub-012' }, createdAt: hoursAgo(4) },
    { id: 'ntf-03', userId: U.hq,   type: 'EMERGENCY',      title: 'اورژانس — تصادف',       body: 'گزارش تصادف در تقاطع جمهوری ثبت شد.',        data: { emergencyId: 'emg-01' },   createdAt: hoursAgo(1) },
    { id: 'ntf-04', userId: U.hq,   type: 'MISSING_PERSON', title: 'گمشده جدید',            body: 'گزارش مفقود شدن کودک در بهشت زهرا ثبت شد.', data: { lostFoundId: 'lf-06' },    createdAt: hoursAgo(2) },
    { id: 'ntf-05', userId: U.cmd,  type: 'SUBMISSION',     title: 'رکورد جدید برای بررسی', body: 'رکورد بازرسی ایستگاه آب ثبت و در انتظار تأیید قرارگاه.', data: { submissionId: 'sub-013' }, createdAt: hoursAgo(3) },
    { id: 'ntf-06', userId: U.cit,  type: 'REPORT_UPDATE',  title: 'به‌روزرسانی گزارش',     body: 'گزارش «گودال خطرناک» به کارشناس ارجاع داده شد.', data: { reportId: 'rpt-02' }, createdAt: daysAgo(2), readAt: daysAgo(2) },
    { id: 'ntf-07', userId: U.sup,  type: 'TICKET',         title: 'تیکت فوری جدید',         body: 'تیکت «بخش ارجاع به بازرس» با اولویت فوری ثبت شد.', data: { ticketId: 'tkt-07' }, createdAt: hoursAgo(0) },
    { id: 'ntf-08', userId: U.accom, type: 'REQUEST',       title: 'درخواست اسکان جدید',    body: 'سه درخواست اسکان در انتظار بررسی دارید.',    data: { count: 3 },               createdAt: hoursAgo(0) },
  ]
  for (const n of notifications) {
    await prisma.notificationEvent.create({ data: n })
  }
  console.log('✅ Notifications seeded')

  // ─── 17. System Settings ──────────────────────────────────────────────────
  const settings = [
    { key: 'app_name',             value: 'سامانه نظارت شهرداری تهران', description: 'نام سامانه' },
    { key: 'event_name',           value: 'آیین تشییع و خداحافظی شهید',  description: 'نام رویداد جاری' },
    { key: 'event_dates',          value: '۱۳ تا ۱۵ تیرماه ۱۴۰۵',       description: 'تاریخ رویداد' },
    { key: 'min_score_threshold',  value: '60',                           description: 'حداقل امتیاز برای تأیید (درصد)' },
    { key: 'max_issues_conditional', value: '2',                          description: 'حداکثر ایراد برای تأیید مشروط' },
    { key: 'inspection_checklist', value: 'cl-main',                      description: 'شناسه چک‌لیست فعال' },
  ]
  for (const s of settings) {
    await prisma.systemSetting.upsert({ where: { key: s.key }, update: {}, create: s })
  }
  console.log('✅ System settings seeded')

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log(`
🎉 Seed completed successfully!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SEEDED DATA SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Users              : 11 (across all roles)
  Regions            : city + 22 regions + 12 districts + 4 zones
  Inspection Locations: 8
  Inspection Submissions: 15 (5 approved, 2 conditional, 2 rejected, 1 revisit, 2 assigned, 1 review, 2 pending)
  Citizen Reports    : 12
  Accommodation Places: 5
  Accommodation Requests: 10 (4 approved, 3 pending, 1 rejected, 1 completed, 1 cancelled)
  Lost/Found Records : 6 (4 missing, 2 found)
  Emergency Reports  : 6
  Support Tickets    : 8
  Audit Logs         : 20
  Notifications      : 8
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 TEST CREDENTIALS (password: Admin1234 for all)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  admin@payesh.ir         → SUPER_ADMIN       → /admin + /hq + /support
  hq@payesh.ir            → HQ_MANAGER        → /hq
  commander@payesh.ir     → COMMANDER         → /commander
  inspector@payesh.ir     → INSPECTOR         → /inspector
  inspector2@payesh.ir    → INSPECTOR         → /inspector
  district@payesh.ir      → DISTRICT_MANAGER  → /district
  citizen@payesh.ir       → CITIZEN           → /citizen
  citizen2@payesh.ir      → CITIZEN           → /citizen
  citizen3@payesh.ir      → CITIZEN           → /citizen
  support@payesh.ir       → SUPPORT           → /support
  accommodation@payesh.ir → ACCOMMODATION_MGR → /accommodation (مسجد امام رضا)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`)
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
