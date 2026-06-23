import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { AccommodationService } from './accommodation.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

@ApiTags('accommodation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accommodation')
export class AccommodationController {
  constructor(private service: AccommodationService) {}

  @Get('places') getPlaces(@Query('regionId') regionId?: string) { return this.service.getPlaces(regionId) }
  @Post('places') createPlace(@Body() body: any) { return this.service.createPlace(body) }
  @Put('places/:id') updatePlace(@Param('id') id: string, @Body() body: any) { return this.service.updatePlace(id, body) }
  @Get('requests') getRequests(@Request() req: any, @Query('all') all?: string) {
    const isAdmin = req.user.roles?.some((r: string) => ['SUPER_ADMIN', 'HQ_MANAGER', 'ACCOMMODATION_MANAGER', 'SUPPORT'].includes(r))
    return this.service.getRequests(isAdmin && all === 'true' ? undefined : req.user.sub)
  }
  @Post('requests') createRequest(@Body() body: any, @Request() req: any) { return this.service.createRequest(body, req.user.sub) }
  @Put('requests/:id/status') updateRequest(@Param('id') id: string, @Body() body: { status: string }) {
    return this.service.updateRequest(id, body.status)
  }
}
