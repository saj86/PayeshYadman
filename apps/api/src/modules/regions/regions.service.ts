import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class RegionsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.region.findMany({ orderBy: [{ level: 'asc' }, { name: 'asc' }], include: { _count: { select: { children: true } } } })
  }

  async findTree() {
    const roots = await this.prisma.region.findMany({ where: { parentId: null }, include: { children: { include: { children: true } } } })
    return roots
  }

  async findOne(id: string) {
    return this.prisma.region.findUnique({ where: { id }, include: { parent: true, children: true } })
  }

  async create(data: any) {
    return this.prisma.region.create({ data })
  }

  async update(id: string, data: any) {
    return this.prisma.region.update({ where: { id }, data })
  }
}
