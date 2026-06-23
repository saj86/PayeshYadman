import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

const PLACE_INCLUDE = { region: true, _count: { select: { requests: true } } } as const

@Injectable()
export class AccommodationService {
  constructor(private prisma: PrismaService) {}

  getPlaces(regionId?: string) {
    return this.prisma.accommodationPlace.findMany({
      where: { isActive: true, ...(regionId ? { regionId } : {}) },
      include: PLACE_INCLUDE,
    })
  }

  getMyPlace(managerId: string) {
    return this.prisma.accommodationPlace.findFirst({
      where: { managerId },
      include: { ...PLACE_INCLUDE, manager: { select: { fullName: true, email: true } } },
    })
  }

  async createPlace(data: any) {
    return this.prisma.accommodationPlace.create({ data, include: PLACE_INCLUDE })
  }

  async updatePlace(id: string, data: any) {
    return this.prisma.accommodationPlace.update({ where: { id }, data, include: PLACE_INCLUDE })
  }

  async getRequests(callerId: string, callerRoles: string[]) {
    const isAdmin = callerRoles.some(r => ['SUPER_ADMIN', 'HQ_MANAGER', 'SUPPORT'].includes(r))
    const isManager = callerRoles.includes('ACCOMMODATION_MANAGER') && !callerRoles.includes('SUPER_ADMIN')

    if (isManager) {
      const place = await this.prisma.accommodationPlace.findFirst({ where: { managerId: callerId } })
      if (!place) return []
      return this.prisma.accommodationRequest.findMany({
        where: { placeId: place.id },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        include: { place: true, requester: { select: { fullName: true, phone: true } } },
      })
    }

    return this.prisma.accommodationRequest.findMany({
      where: isAdmin ? {} : { requesterId: callerId },
      orderBy: { createdAt: 'desc' },
      include: { place: true, requester: { select: { fullName: true } } },
    })
  }

  async createRequest(data: any, requesterId: string) {
    return this.prisma.accommodationRequest.create({ data: { ...data, requesterId } })
  }

  async updateRequest(id: string, status: string, callerId: string, callerRoles: string[]) {
    const req = await this.prisma.accommodationRequest.findUnique({ where: { id }, include: { place: true } })
    if (!req) throw new NotFoundException('درخواست یافت نشد')

    const isAdmin = callerRoles.some(r => ['SUPER_ADMIN', 'HQ_MANAGER', 'SUPPORT'].includes(r))
    const isManager = callerRoles.includes('ACCOMMODATION_MANAGER') && req.place.managerId === callerId
    if (!isAdmin && !isManager) throw new ForbiddenException('دسترسی غیر مجاز')

    return this.prisma.accommodationRequest.update({ where: { id }, data: { status: status as any } })
  }

  async assignManager(placeId: string, userId: string) {
    const place = await this.prisma.accommodationPlace.update({
      where: { id: placeId },
      data: { managerId: userId },
      include: PLACE_INCLUDE,
    })

    // Ensure user has ACCOMMODATION_MANAGER role
    const role = await this.prisma.role.findFirst({ where: { name: 'ACCOMMODATION_MANAGER' } })
    if (role) {
      await this.prisma.userRole.upsert({
        where: { userId_roleId: { userId, roleId: role.id } },
        create: { userId, roleId: role.id },
        update: {},
      })
    }

    // Ensure user has ACCOMMODATION app access
    await this.prisma.userAppAccess.upsert({
      where: { userId_appType: { userId, appType: 'ACCOMMODATION' } },
      create: { userId, appType: 'ACCOMMODATION', isActive: true },
      update: { isActive: true },
    })

    return place
  }
}
