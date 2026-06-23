import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { InspectionsService } from './inspections.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { InspectionStatus, ReviewAction } from '@prisma/client'

@ApiTags('inspections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inspections')
export class InspectionsController {
  constructor(private service: InspectionsService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'HQ_MANAGER', 'COMMANDER', 'INSPECTOR', 'DISTRICT_MANAGER')
  findAll(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: InspectionStatus,
    @Query('regionId') regionId?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll(
      req.user.sub,
      req.user.roles,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      status,
      regionId,
      search,
    )
  }

  @Get('stats')
  @Roles('SUPER_ADMIN', 'HQ_MANAGER', 'COMMANDER')
  getStats() {
    return this.service.getStats()
  }

  @Get('queue')
  @Roles('SUPER_ADMIN', 'HQ_MANAGER', 'COMMANDER', 'INSPECTOR')
  getQueue(@Request() req: any) {
    return this.service.getQueue(req.user.sub)
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'HQ_MANAGER', 'COMMANDER', 'INSPECTOR', 'DISTRICT_MANAGER')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.service.findOne(id, req.user.sub, req.user.roles)
  }

  @Post()
  @Roles('SUPER_ADMIN', 'HQ_MANAGER', 'DISTRICT_MANAGER')
  create(@Body() body: { locationId: string; notes?: string }, @Request() req: any) {
    return this.service.create(body.locationId, body.notes || '', req.user.sub)
  }

  @Put(':id/status')
  @Roles('SUPER_ADMIN', 'HQ_MANAGER', 'COMMANDER')
  updateStatus(@Param('id') id: string, @Body() body: { status: InspectionStatus }, @Request() req: any) {
    return this.service.updateStatus(id, body.status, req.user.sub, req.user.roles)
  }

  @Post(':id/review')
  @Roles('SUPER_ADMIN', 'HQ_MANAGER', 'COMMANDER', 'INSPECTOR')
  review(
    @Param('id') id: string,
    @Body() body: {
      action: ReviewAction
      notes?: string
      score?: number
      checklistResponses?: any[]
    },
    @Request() req: any,
  ) {
    return this.service.review(id, req.user.sub, req.user.roles, body.action, body.notes, body.score, body.checklistResponses)
  }
}
