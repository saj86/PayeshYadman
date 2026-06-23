import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.systemSetting.findMany({ orderBy: { key: 'asc' } })
  }

  findByKey(key: string) {
    return this.prisma.systemSetting.findUnique({ where: { key } })
  }

  upsert(key: string, value: string, description?: string, updatedById?: string) {
    return this.prisma.systemSetting.upsert({
      where: { key },
      update: { value, updatedById },
      create: { key, value, description, updatedById },
    })
  }
}
