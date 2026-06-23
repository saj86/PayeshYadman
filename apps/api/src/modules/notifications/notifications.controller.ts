import { Controller, Get, Put, Param, Res, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { NotificationsService } from './notifications.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get()
  getMyNotifications(@Request() req: any) {
    return this.service.getMyNotifications(req.user.sub)
  }

  @Put(':id/read')
  markRead(@Param('id') id: string) {
    return this.service.markRead(id)
  }

  @Get('stream')
  stream(@Request() req: any, @Res() res: any) {
    res.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    })
    res.raw.write('data: {"type":"connected"}\n\n')

    const userId = req.user.sub
    this.service.addClient(userId, res)

    const heartbeat = setInterval(() => {
      try { res.raw.write(':heartbeat\n\n') } catch { clearInterval(heartbeat) }
    }, 30000)

    req.raw.on('close', () => {
      clearInterval(heartbeat)
      this.service.removeClient(userId)
    })
  }
}
