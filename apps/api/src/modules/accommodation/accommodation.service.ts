import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import * as bcrypt from 'bcryptjs'

const ADMIN_ROLES   = ['SUPER_ADMIN', 'HQ_MANAGER', 'SUPPORT']
const REVIEWER_ROLES = ['SUPER_ADMIN', 'HQ_MANAGER', 'SUPPORT', 'COMMANDER']
const CREATE_ROLES  = ['SUPER_ADMIN', 'HQ_MANAGER', 'SUPPORT', 'COMMANDER', 'DISTRICT_MANAGER']

const PLACE_INCLUDE = {
  region: true,
  manager:           { select: { id: true, fullName: true, email: true } },
  assignedInspector: { select: { id: true, fullName: true, email: true } },
  createdBy:         { select: { id: true, fullName: true } },
  approvedBy:        { select: { id: true, fullName: true } },
  _count: { select: { requests: true } },
} as const

@Injectable()
export class AccommodationService {
  private readonly logger = new Logger(AccommodationService.name)

  constructor(private prisma: PrismaService) {}

  private isAdmin(roles: string[]) { return roles.some(r => ADMIN_ROLES.includes(r)) }
  private isReviewer(roles: string[]) { return roles.some(r => REVIEWER_ROLES.includes(r)) }
  private isCreator(roles: string[]) { return roles.some(r => CREATE_ROLES.includes(r)) }

  private async auditLog(action: string, entityId: string, userId: string, oldValue?: any, newValue?: any) {
    await this.prisma.auditLog.create({
      data: { action, entityType: 'AccommodationPlace', entityId, userId, oldValue, newValue },
    })
  }

  // ─── Places ───────────────────────────────────────────────────────────────

  async getPlaces(params: {
    regionId?: string; status?: string; search?: string;
    inspectorId?: string; page?: number; limit?: number;
    sortBy?: string; sortOrder?: 'asc' | 'desc';
  }) {
    const { regionId, status, search, inspectorId, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = params
    const skip = (page - 1) * limit
    const where: any = {
      deletedAt: null,
      ...(regionId ? { regionId } : {}),
      ...(status ? { status: status as any } : {}),
      ...(inspectorId ? { assignedInspectorId: inspectorId } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    }
    const allowedSort = ['createdAt', 'name', 'capacity', 'currentOccupancy', 'status']
    const orderField = allowedSort.includes(sortBy) ? sortBy : 'createdAt'

    const [data, total] = await Promise.all([
      this.prisma.accommodationPlace.findMany({ where, skip, take: limit, include: PLACE_INCLUDE, orderBy: { [orderField]: sortOrder } }),
      this.prisma.accommodationPlace.count({ where }),
    ])
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  async getPlace(id: string) {
    const place = await this.prisma.accommodationPlace.findFirst({
      where: { id, deletedAt: null },
      include: PLACE_INCLUDE,
    })
    if (!place) throw new NotFoundException('مکان یافت نشد')
    return place
  }

  getMyPlace(managerId: string) {
    return this.prisma.accommodationPlace.findFirst({
      where: { managerId, deletedAt: null },
      include: PLACE_INCLUDE,
    })
  }

  getInspectorPlaces(inspectorId: string) {
    return this.prisma.accommodationPlace.findMany({
      where: { assignedInspectorId: inspectorId, deletedAt: null },
      include: PLACE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    })
  }

  async createPlace(data: any, callerId: string, callerRoles: string[]) {
    if (!this.isCreator(callerRoles)) throw new ForbiddenException('دسترسی کافی برای ایجاد مکان ندارید')

    const place = await this.prisma.accommodationPlace.create({
      data: { ...data, createdById: callerId, status: 'PENDING' },
      include: PLACE_INCLUDE,
    })
    await this.auditLog('CREATE_PLACE', place.id, callerId, null, { name: place.name, status: 'PENDING' })
    return place
  }

  async updatePlace(id: string, data: any, callerId: string, callerRoles: string[]) {
    const place = await this.prisma.accommodationPlace.findFirst({ where: { id, deletedAt: null } })
    if (!place) throw new NotFoundException('مکان یافت نشد')

    const isManager = callerRoles.includes('ACCOMMODATION_MANAGER') && place.managerId === callerId
    const canEdit = this.isAdmin(callerRoles) || isManager

    if (!canEdit) throw new ForbiddenException('دسترسی برای ویرایش مکان ندارید')

    // After approval, only operational fields are freely editable by manager
    if (place.status === 'APPROVED' && isManager && !this.isAdmin(callerRoles)) {
      const allowed = ['currentOccupancy', 'contactPhone', 'emergencyPhone', 'description']
      const attempted = Object.keys(data).filter(k => !allowed.includes(k))
      if (attempted.length > 0) throw new ForbiddenException('پس از تأیید، ویرایش فیلدهای اصلی مجاز نیست')
    }

    const updated = await this.prisma.accommodationPlace.update({
      where: { id },
      data,
      include: PLACE_INCLUDE,
    })
    await this.auditLog('UPDATE_PLACE', id, callerId, place, data)
    return updated
  }

  async approvePlace(id: string, callerId: string, callerRoles: string[]) {
    if (!this.isReviewer(callerRoles)) throw new ForbiddenException('تنها ناظران می‌توانند مکان را تأیید کنند')
    const place = await this.prisma.accommodationPlace.findFirst({ where: { id, deletedAt: null } })
    if (!place) throw new NotFoundException('مکان یافت نشد')
    if (place.status === 'APPROVED') throw new BadRequestException('مکان قبلاً تأیید شده است')

    const updated = await this.prisma.accommodationPlace.update({
      where: { id },
      data: { status: 'APPROVED', approvedById: callerId, approvedAt: new Date(), rejectionReason: null, isActive: true },
      include: PLACE_INCLUDE,
    })
    await this.auditLog('APPROVE_PLACE', id, callerId, { status: place.status }, { status: 'APPROVED' })
    return updated
  }

  async rejectPlace(id: string, reason: string, callerId: string, callerRoles: string[]) {
    if (!this.isReviewer(callerRoles)) throw new ForbiddenException('تنها ناظران می‌توانند مکان را رد کنند')
    const place = await this.prisma.accommodationPlace.findFirst({ where: { id, deletedAt: null } })
    if (!place) throw new NotFoundException('مکان یافت نشد')
    if (place.status === 'APPROVED') throw new BadRequestException('مکان تأیید شده را نمی‌توان رد کرد')

    const updated = await this.prisma.accommodationPlace.update({
      where: { id },
      data: { status: 'REJECTED', rejectionReason: reason || 'دلیل مشخص نشد', isActive: false },
      include: PLACE_INCLUDE,
    })
    await this.auditLog('REJECT_PLACE', id, callerId, { status: place.status }, { status: 'REJECTED', reason })
    return updated
  }

  async assignInspector(id: string, inspectorId: string | null, callerId: string, callerRoles: string[]) {
    if (!this.isReviewer(callerRoles)) throw new ForbiddenException('تنها ناظران می‌توانند بازرس تعیین کنند')
    const place = await this.prisma.accommodationPlace.findFirst({ where: { id, deletedAt: null } })
    if (!place) throw new NotFoundException('مکان یافت نشد')

    const updated = await this.prisma.accommodationPlace.update({
      where: { id },
      data: { assignedInspectorId: inspectorId },
      include: PLACE_INCLUDE,
    })
    await this.auditLog('ASSIGN_INSPECTOR', id, callerId,
      { assignedInspectorId: place.assignedInspectorId },
      { assignedInspectorId: inspectorId })
    return updated
  }

  async assignManager(placeId: string, userId: string) {
    const place = await this.prisma.accommodationPlace.update({
      where: { id: placeId }, data: { managerId: userId }, include: PLACE_INCLUDE,
    })
    const role = await this.prisma.role.findFirst({ where: { name: 'ACCOMMODATION_MANAGER' } })
    if (role) {
      await this.prisma.userRole.upsert({
        where: { userId_roleId: { userId, roleId: role.id } },
        create: { userId, roleId: role.id }, update: {},
      })
    }
    await this.prisma.userAppAccess.upsert({
      where: { userId_appType: { userId, appType: 'ACCOMMODATION' } },
      create: { userId, appType: 'ACCOMMODATION', isActive: true },
      update: { isActive: true },
    })
    return place
  }

  async deletePlace(id: string, callerId: string, callerRoles: string[]) {
    if (!this.isAdmin(callerRoles)) throw new ForbiddenException('تنها مدیران می‌توانند مکان را حذف کنند')
    const place = await this.prisma.accommodationPlace.findFirst({ where: { id, deletedAt: null } })
    if (!place) throw new NotFoundException('مکان یافت نشد')
    if (place.status === 'APPROVED') throw new ForbiddenException('مکان تأیید شده قابل حذف نیست')

    await this.prisma.accommodationPlace.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } })
    await this.auditLog('DELETE_PLACE', id, callerId, { name: place.name }, null)
    return { message: 'مکان با موفقیت حذف شد' }
  }

  // ─── Requests ─────────────────────────────────────────────────────────────

  async getRequests(callerId: string, callerRoles: string[]) {
    const isAdmin = this.isAdmin(callerRoles)
    const isManager = callerRoles.includes('ACCOMMODATION_MANAGER') && !callerRoles.includes('SUPER_ADMIN')

    if (isManager) {
      const place = await this.prisma.accommodationPlace.findFirst({ where: { managerId: callerId, deletedAt: null } })
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
    const isAdmin = this.isAdmin(callerRoles)
    const isManager = callerRoles.includes('ACCOMMODATION_MANAGER') && req.place.managerId === callerId
    if (!isAdmin && !isManager) throw new ForbiddenException('دسترسی غیر مجاز')
    return this.prisma.accommodationRequest.update({ where: { id }, data: { status: status as any } })
  }

  // ─── Applications ─────────────────────────────────────────────────────────

  async createApplication(data: any, submittedById: string) {
    return this.prisma.accommodationApplication.create({
      data: { ...data, submittedById },
      include: { submittedBy: { select: { fullName: true } }, region: true },
    })
  }

  async getApplications(callerId: string, roles: string[], status?: string) {
    const isReviewer = this.isReviewer(roles)
    const where: any = { ...(isReviewer ? {} : { submittedById: callerId }), ...(status ? { status } : {}) }
    return this.prisma.accommodationApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        submittedBy: { select: { fullName: true, email: true } },
        reviewedBy: { select: { fullName: true } },
        region: true,
      },
    })
  }

  async getApplication(id: string, callerId: string, roles: string[]) {
    const app = await this.prisma.accommodationApplication.findUnique({
      where: { id },
      include: { submittedBy: { select: { fullName: true, email: true } }, reviewedBy: { select: { fullName: true } }, region: true },
    })
    if (!app) throw new NotFoundException('درخواست یافت نشد')
    if (!this.isReviewer(roles) && app.submittedById !== callerId) throw new ForbiddenException('دسترسی مجاز نیست')
    return app
  }

  async reviewApplication(id: string, status: string, reviewNote: string | undefined, callerId: string, roles: string[]) {
    if (!this.isReviewer(roles)) throw new ForbiddenException('تنها ناظران می‌توانند درخواست را بررسی کنند')
    const app = await this.prisma.accommodationApplication.findUnique({ where: { id } })
    if (!app) throw new NotFoundException('درخواست یافت نشد')

    const updatedApp = await this.prisma.accommodationApplication.update({
      where: { id },
      data: { status: status as any, reviewNote, reviewedById: callerId, reviewedAt: new Date() },
    })
    if (status === 'APPROVED') await this.approveAndCreatePlace(app, callerId)
    return updatedApp
  }

  private async approveAndCreatePlace(app: any, reviewerId: string) {
    let managerUser = await this.prisma.user.findUnique({ where: { email: app.contactEmail } })
    if (!managerUser) {
      const tempPassword = Math.random().toString(36).slice(-10) + 'A1!'
      const passwordHash = await bcrypt.hash(tempPassword, 12)
      managerUser = await this.prisma.user.create({
        data: { email: app.contactEmail, fullName: app.contactName, phone: app.contactPhone, passwordHash, isActive: true },
      })
      this.logger.log(`Auto-created manager account for: ${app.contactEmail}`)
    }

    const place = await this.prisma.accommodationPlace.create({
      data: {
        name: app.name, address: app.address, regionId: app.regionId,
        capacity: app.capacity, contactPhone: app.contactPhone,
        managerId: managerUser.id, isActive: true,
        status: 'APPROVED', createdById: app.submittedById,
        approvedById: reviewerId, approvedAt: new Date(),
      },
    })

    await this.prisma.accommodationApplication.update({
      where: { id: app.id }, data: { createdPlaceId: place.id },
    })
    await this.assignManager(place.id, managerUser.id)
    this.logger.log(`Place created from application ${app.id}: ${place.id}`)
    return place
  }
}
