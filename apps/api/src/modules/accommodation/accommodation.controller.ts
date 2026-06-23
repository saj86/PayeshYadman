import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { AccommodationService } from './accommodation.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'

@ApiTags('accommodation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('accommodation')
export class AccommodationController {
  constructor(private service: AccommodationService) {}

  // ─── Places ───────────────────────────────────────────────────────────────

  @Get('places')
  getPlaces(@Query('regionId') regionId?: string) {
    return this.service.getPlaces(regionId)
  }

  @Get('my-place')
  @Roles('ACCOMMODATION_MANAGER', 'SUPER_ADMIN')
  getMyPlace(@Request() req: any) {
    return this.service.getMyPlace(req.user.sub)
  }

  @Post('places')
  @Roles('SUPER_ADMIN', 'HQ_MANAGER', 'SUPPORT')
  createPlace(@Body() body: any) {
    return this.service.createPlace(body)
  }

  @Put('places/:id')
  @Roles('SUPER_ADMIN', 'HQ_MANAGER', 'SUPPORT', 'ACCOMMODATION_MANAGER')
  updatePlace(@Param('id') id: string, @Body() body: any) {
    return this.service.updatePlace(id, body)
  }

  @Put('places/:id/manager')
  @Roles('SUPER_ADMIN', 'HQ_MANAGER', 'SUPPORT')
  assignManager(@Param('id') id: string, @Body() body: { userId: string }) {
    return this.service.assignManager(id, body.userId)
  }

  // ─── Requests ─────────────────────────────────────────────────────────────

  @Get('requests')
  getRequests(@Request() req: any) {
    return this.service.getRequests(req.user.sub, req.user.roles)
  }

  @Post('requests')
  createRequest(@Body() body: any, @Request() req: any) {
    return this.service.createRequest(body, req.user.sub)
  }

  @Put('requests/:id/status')
  updateRequest(@Param('id') id: string, @Body() body: { status: string }, @Request() req: any) {
    return this.service.updateRequest(id, body.status, req.user.sub, req.user.roles)
  }

  // ─── Applications ─────────────────────────────────────────────────────────

  @Post('applications')
  createApplication(@Body() body: any, @Request() req: any) {
    return this.service.createApplication(body, req.user.sub)
  }

  @Get('applications')
  getApplications(@Request() req: any, @Query('status') status?: string) {
    return this.service.getApplications(req.user.sub, req.user.roles, status)
  }

  @Get('applications/:id')
  getApplication(@Param('id') id: string, @Request() req: any) {
    return this.service.getApplication(id, req.user.sub, req.user.roles)
  }

  @Put('applications/:id/review')
  @Roles('SUPER_ADMIN', 'HQ_MANAGER', 'SUPPORT', 'COMMANDER')
  reviewApplication(@Param('id') id: string, @Body() body: { status: string; reviewNote?: string }, @Request() req: any) {
    return this.service.reviewApplication(id, body.status, body.reviewNote, req.user.sub, req.user.roles)
  }
}
