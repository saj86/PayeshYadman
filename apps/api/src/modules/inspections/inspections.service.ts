import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { InspectionStatus, ReviewAction } from '@prisma/client'

@Injectable()
export class InspectionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, limit = 20, status?: InspectionStatus, regionId?: string, search?: string) {
    const skip = (page - 1) * limit
    const where: any = {}
    if (status) where.status = status
    if (regionId) where.location = { regionId }
    if (search) where.location = { ...where.location, name: { contains: search, mode: 'insensitive' } }

    const [data, total] = await Promise.all([
      this.prisma.inspectionSubmission.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          location: { include: { region: true } },
          submittedBy: { select: { fullName: true, email: true } },
          reviews: { orderBy: { createdAt: 'desc' }, take: 1 },
          assignments: { include: { assignedTo: { select: { fullName: true } } }, take: 1 },
          _count: { select: { checklistResponses: true } },
        },
      }),
      this.prisma.inspectionSubmission.count({ where }),
    ])

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  async findOne(id: string) {
    const submission = await this.prisma.inspectionSubmission.findUnique({
      where: { id },
      include: {
        location: { include: { region: true } },
        submittedBy: { select: { fullName: true, email: true } },
        reviews: {
          orderBy: { createdAt: 'desc' },
          include: { reviewer: { select: { fullName: true } } },
        },
        checklistResponses: { include: { checklistItem: true } },
        assignments: { include: { assignedTo: { select: { fullName: true } } } },
      },
    })
    if (!submission) throw new NotFoundException('رکورد یافت نشد')
    return submission
  }

  async create(locationId: string, notes: string, submittedById: string) {
    return this.prisma.inspectionSubmission.create({
      data: {
        locationId,
        notes,
        submittedById,
        status: InspectionStatus.PENDING,
      },
      include: { location: true },
    })
  }

  async updateStatus(id: string, status: InspectionStatus, userId: string) {
    await this.findOne(id)
    return this.prisma.inspectionSubmission.update({
      where: { id },
      data: { status },
    })
  }

  async review(submissionId: string, reviewerId: string, action: ReviewAction, notes?: string, score?: number, checklistResponses?: any[]) {
    const submission = await this.findOne(submissionId)

    const statusMap: Record<ReviewAction, InspectionStatus> = {
      APPROVE: InspectionStatus.APPROVED,
      REJECT: InspectionStatus.REJECTED,
      REVISIT: InspectionStatus.REVISIT,
      CONDITIONAL: InspectionStatus.CONDITIONAL,
    }

    const review = await this.prisma.inspectionReview.create({
      data: { submissionId, reviewerId, action, notes, score },
    })

    await this.prisma.inspectionSubmission.update({
      where: { id: submissionId },
      data: { status: statusMap[action], score },
    })

    if (checklistResponses?.length) {
      await this.prisma.checklistResponse.createMany({
        data: checklistResponses.map(r => ({
          submissionId,
          checklistItemId: r.checklistItemId,
          passed: r.passed,
          notes: r.notes,
        })),
        skipDuplicates: true,
      })
    }

    return review
  }

  async getQueue(inspectorId: string) {
    return this.prisma.inspectionSubmission.findMany({
      where: {
        status: { in: [InspectionStatus.INSPECTOR_ASSIGNED, InspectionStatus.REVISIT] },
        assignments: { some: { assignedToId: inspectorId, status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] } } },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        location: { include: { region: true } },
        submittedBy: { select: { fullName: true } },
        assignments: { where: { assignedToId: inspectorId }, take: 1 },
      },
    })
  }

  async getStats() {
    const statuses: InspectionStatus[] = ['PENDING', 'COMMANDER_REVIEW', 'INSPECTOR_ASSIGNED', 'APPROVED', 'CONDITIONAL', 'REJECTED', 'REVISIT']
    const counts = await Promise.all(
      statuses.map(status => this.prisma.inspectionSubmission.count({ where: { status } }))
    )
    return statuses.reduce((acc, status, i) => ({ ...acc, [status]: counts[i] }), {} as Record<string, number>)
  }
}
