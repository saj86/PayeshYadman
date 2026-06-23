import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { InspectionsService } from './inspections.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { InspectionStatus, ReviewAction } from '@prisma/client'

@ApiTags('inspections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inspections')
export class InspectionsController {
  constructor(private service: InspectionsService) {}

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: InspectionStatus,
    @Query('regionId') regionId?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      status,
      regionId,
      search,
    )
  }

  @Get('stats')
  getStats() {
    return this.service.getStats()
  }

  @Get('queue')
  getQueue(@Request() req: any) {
    return this.service.getQueue(req.user.sub)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id)
  }

  @Post()
  create(@Body() body: { locationId: string; notes?: string }, @Request() req: any) {
    return this.service.create(body.locationId, body.notes || '', req.user.sub)
  }

  @Put(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: InspectionStatus }, @Request() req: any) {
    return this.service.updateStatus(id, body.status, req.user.sub)
  }

  @Post(':id/review')
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
    return this.service.review(id, req.user.sub, body.action, body.notes, body.score, body.checklistResponses)
  }
}
