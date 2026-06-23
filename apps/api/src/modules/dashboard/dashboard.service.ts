import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getHQStats() {
    const [
      totalSubmissions, approvedSubmissions, pendingSubmissions,
      revisitSubmissions, conditionalSubmissions, rejectedSubmissions,
      totalCitizenReports, pendingReports, totalEmergencies,
      activeMissing, totalUsers, totalRegions,
    ] = await Promise.all([
      this.prisma.inspectionSubmission.count(),
      this.prisma.inspectionSubmission.count({ where: { status: 'APPROVED' } }),
      this.prisma.inspectionSubmission.count({ where: { status: 'PENDING' } }),
      this.prisma.inspectionSubmission.count({ where: { status: 'REVISIT' } }),
      this.prisma.inspectionSubmission.count({ where: { status: 'CONDITIONAL' } }),
      this.prisma.inspectionSubmission.count({ where: { status: 'REJECTED' } }),
      this.prisma.citizenReport.count(),
      this.prisma.citizenReport.count({ where: { status: 'PENDING' } }),
      this.prisma.emergencyReport.count(),
      this.prisma.lostFoundPerson.count({ where: { status: 'MISSING' } }),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.region.count(),
    ])

    const recentActivity = await this.prisma.auditLog.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { fullName: true } } },
    })

    const regionStats = await this.prisma.region.findMany({
      where: { level: 'REGION' },
      take: 6,
      include: {
        _count: { select: { children: true } },
      },
    })

    return {
      kpis: {
        totalSubmissions,
        approvedSubmissions,
        pendingSubmissions,
        revisitSubmissions,
        conditionalSubmissions,
        rejectedSubmissions,
        totalCitizenReports,
        pendingReports,
        totalEmergencies,
        activeMissing,
        totalUsers,
        totalRegions,
        approvalRate: totalSubmissions > 0
          ? Math.round((approvedSubmissions / totalSubmissions) * 100)
          : 0,
      },
      recentActivity,
      regionStats,
    }
  }

  async getActivity(limit = 30) {
    return this.prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { fullName: true, email: true } } },
    })
  }

  async getCommanderStats() {
    const twoDaysAgo = new Date(Date.now() - 48 * 3600_000)

    const [
      pendingReview,
      inReview,
      inspectorAssigned,
      approved,
      rejected,
      revisit,
      conditional,
      pendingAccommodations,
      approvedAccommodations,
      overdueAssignments,
    ] = await Promise.all([
      this.prisma.inspectionSubmission.count({ where: { status: 'PENDING' } }),
      this.prisma.inspectionSubmission.count({ where: { status: 'COMMANDER_REVIEW' } }),
      this.prisma.inspectionSubmission.count({ where: { status: 'INSPECTOR_ASSIGNED' } }),
      this.prisma.inspectionSubmission.count({ where: { status: 'APPROVED' } }),
      this.prisma.inspectionSubmission.count({ where: { status: 'REJECTED' } }),
      this.prisma.inspectionSubmission.count({ where: { status: 'REVISIT' } }),
      this.prisma.inspectionSubmission.count({ where: { status: 'CONDITIONAL' } }),
      this.prisma.accommodationPlace.count({ where: { status: 'PENDING', deletedAt: null } }),
      this.prisma.accommodationPlace.count({ where: { status: 'APPROVED', deletedAt: null } }),
      this.prisma.assignment.count({ where: { status: 'PENDING', dueAt: { lt: new Date() } } }),
    ])

    // Inspector workload: count active assignments per inspector
    const inspectorWorkload = await this.prisma.assignment.groupBy({
      by: ['assignedToId'],
      where: { status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] } },
      _count: { id: true },
    })

    const inspectorIds = inspectorWorkload.map(w => w.assignedToId)
    const inspectors = await this.prisma.user.findMany({
      where: { id: { in: inspectorIds } },
      select: { id: true, fullName: true },
    })
    const inspectorMap = Object.fromEntries(inspectors.map(i => [i.id, i.fullName]))

    const workload = inspectorWorkload.map(w => ({
      inspectorId: w.assignedToId,
      fullName: inspectorMap[w.assignedToId] || '—',
      activeCount: w._count.id,
    })).sort((a, b) => b.activeCount - a.activeCount)

    // Checklist status summary
    const checklistStatusCounts = await this.prisma.inspectionSubmission.groupBy({
      by: ['checklistStatus'],
      _count: { id: true },
    })
    const checklistKpis = Object.fromEntries(
      checklistStatusCounts.map(c => [c.checklistStatus, c._count.id])
    )

    // Recent checklist activity (last 48h)
    const recentChecklistActivity = await this.prisma.checklistHistory.findMany({
      where: { createdAt: { gte: twoDaysAgo } },
      orderBy: { createdAt: 'desc' },
      take: 15,
      include: {
        changedBy: { select: { fullName: true } },
        submission: { select: { id: true, location: { select: { name: true } } } },
      },
    })

    return {
      kpis: {
        pendingReview, inReview, inspectorAssigned,
        approved, rejected, revisit, conditional,
        pendingAccommodations, approvedAccommodations,
        overdueAssignments,
        total: pendingReview + inReview + inspectorAssigned + approved + rejected + revisit + conditional,
      },
      inspectorWorkload: workload,
      checklistKpis,
      recentChecklistActivity,
    }
  }

  async getRegionStats(regionId: string) {
    const submissions = await this.prisma.inspectionSubmission.findMany({
      where: {
        location: { regionId },
      },
      include: { location: true },
    })

    return {
      regionId,
      totalSubmissions: submissions.length,
      approved: submissions.filter(s => s.status === 'APPROVED').length,
      pending: submissions.filter(s => s.status === 'PENDING').length,
      revisit: submissions.filter(s => s.status === 'REVISIT').length,
    }
  }
}
