import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class NotificationsService {
  private clients = new Map<string, any>()

  constructor(private prisma: PrismaService) {}

  addClient(userId: string, res: any) {
    this.clients.set(userId, res)
  }

  removeClient(userId: string) {
    this.clients.delete(userId)
  }

  async send(userId: string, type: string, title: string, body: string, data?: any) {
    await this.prisma.notificationEvent.create({ data: { userId, type, title, body, data } })
    const client = this.clients.get(userId)
    if (client) {
      try {
        client.raw.write(`data: ${JSON.stringify({ type, title, body, data })}\n\n`)
      } catch {}
    }
  }

  async getMyNotifications(userId: string) {
    return this.prisma.notificationEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  }

  async markRead(id: string) {
    return this.prisma.notificationEvent.update({ where: { id }, data: { readAt: new Date() } })
  }
}
