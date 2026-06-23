import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { SupportService } from './support.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

@ApiTags('support')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('support')
export class SupportController {
  constructor(private service: SupportService) {}

  @Get('tickets') findAll(@Query('page') p?: string, @Query('limit') l?: string, @Query('status') s?: string) {
    return this.service.findAll(p ? parseInt(p) : 1, l ? parseInt(l) : 20, s)
  }
  @Post('tickets') create(@Body() body: any, @Request() req: any) { return this.service.create(body, req.user.sub) }
  @Put('tickets/:id/status') updateStatus(@Param('id') id: string, @Body() body: any) {
    return this.service.updateStatus(id, body.status, body.assignedToId)
  }
  @Get('health') getSystemHealth() { return this.service.getSystemHealth() }
}
