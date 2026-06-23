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

  @Get() findAll(@Query('status') status?: LostFoundStatus) { return this.service.findAll(status) }
  @Post() create(@Body() body: any, @Request() req: any) { return this.service.create(body, req.user.sub) }
  @Put(':id/status') updateStatus(@Param('id') id: string, @Body() body: { status: LostFoundStatus }) {
    return this.service.updateStatus(id, body.status)
  }
}
