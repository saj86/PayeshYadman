import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { EmergencyService } from './emergency.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

@ApiTags('emergency')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('emergency')
export class EmergencyController {
  constructor(private service: EmergencyService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.service.findAll(req.user.sub, req.user.roles)
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
  updateStatus(@Param('id') id: string, @Body() body: { status: string }, @Request() req: any) {
    return this.service.updateStatus(id, body.status, req.user.sub, req.user.roles)
  }
}
