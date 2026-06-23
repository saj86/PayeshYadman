import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(userId: string | null, action: string, entityType: string, entityId?: string, oldValue?: any, newValue?: any, ipAddress?: string) {
    return this.prisma.auditLog.create({
      data: { userId, action, entityType, entityId, oldValue, newValue, ipAddress },
    }).catch(() => null)
  }

  async findAll(page = 1, limit = 50, entityType?: string) {
    const skip = (page - 1) * limit
    const where: any = entityType ? { entityType } : {}
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { user: { select: { fullName: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ])
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
  }
}
