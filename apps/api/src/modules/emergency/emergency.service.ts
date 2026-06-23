import { Injectable, ForbiddenException, NotFoundException, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

const ADMIN_ROLES = ['SUPER_ADMIN', 'HQ_MANAGER', 'COMMANDER', 'SUPPORT', 'DISTRICT_MANAGER']

@Injectable()
export class EmergencyService {
  private readonly logger = new Logger(EmergencyService.name)

  constructor(private prisma: PrismaService) {}

  async findAll(callerId: string, callerRoles: string[]) {
    const isAdmin = callerRoles.some(r => ADMIN_ROLES.includes(r))
    const where = isAdmin ? {} : { reporterId: callerId }

    return this.prisma.emergencyReport.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: { reporter: { select: { fullName: true } } },
    })
  }

  async findOne(id: string, callerId: string, callerRoles: string[]) {
    const record = await this.prisma.emergencyReport.findUnique({
      where: { id },
      include: { reporter: { select: { fullName: true } } },
    })
    if (!record) throw new NotFoundException('رکورد یافت نشد')

    const isAdmin = callerRoles.some(r => ADMIN_ROLES.includes(r))
    if (!isAdmin && record.reporterId !== callerId) {
      this.logger.warn(`User ${callerId} attempted to access emergency report ${id} owned by ${record.reporterId}`)
      throw new ForbiddenException('دسترسی غیر مجاز')
    }

    return record
  }

  async create(data: any, reporterId: string) {
    return this.prisma.emergencyReport.create({
      data: { ...data, reporterId, status: 'PENDING', priority: data.priority || 'HIGH' },
    })
  }

  async updateStatus(id: string, status: string, callerId: string, callerRoles: string[]) {
    const isAdmin = callerRoles.some(r => ADMIN_ROLES.includes(r))
    if (!isAdmin) {
      this.logger.warn(`User ${callerId} attempted to update emergency status without admin role`)
      throw new ForbiddenException('تنها مدیران می‌توانند وضعیت را تغییر دهند')
    }
    return this.prisma.emergencyReport.update({ where: { id }, data: { status: status as any } })
  }
}
