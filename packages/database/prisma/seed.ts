import { PrismaClient, AppType, RegionLevel } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ─── Permissions ──────────────────────────────────────────────────────────
  const resources = [
    'users', 'roles', 'regions', 'inspections', 'checklists',
    'reports', 'accommodation', 'lost-found', 'emergency',
    'assignments', 'dashboard', 'audit-logs', 'support', 'settings',
  ]
  const actions = ['create', 'read', 'update', 'delete', 'approve', 'reject', 'assign']

  const permissions: Record<string, string> = {}
  for (const resource of resources) {
    for (const action of actions) {
      const name = `${resource}:${action}`
      const perm = await prisma.permission.upsert({
        where: { name },
        update: {},
        create: {
          name,
          displayName: `${action} ${resource}`,
          resource,
          action,
        },
      })
      permissions[name] = perm.id
    }
  }
  console.log('✅ Permissions seeded')

  // ─── Roles ────────────────────────────────────────────────────────────────
  const roleData = [
    {
      name: 'SUPER_ADMIN',
      displayName: 'مدیر کل سیستم',
      description: 'دسترسی کامل به تمام بخش‌های سیستم',
      perms: Object.keys(permissions),
      appTypes: [AppType.ADMIN, AppType.HQ, AppType.SUPPORT],
    },
    {
      name: 'HQ_MANAGER',
      displayName: 'مسئول ستاد',
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
      name: 'COMMANDER',
      displayName: 'مسئول قرارگاه',
      description: 'بررسی رکوردهای ناحیه و ارجاع به بازرس',
      perms: [
        'inspections:read', 'inspections:approve', 'inspections:assign',
        'assignments:create', 'assignments:read', 'regions:read',
        'dashboard:read', 'lost-found:read', 'emergency:read',
      ],
      appTypes: [AppType.DISTRICT],
    },
    {
      name: 'INSPECTOR',
      displayName: 'بازرس میدانی',
      description: 'بازرسی میدانی، تأیید/رد رکوردها، چک‌لیست',
      perms: [
        'inspections:read', 'inspections:approve', 'inspections:reject',
        'assignments:read', 'assignments:update', 'checklists:read',
        'lost-found:read', 'lost-found:create', 'emergency:read',
      ],
      appTypes: [AppType.INSPECTOR],
    },
    {
      name: 'DISTRICT_MANAGER',
      displayName: 'مسئول ناحیه',
      description: 'ثبت داده‌های خدمات ناحیه',
      perms: [
        'inspections:create', 'inspections:read', 'regions:read',
        'checklists:read', 'dashboard:read',
      ],
      appTypes: [AppType.DISTRICT],
    },
    {
      name: 'CITIZEN',
      displayName: 'شهروند',
      description: 'ثبت گزارش، درخواست اسکان، گمشده',
      perms: [
        'reports:create', 'reports:read', 'accommodation:create',
        'accommodation:read', 'lost-found:create', 'lost-found:read',
        'emergency:create',
      ],
      appTypes: [AppType.CITIZEN],
    },
    {
      name: 'ACCOMMODATION_MANAGER',
      displayName: 'مسئول اسکان',
      description: 'مدیریت اماکن اسکان و درخواست‌ها',
      perms: [
        'accommodation:create', 'accommodation:read', 'accommodation:update',
        'lost-found:create', 'lost-found:read', 'lost-found:update', 'regions:read',
      ],
      appTypes: [AppType.DISTRICT],
    },
    {
      name: 'SUPPORT',
      displayName: 'پشتیبانی سیستم',
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
  for (const rd of roleData) {
    const role = await prisma.role.upsert({
      where: { name: rd.name },
      update: { displayName: rd.displayName, description: rd.description },
      create: { name: rd.name, displayName: rd.displayName, description: rd.description },
    })
    roleIds[rd.name] = role.id

    for (const permName of rd.perms) {
      if (permissions[permName]) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permissions[permName] } },
          update: {},
          create: { roleId: role.id, permissionId: permissions[permName] },
        })
      }
    }
  }
  console.log('✅ Roles seeded')

  // ─── Regions ──────────────────────────────────────────────────────────────
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

  const regionIds: string[] = []
  for (let i = 0; i < regionNames.length; i++) {
    const code = `TEH-R${String(i + 1).padStart(2, '0')}`
    const region = await prisma.region.upsert({
      where: { code },
      update: {},
      create: {
        name: regionNames[i],
        code,
        level: RegionLevel.REGION,
        parentId: city.id,
      },
    })
    regionIds.push(region.id)
  }

  // District samples under region 12
  const districtNames = ['ناحیه ۱', 'ناحیه ۲', 'ناحیه ۳', 'ناحیه ۴', 'ناحیه ۵']
  const districtIds: string[] = []
  for (let i = 0; i < districtNames.length; i++) {
    const code = `TEH-R12-D${i + 1}`
    const district = await prisma.region.upsert({
      where: { code },
      update: {},
      create: {
        name: districtNames[i],
        code,
        level: RegionLevel.DISTRICT,
        parentId: regionIds[11], // Region 12
      },
    })
    districtIds.push(district.id)
  }
  console.log('✅ Regions seeded')

  // ─── Users ────────────────────────────────────────────────────────────────
  const hash = (pw: string) => bcrypt.hashSync(pw, 10)
  const DEFAULT_PASSWORD = 'Admin1234'

  const usersData = [
    {
      email: 'admin@payesh.ir',
      fullName: 'مدیر کل سیستم',
      roleName: 'SUPER_ADMIN',
      appTypes: [AppType.ADMIN, AppType.HQ, AppType.SUPPORT],
    },
    {
      email: 'hq@payesh.ir',
      fullName: 'مسئول ستاد مرکزی',
      roleName: 'HQ_MANAGER',
      appTypes: [AppType.HQ],
    },
    {
      email: 'commander@payesh.ir',
      fullName: 'مسئول قرارگاه منطقه ۱۲',
      roleName: 'COMMANDER',
      appTypes: [AppType.DISTRICT],
    },
    {
      email: 'inspector@payesh.ir',
      fullName: 'بازرس میدانی منطقه ۱۲',
      roleName: 'INSPECTOR',
      appTypes: [AppType.INSPECTOR],
    },
    {
      email: 'district@payesh.ir',
      fullName: 'مسئول ناحیه ۱',
      roleName: 'DISTRICT_MANAGER',
      appTypes: [AppType.DISTRICT],
    },
    {
      email: 'citizen@payesh.ir',
      fullName: 'علی محمدی',
      roleName: 'CITIZEN',
      appTypes: [AppType.CITIZEN],
    },
    {
      email: 'support@payesh.ir',
      fullName: 'کارشناس پشتیبانی',
      roleName: 'SUPPORT',
      appTypes: [AppType.SUPPORT],
    },
    {
      email: 'accommodation@payesh.ir',
      fullName: 'مسئول اسکان منطقه ۱۲',
      roleName: 'ACCOMMODATION_MANAGER',
      appTypes: [AppType.DISTRICT],
    },
  ]

  for (const ud of usersData) {
    const user = await prisma.user.upsert({
      where: { email: ud.email },
      update: {},
      create: {
        email: ud.email,
        fullName: ud.fullName,
        passwordHash: hash(DEFAULT_PASSWORD),
        isActive: true,
      },
    })

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: roleIds[ud.roleName] } },
      update: {},
      create: { userId: user.id, roleId: roleIds[ud.roleName] },
    })

    for (const appType of ud.appTypes) {
      await prisma.userAppAccess.upsert({
        where: { userId_appType: { userId: user.id, appType } },
        update: {},
        create: { userId: user.id, appType, isActive: true },
      })
    }
  }
  console.log('✅ Users seeded')

  // ─── Inspection Locations ─────────────────────────────────────────────────
  const locations = [
    { name: 'مصلی امام خمینی(ره)', address: 'بزرگراه شهید همت، مصلی', lat: 35.7219, lng: 51.3347, category: 'محوطه وداع', regionId: regionIds[11] },
    { name: 'پارکینگ ورودی شرقی', address: 'مصلی — ورودی شرقی', lat: 35.7215, lng: 51.3360, category: 'پارکینگ', regionId: regionIds[11] },
    { name: 'سرویس بهداشتی بلوک A', address: 'مصلی — بلوک الف', lat: 35.7220, lng: 51.3340, category: 'سرویس بهداشتی', regionId: regionIds[11] },
    { name: 'ایستگاه آب‌رسانی ۱', address: 'مسیر تشییع — خیابان آزادی', lat: 35.7010, lng: 51.3385, category: 'آب‌رسانی', regionId: regionIds[11] },
    { name: 'موکب پذیرایی منطقه ۱۲', address: 'میدان محمدیه', lat: 35.6788, lng: 51.4230, category: 'پذیرایی', regionId: regionIds[11] },
    { name: 'بهشت زهرا(س) — ورودی', address: 'بهشت زهرا، ورودی اصلی', lat: 35.5970, lng: 51.3800, category: 'محوطه تدفین', regionId: regionIds[18] },
  ]

  for (const loc of locations) {
    await prisma.inspectionLocation.upsert({
      where: { id: `loc-${loc.name}` },
      update: {},
      create: { id: `loc-${loc.name}`, ...loc },
    }).catch(() =>
      prisma.inspectionLocation.create({ data: loc })
    )
  }
  console.log('✅ Inspection locations seeded')

  // ─── Checklists ───────────────────────────────────────────────────────────
  const checklist = await prisma.checklist.upsert({
    where: { id: 'cl-main' },
    update: {},
    create: {
      id: 'cl-main',
      name: 'چک‌لیست استاندارد نظارت میدانی',
      version: 1,
      isActive: true,
    },
  })

  const checklistItems = [
    { label: 'ظرفیت و امنیت محوطه', category: 'ایمنی', isMandatory: true, weight: 2.0, order: 1 },
    { label: 'سرویس بهداشتی کافی', category: 'بهداشت', isMandatory: true, weight: 1.5, order: 2 },
    { label: 'تأمین آب آشامیدنی', category: 'بهداشت', isMandatory: true, weight: 1.5, order: 3 },
    { label: 'پذیرایی مناسب (غذا/نوشیدنی)', category: 'پذیرایی', isMandatory: false, weight: 1.0, order: 4 },
    { label: 'دسترسی حمل‌ونقل عمومی', category: 'حمل‌ونقل', isMandatory: false, weight: 1.0, order: 5 },
    { label: 'نیروی پزشکی حاضر', category: 'پزشکی', isMandatory: true, weight: 2.0, order: 6 },
    { label: 'سیستم اطلاع‌رسانی فعال', category: 'ارتباطات', isMandatory: false, weight: 0.5, order: 7 },
    { label: 'روشنایی کافی', category: 'تجهیزات', isMandatory: false, weight: 0.5, order: 8 },
    { label: 'علائم هدایت جمعیت نصب است', category: 'ایمنی', isMandatory: true, weight: 1.5, order: 9 },
    { label: 'گروه مدیریت بحران مستقر', category: 'ایمنی', isMandatory: true, weight: 2.0, order: 10 },
  ]

  for (const item of checklistItems) {
    await prisma.checklistItem.create({
      data: { ...item, checklistId: checklist.id },
    }).catch(() => {})
  }
  console.log('✅ Checklists seeded')

  // ─── Accommodation Places ─────────────────────────────────────────────────
  const places = [
    { name: 'مدرسه شهید بهشتی', address: 'خیابان امیرآباد، کوچه ۳', regionId: regionIds[5], capacity: 200 },
    { name: 'سالن ورزشی آزادی', address: 'مجموعه ورزشی آزادی', regionId: regionIds[10], capacity: 500 },
    { name: 'مسجد امام رضا(ع)', address: 'میدان شهدا', regionId: regionIds[11], capacity: 150 },
  ]

  for (const p of places) {
    await prisma.accommodationPlace.create({
      data: { ...p, currentOccupancy: 0, isActive: true },
    }).catch(() => {})
  }
  console.log('✅ Accommodation places seeded')

  // ─── System Settings ──────────────────────────────────────────────────────
  const settings = [
    { key: 'min_score_threshold', value: '60', description: 'حداقل امتیاز برای تأیید (درصد)' },
    { key: 'max_issues_conditional', value: '2', description: 'حداکثر ایراد برای تأیید مشروط' },
    { key: 'app_name', value: 'سامانه نظارت شهرداری تهران', description: 'نام سامانه' },
    { key: 'event_name', value: 'آیین بدرقه شهید', description: 'نام رویداد جاری' },
    { key: 'event_dates', value: '۱۳ تا ۱۵ تیرماه ۱۴۰۵', description: 'تاریخ رویداد' },
  ]

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    })
  }
  console.log('✅ System settings seeded')

  console.log('\n🎉 Seed completed successfully!')
  console.log('\n📋 Test credentials (password: Admin1234):')
  for (const u of usersData) {
    console.log(`  ${u.email} → ${u.roleName}`)
  }
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
