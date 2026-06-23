import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, roles: string[], page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit
    const isAdmin = roles.some(r => ['SUPER_ADMIN', 'HQ_MANAGER', 'SUPPORT', 'COMMANDER'].includes(r))
    const where: any = {}
    if (!isAdmin) where.reporterId = userId
    if (status) where.status = status

    const [data, total] = await Promise.all([
      this.prisma.citizenReport.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { reporter: { select: { fullName: true } } },
      }),
      this.prisma.citizenReport.count({ where }),
    ])

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  async create(data: any, reporterId: string) {
    return this.prisma.citizenReport.create({ data: { ...data, reporterId } })
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.citizenReport.update({ where: { id }, data: { status: status as any } })
  }
}
