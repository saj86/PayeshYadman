import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { SupportService } from './support.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'

@ApiTags('support')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('support')
export class SupportController {
  constructor(private service: SupportService) {}

  @Get('tickets')
  findAll(@Request() req: any, @Query('page') p?: string, @Query('limit') l?: string, @Query('status') s?: string) {
    return this.service.findAll(req.user.sub, req.user.roles, p ? parseInt(p) : 1, l ? parseInt(l) : 20, s)
  }

  @Post('tickets')
  create(@Body() body: any, @Request() req: any) {
    return this.service.create(body, req.user.sub)
  }

  @Put('tickets/:id/status')
  @Roles('SUPER_ADMIN', 'SUPPORT', 'HQ_MANAGER')
  updateStatus(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.service.updateStatus(id, body.status, req.user.sub, req.user.roles, body.assignedToId)
  }

  @Get('health')
  @Roles('SUPER_ADMIN', 'SUPPORT', 'HQ_MANAGER')
  getSystemHealth() {
    return this.service.getSystemHealth()
  }
}
