import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { InspectionLocationsService } from './inspection-locations.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'

@ApiTags('inspection-locations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inspection-locations')
export class InspectionLocationsController {
  constructor(private service: InspectionLocationsService) {}

  @Get()
  findAll(@Query('regionId') regionId?: string) {
    return this.service.findAll(regionId)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id)
  }

  @Post()
  @Roles('SUPER_ADMIN', 'HQ_MANAGER')
  create(@Body() body: { name: string; address: string; regionId: string; category: string; lat?: number; lng?: number }) {
    return this.service.create(body)
  }

  @Put(':id')
  @Roles('SUPER_ADMIN', 'HQ_MANAGER')
  update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(id, body)
  }
}
