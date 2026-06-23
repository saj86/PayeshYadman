import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { ReportsService } from './reports.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private service: ReportsService) {}

  @Get()
  findAll(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('source') source?: string,
  ) {
    return this.service.findAll(
      req.user.sub, req.user.roles,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      status, source,
    )
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.service.findOne(id, req.user.sub, req.user.roles)
  }

  @Post()
  create(@Body() body: any, @Request() req: any) {
    return this.service.create(body, req.user.sub)
  }

  @Put(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: string; assignedToId?: string }, @Request() req: any) {
    return this.service.updateStatus(id, body.status, req.user.sub, req.user.roles, body.assignedToId)
  }
}
