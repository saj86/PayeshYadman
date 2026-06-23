import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class AccommodationService {
  constructor(private prisma: PrismaService) {}

  async getPlaces(regionId?: string) {
    return this.prisma.accommodationPlace.findMany({
      where: { isActive: true, ...(regionId ? { regionId } : {}) },
      include: { region: true, _count: { select: { requests: true } } },
    })
  }

  async createPlace(data: any) {
    return this.prisma.accommodationPlace.create({ data })
  }

  async updatePlace(id: string, data: any) {
    return this.prisma.accommodationPlace.update({ where: { id }, data })
  }

  async getRequests(userId?: string) {
    return this.prisma.accommodationRequest.findMany({
      where: userId ? { requesterId: userId } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        place: true,
        requester: { select: { fullName: true } },
      },
    })
  }

  async createRequest(data: any, requesterId: string) {
    return this.prisma.accommodationRequest.create({ data: { ...data, requesterId } })
  }

  async updateRequest(id: string, status: string) {
    return this.prisma.accommodationRequest.update({ where: { id }, data: { status: status as any } })
  }
}
