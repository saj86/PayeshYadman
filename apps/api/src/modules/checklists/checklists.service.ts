import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class ChecklistsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.checklist.findMany({ where: { isActive: true }, include: { _count: { select: { items: true } } } })
  }

  async findOne(id: string) {
    return this.prisma.checklist.findUnique({ where: { id }, include: { items: { orderBy: { order: 'asc' } } } })
  }

  async create(data: any) {
    return this.prisma.checklist.create({ data })
  }

  async createItem(checklistId: string, data: any) {
    const count = await this.prisma.checklistItem.count({ where: { checklistId } })
    return this.prisma.checklistItem.create({ data: { ...data, checklistId, order: count + 1 } })
  }
}
