import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

const ADMIN_ROLES = ['SUPER_ADMIN', 'HQ_MANAGER', 'SUPPORT', 'COMMANDER']
const REVIEWER_ROLES = ['SUPER_ADMIN', 'HQ_MANAGER', 'SUPPORT', 'COMMANDER', 'INSPECTOR']

// Status transitions allowed per role
const STATUS_TRANSITIONS: Record<string, string[]> = {
  SUPER_ADMIN:  ['UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'NEEDS_INFO', 'RESOLVED', 'REJECTED', 'CLOSED'],
  HQ_MANAGER:   ['UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'NEEDS_INFO', 'RESOLVED', 'REJECTED', 'CLOSED'],
  SUPPORT:      ['UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'NEEDS_INFO', 'RESOLVED', 'REJECTED', 'CLOSED'],
  COMMANDER:    ['UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'NEEDS_INFO', 'RESOLVED', 'REJECTED'],
  INSPECTOR:    ['IN_PROGRESS', 'NEEDS_INFO', 'RESOLVED'],
}

const REPORT_INCLUDE = {
  reporter: { select: { fullName: true, email: true } },
  assignedTo: { select: { fullName: true } },
} as const

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private isAdmin(roles: string[]) {
    return roles.some(r => ADMIN_ROLES.includes(r))
  }

  async findAll(callerId: string, roles: string[], page = 1, limit = 20, status?: string, source?: string) {
    const skip = (page - 1) * limit
    const isAdmin = this.isAdmin(roles)
    const isInspector = roles.includes('INSPECTOR') && !isAdmin

    const where: any = {}

    if (isInspector) {
      // Inspectors see reports assigned to them
      where.assignedToId = callerId
    } else if (!isAdmin) {
      // Citizens, operators see only their own
      where.reporterId = callerId
    }

    if (status) where.status = status
    if (source) where.source = source

    const [data, total] = await Promise.all([
      this.prisma.citizenReport.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: REPORT_INCLUDE,
      }),
      this.prisma.citizenReport.count({ where }),
    ])

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  async findOne(id: string, callerId: string, roles: string[]) {
    const report = await this.prisma.citizenReport.findUnique({
      where: { id },
      include: REPORT_INCLUDE,
    })
    if (!report) throw new NotFoundException('گزارش یافت نشد')

    this.checkReadAccess(report, callerId, roles)
    return report
  }

  private checkReadAccess(report: any, callerId: string, roles: string[]) {
    if (this.isAdmin(roles)) return
    if (roles.includes('INSPECTOR') && report.assignedToId === callerId) return
    if (report.reporterId === callerId) return
    throw new ForbiddenException('دسترسی به این گزارش مجاز نیست')
  }

  async create(data: any, reporterId: string) {
    return this.prisma.citizenReport.create({
      data: { ...data, reporterId },
      include: REPORT_INCLUDE,
    })
  }

  async updateStatus(id: string, status: string, callerId: string, roles: string[], assignedToId?: string) {
    const report = await this.prisma.citizenReport.findUnique({ where: { id } })
    if (!report) throw new NotFoundException('گزارش یافت نشد')

    // Check caller can access this report
    this.checkReadAccess(report, callerId, roles)

    // Check role is allowed to set this status
    const allowedStatuses = roles.flatMap(r => STATUS_TRANSITIONS[r] || [])
    if (!allowedStatuses.includes(status)) {
      throw new ForbiddenException(`نقش شما اجازه تغییر وضعیت به «${status}» را ندارد`)
    }

    const updateData: any = { status: status as any }
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId

    await this.prisma.auditLog.create({
      data: { userId: callerId, action: 'STATUS_CHANGE', entityType: 'CitizenReport', entityId: id,
        oldValue: { status: report.status }, newValue: { status } },
    }).catch(() => null)

    return this.prisma.citizenReport.update({
      where: { id }, data: updateData, include: REPORT_INCLUDE,
    })
  }
}
