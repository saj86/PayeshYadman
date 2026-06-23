import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { InspectionStatus, ReviewAction, ChecklistStatus } from '@prisma/client'

const HQ_ROLES = ['SUPER_ADMIN', 'HQ_MANAGER', 'COMMANDER', 'DISTRICT_MANAGER']

@Injectable()
export class InspectionsService {
  private readonly logger = new Logger(InspectionsService.name)

  constructor(private prisma: PrismaService) {}

  async findAll(callerId: string, callerRoles: string[], page = 1, limit = 20, status?: InspectionStatus, regionId?: string, search?: string) {
    const skip = (page - 1) * limit
    const where: any = {}
    if (status) where.status = status
    if (regionId) where.location = { regionId }
    if (search) where.location = { ...where.location, name: { contains: search, mode: 'insensitive' } }

    // Inspectors only see submissions assigned to them
    const isHQ = callerRoles.some(r => HQ_ROLES.includes(r))
    if (!isHQ && callerRoles.includes('INSPECTOR')) {
      where.assignments = { some: { assignedToId: callerId } }
    }

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

  async findOne(id: string, callerId: string, callerRoles: string[]) {
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

    const isHQ = callerRoles.some(r => HQ_ROLES.includes(r))
    if (!isHQ && callerRoles.includes('INSPECTOR')) {
      const isAssigned = (submission.assignments as any[]).some(a => a.assignedToId === callerId)
      if (!isAssigned) {
        this.logger.warn(`Inspector ${callerId} attempted to access unassigned submission ${id}`)
        throw new ForbiddenException('این رکورد به شما ارجاع داده نشده است')
      }
    }

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

  async updateStatus(id: string, status: InspectionStatus, callerId: string, callerRoles: string[]) {
    await this.findOne(id, callerId, callerRoles)
    return this.prisma.inspectionSubmission.update({
      where: { id },
      data: { status },
    })
  }

  async review(submissionId: string, reviewerId: string, reviewerRoles: string[], action: ReviewAction, notes?: string, score?: number, checklistResponses?: any[]) {
    await this.findOne(submissionId, reviewerId, reviewerRoles)

    // CONDITIONAL requires a reason note
    if (action === 'CONDITIONAL' && (!notes || notes.trim().length < 5)) {
      throw new BadRequestException('تأیید مشروط نیازمند ذکر شرط یا توضیح است (حداقل ۵ کاراکتر)')
    }

    // Load system settings for score threshold
    const [minScoreSetting, mandatoryItems] = await Promise.all([
      this.prisma.systemSetting.findFirst({ where: { key: 'min_score_threshold' } }),
      this.prisma.checklistItem.findMany({ where: { isMandatory: true }, select: { id: true, label: true } }),
    ])

    const minScore = parseInt(minScoreSetting?.value || '60', 10)

    // For APPROVE or CONDITIONAL: validate minimum score
    if ((action === 'APPROVE' || action === 'CONDITIONAL') && score !== undefined && score < minScore) {
      throw new BadRequestException(`امتیاز ${score}٪ کمتر از حداقل مجاز (${minScore}٪) است. تأیید ممکن نیست.`)
    }

    // Validate all mandatory items are in the response list (responded to — pass or fail)
    if (checklistResponses?.length && mandatoryItems.length > 0) {
      const respondedIds = new Set(checklistResponses.map(r => r.checklistItemId))
      const missing = mandatoryItems.filter(i => !respondedIds.has(i.id))
      if (missing.length > 0) {
        throw new BadRequestException(`موارد اجباری پاسخ داده نشده: ${missing.map(i => i.label).join('، ')}`)
      }
    }

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
          notes: r.notes ?? null,
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

  private readonly CHECKLIST_INCLUDE = {
    location: { include: { region: true } },
    submittedBy: { select: { id: true, fullName: true } },
    assignments: { include: { assignedTo: { select: { fullName: true } } }, take: 1 },
    checklistResponses: {
      include: { checklistItem: true },
      orderBy: { checklistItem: { order: 'asc' } } as any,
    },
    checklistHistory: {
      orderBy: { createdAt: 'desc' as const },
      include: { changedBy: { select: { fullName: true } } },
    },
    reviews: {
      orderBy: { createdAt: 'desc' as const },
      include: { reviewer: { select: { fullName: true } } },
    },
  }

  async getChecklistDetail(submissionId: string, callerId: string, callerRoles: string[]) {
    const submission = await this.prisma.inspectionSubmission.findUnique({
      where: { id: submissionId },
      include: this.CHECKLIST_INCLUDE,
    })
    if (!submission) throw new NotFoundException('رکورد یافت نشد')

    const isHQ = callerRoles.some(r => HQ_ROLES.includes(r))
    const isInspector = callerRoles.includes('INSPECTOR')

    if (isInspector && !isHQ) {
      const isAssigned = (submission.assignments as any[]).some(a => a.assignedToId === callerId)
      if (!isAssigned) throw new ForbiddenException('دسترسی به چک‌لیست مجاز نیست')
    }

    return submission
  }

  async submitChecklist(submissionId: string, callerId: string, callerRoles: string[], checklistResponses: any[], notes?: string) {
    const submission = await this.prisma.inspectionSubmission.findUnique({
      where: { id: submissionId },
      include: { assignments: true },
    })
    if (!submission) throw new NotFoundException('رکورد یافت نشد')

    const isAssigned = submission.assignments.some((a: any) => a.assignedToId === callerId)
    if (!isAssigned && !callerRoles.some(r => HQ_ROLES.includes(r))) {
      throw new ForbiddenException('تنها بازرس تعیین شده می‌تواند چک‌لیست ثبت کند')
    }

    const editableStatuses: ChecklistStatus[] = ['DRAFT', 'RETURNED_FOR_CORRECTION']
    if (!editableStatuses.includes(submission.checklistStatus)) {
      throw new BadRequestException(`چک‌لیست در وضعیت «${submission.checklistStatus}» قابل ویرایش نیست`)
    }

    const fromStatus = submission.checklistStatus
    const toStatus: ChecklistStatus = submission.checklistStatus === 'RETURNED_FOR_CORRECTION'
      ? 'CORRECTED'
      : 'SUBMITTED'

    await this.prisma.$transaction([
      this.prisma.checklistResponse.deleteMany({ where: { submissionId } }),
      this.prisma.checklistResponse.createMany({
        data: checklistResponses.map(r => ({
          submissionId, checklistItemId: r.checklistItemId, passed: r.passed, notes: r.notes ?? null,
        })),
      }),
      this.prisma.inspectionSubmission.update({
        where: { id: submissionId },
        data: { checklistStatus: toStatus, notes: notes ?? submission.notes },
      }),
      this.prisma.checklistHistory.create({
        data: { submissionId, fromStatus, toStatus, changedById: callerId },
      }),
    ])

    return this.getChecklistDetail(submissionId, callerId, callerRoles)
  }

  async updateChecklistStatus(
    submissionId: string,
    callerId: string,
    callerRoles: string[],
    toStatus: ChecklistStatus,
    reason?: string,
    conditionNotes?: string,
  ) {
    const isHQ = callerRoles.some(r => HQ_ROLES.includes(r))
    if (!isHQ) throw new ForbiddenException('تنها ناظران می‌توانند وضعیت چک‌لیست را تغییر دهند')

    const submission = await this.prisma.inspectionSubmission.findUnique({ where: { id: submissionId } })
    if (!submission) throw new NotFoundException('رکورد یافت نشد')

    if (toStatus === 'RETURNED_FOR_CORRECTION' && (!reason || reason.trim().length < 5)) {
      throw new BadRequestException('بازگشت برای اصلاح نیازمند دلیل (حداقل ۵ کاراکتر) است')
    }
    if (toStatus === 'APPROVED_WITH_CONDITIONS' && (!conditionNotes || conditionNotes.trim().length < 5)) {
      throw new BadRequestException('تأیید مشروط نیازمند شرح شرایط است')
    }

    const fromStatus = submission.checklistStatus
    await this.prisma.$transaction([
      this.prisma.inspectionSubmission.update({
        where: { id: submissionId },
        data: { checklistStatus: toStatus, checklistConditionNotes: conditionNotes ?? null },
      }),
      this.prisma.checklistHistory.create({
        data: { submissionId, fromStatus, toStatus, changedById: callerId, reason, conditionNotes },
      }),
    ])

    return this.getChecklistDetail(submissionId, callerId, callerRoles)
  }

  async getChecklistHistory(submissionId: string, callerId: string, callerRoles: string[]) {
    await this.findOne(submissionId, callerId, callerRoles)
    return this.prisma.checklistHistory.findMany({
      where: { submissionId },
      orderBy: { createdAt: 'desc' },
      include: { changedBy: { select: { fullName: true, email: true } } },
    })
  }

  async setPriority(id: string, priority: string, callerId: string, callerRoles: string[]) {
    const isHQ = callerRoles.some(r => HQ_ROLES.includes(r))
    if (!isHQ) throw new ForbiddenException('تنها مدیران می‌توانند اولویت را تغییر دهند')
    await this.findOne(id, callerId, callerRoles)
    return this.prisma.inspectionSubmission.update({
      where: { id },
      data: { priority: priority as any },
      include: {
        location: { include: { region: true } },
        submittedBy: { select: { fullName: true } },
      },
    })
  }
}
