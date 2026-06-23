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
