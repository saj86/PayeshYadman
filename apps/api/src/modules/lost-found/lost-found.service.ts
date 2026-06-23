import { Injectable, ForbiddenException, NotFoundException, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { LostFoundStatus } from '@prisma/client'

const ADMIN_ROLES = ['SUPER_ADMIN', 'HQ_MANAGER', 'COMMANDER', 'SUPPORT', 'DISTRICT_MANAGER']

@Injectable()
export class LostFoundService {
  private readonly logger = new Logger(LostFoundService.name)

  constructor(private prisma: PrismaService) {}

  async findAll(callerId: string, callerRoles: string[], status?: LostFoundStatus) {
    const isAdmin = callerRoles.some(r => ADMIN_ROLES.includes(r))
    const where: any = {}
    if (status) where.status = status
    if (!isAdmin) where.reportedById = callerId

    return this.prisma.lostFoundPerson.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { reportedBy: { select: { fullName: true } } },
    })
  }

  async findOne(id: string, callerId: string, callerRoles: string[]) {
    const record = await this.prisma.lostFoundPerson.findUnique({
      where: { id },
      include: { reportedBy: { select: { fullName: true } } },
    })
    if (!record) throw new NotFoundException('رکورد یافت نشد')

    const isAdmin = callerRoles.some(r => ADMIN_ROLES.includes(r))
    if (!isAdmin && record.reportedById !== callerId) {
      this.logger.warn(`User ${callerId} attempted to access lost-found record ${id} owned by ${record.reportedById}`)
      throw new ForbiddenException('دسترسی غیر مجاز')
    }

    return record
  }

  async create(data: any, reportedById: string) {
    return this.prisma.lostFoundPerson.create({ data: { ...data, reportedById } })
  }

  async updateStatus(id: string, status: LostFoundStatus, callerId: string, callerRoles: string[]) {
    const isAdmin = callerRoles.some(r => ADMIN_ROLES.includes(r))
    if (!isAdmin) {
      this.logger.warn(`User ${callerId} attempted to update lost-found status without admin role`)
      throw new ForbiddenException('تنها مدیران می‌توانند وضعیت را تغییر دهند')
    }
    return this.prisma.lostFoundPerson.update({ where: { id }, data: { status } })
  }
}
