import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class EmergencyService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.emergencyReport.findMany({
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: { reporter: { select: { fullName: true } } },
    })
  }

  async create(data: any, reporterId: string) {
    return this.prisma.emergencyReport.create({ data: { ...data, reporterId, status: 'PENDING', priority: data.priority || 'HIGH' } })
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.emergencyReport.update({ where: { id }, data: { status: status as any } })
  }
}
