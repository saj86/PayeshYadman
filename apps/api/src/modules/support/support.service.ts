import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit
    const where: any = status ? { status } : {}
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

  async updateStatus(id: string, status: string, assignedToId?: string) {
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
