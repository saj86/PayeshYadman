import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { LostFoundStatus } from '@prisma/client'

@Injectable()
export class LostFoundService {
  constructor(private prisma: PrismaService) {}

  async findAll(status?: LostFoundStatus) {
    return this.prisma.lostFoundPerson.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      include: { reportedBy: { select: { fullName: true } } },
    })
  }

  async create(data: any, reportedById: string) {
    return this.prisma.lostFoundPerson.create({ data: { ...data, reportedById } })
  }

  async updateStatus(id: string, status: LostFoundStatus) {
    return this.prisma.lostFoundPerson.update({ where: { id }, data: { status } })
  }
}
