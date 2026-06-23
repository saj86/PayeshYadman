import { Injectable, ForbiddenException, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

const SUPPORT_ROLES = ['SUPER_ADMIN', 'SUPPORT', 'HQ_MANAGER']

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name)

  constructor(private prisma: PrismaService) {}

  async findAll(callerId: string, callerRoles: string[], page = 1, limit = 20, status?: string) {
    const isAdmin = callerRoles.some(r => SUPPORT_ROLES.includes(r))
    const skip = (page - 1) * limit
    const where: any = {}
    if (status) where.status = status
    if (!isAdmin) where.reportedById = callerId

    const [data, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where, skip, take: limit,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        include: {
          reportedBy: { select: { fullName: true, email: true } },
          assignedTo: { select: { fullName: true } },
        },
      }),
      this.prisma.supportTicket.count({ where }),
    ])
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  async create(data: any, reportedById: string) {
    return this.prisma.supportTicket.create({ data: { ...data, reportedById } })
  }

  async updateStatus(id: string, status: string, callerId: string, callerRoles: string[], assignedToId?: string) {
    const isAdmin = callerRoles.some(r => SUPPORT_ROLES.includes(r))
    if (!isAdmin) {
      this.logger.warn(`User ${callerId} attempted to update support ticket status without admin role`)
      throw new ForbiddenException('تنها پشتیبانی می‌تواند وضعیت تیکت را تغییر دهد')
    }
    return this.prisma.supportTicket.update({ where: { id }, data: { status: status as any, assignedToId } })
  }

  async getSystemHealth() {
    const [users, submissions, reports, tickets] = await Promise.all([
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.inspectionSubmission.count(),
      this.prisma.citizenReport.count(),
      this.prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    ])
    return { activeUsers: users, totalSubmissions: submissions, totalReports: reports, openTickets: tickets, status: 'healthy' }
  }
}
