import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { LostFoundService } from './lost-found.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { LostFoundStatus } from '@prisma/client'

@ApiTags('lost-found')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('lost-found')
export class LostFoundController {
  constructor(private service: LostFoundService) {}

  @Get()
  findAll(@Request() req: any, @Query('status') status?: LostFoundStatus) {
    return this.service.findAll(req.user.sub, req.user.roles, status)
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
  updateStatus(@Param('id') id: string, @Body() body: { status: LostFoundStatus }, @Request() req: any) {
    return this.service.updateStatus(id, body.status, req.user.sub, req.user.roles)
  }
}
