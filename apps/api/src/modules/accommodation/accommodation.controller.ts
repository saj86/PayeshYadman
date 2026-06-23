import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common'
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
  getPlaces(
    @Query('regionId') regionId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('inspectorId') inspectorId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    return this.service.getPlaces({
      regionId, status, search, inspectorId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      sortBy, sortOrder: sortOrder as 'asc' | 'desc' | undefined,
    })
  }

  @Get('places/my-inspector')
  getInspectorPlaces(@Request() req: any) {
    return this.service.getInspectorPlaces(req.user.sub)
  }

  @Get('places/:id')
  getPlace(@Param('id') id: string) {
    return this.service.getPlace(id)
  }

  @Get('my-place')
  @Roles('ACCOMMODATION_MANAGER', 'SUPER_ADMIN')
  getMyPlace(@Request() req: any) {
    return this.service.getMyPlace(req.user.sub)
  }

  @Post('places')
  @Roles('SUPER_ADMIN', 'HQ_MANAGER', 'SUPPORT', 'COMMANDER', 'DISTRICT_MANAGER')
  createPlace(@Body() body: any, @Request() req: any) {
    return this.service.createPlace(body, req.user.sub, req.user.roles)
  }

  @Put('places/:id')
  @Roles('SUPER_ADMIN', 'HQ_MANAGER', 'SUPPORT', 'ACCOMMODATION_MANAGER')
  updatePlace(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.service.updatePlace(id, body, req.user.sub, req.user.roles)
  }

  @Put('places/:id/status')
  @Roles('SUPER_ADMIN', 'HQ_MANAGER', 'SUPPORT', 'COMMANDER')
  updatePlaceStatus(
    @Param('id') id: string,
    @Body() body: { status: 'APPROVED' | 'REJECTED'; rejectionReason?: string },
    @Request() req: any,
  ) {
    if (body.status === 'APPROVED') return this.service.approvePlace(id, req.user.sub, req.user.roles)
    return this.service.rejectPlace(id, body.rejectionReason || '', req.user.sub, req.user.roles)
  }

  @Put('places/:id/assign-inspector')
  @Roles('SUPER_ADMIN', 'HQ_MANAGER', 'SUPPORT', 'COMMANDER')
  assignInspector(
    @Param('id') id: string,
    @Body() body: { inspectorId: string | null },
    @Request() req: any,
  ) {
    return this.service.assignInspector(id, body.inspectorId, req.user.sub, req.user.roles)
  }

  @Put('places/:id/manager')
  @Roles('SUPER_ADMIN', 'HQ_MANAGER', 'SUPPORT')
  assignManager(@Param('id') id: string, @Body() body: { userId: string }) {
    return this.service.assignManager(id, body.userId)
  }

  @Delete('places/:id')
  @Roles('SUPER_ADMIN', 'HQ_MANAGER', 'SUPPORT')
  deletePlace(@Param('id') id: string, @Request() req: any) {
    return this.service.deletePlace(id, req.user.sub, req.user.roles)
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
  reviewApplication(
    @Param('id') id: string,
    @Body() body: { status: string; reviewNote?: string },
    @Request() req: any,
  ) {
    return this.service.reviewApplication(id, body.status, body.reviewNote, req.user.sub, req.user.roles)
  }
}
