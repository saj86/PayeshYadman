import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class AssignmentsService {
  constructor(private prisma: PrismaService) {}

  async create(inspectionSubmissionId: string, assignedToId: string, assignedById: string, dueAt?: Date) {
    const assignment = await this.prisma.assignment.create({
      data: { inspectionSubmissionId, assignedToId, assignedById, dueAt, status: 'PENDING' },
    })
    await this.prisma.inspectionSubmission.update({
      where: { id: inspectionSubmissionId },
      data: { status: 'INSPECTOR_ASSIGNED' },
    })
    return assignment
  }

  async findMine(userId: string) {
    return this.prisma.assignment.findMany({
      where: { assignedToId: userId, status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] } },
      include: {
        inspectionSubmission: { include: { location: { include: { region: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.assignment.update({ where: { id }, data: { status: status as any } })
  }
}
