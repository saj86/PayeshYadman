import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class InspectionLocationsService {
  constructor(private prisma: PrismaService) {}

  findAll(regionId?: string) {
    return this.prisma.inspectionLocation.findMany({
      where: regionId ? { regionId } : {},
      include: { region: { select: { name: true, code: true } } },
      orderBy: { name: 'asc' },
    })
  }

  async findOne(id: string) {
    const loc = await this.prisma.inspectionLocation.findUnique({
      where: { id },
      include: { region: true },
    })
    if (!loc) throw new NotFoundException('محل بازرسی یافت نشد')
    return loc
  }

  create(data: { name: string; address: string; regionId: string; category: string; lat?: number; lng?: number }) {
    return this.prisma.inspectionLocation.create({ data, include: { region: true } })
  }

  async update(id: string, data: Partial<{ name: string; address: string; category: string; lat: number; lng: number }>) {
    await this.findOne(id)
    return this.prisma.inspectionLocation.update({ where: { id }, data })
  }
}
