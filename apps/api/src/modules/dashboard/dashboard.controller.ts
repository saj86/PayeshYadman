import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { DashboardService } from './dashboard.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('hq')
  @Roles('SUPER_ADMIN', 'HQ_MANAGER', 'COMMANDER', 'DISTRICT_MANAGER', 'SUPPORT')
  getHQStats() {
    return this.dashboardService.getHQStats()
  }

  @Get('activity')
  @Roles('SUPER_ADMIN', 'HQ_MANAGER', 'COMMANDER', 'SUPPORT')
  getActivity(@Query('limit') limit?: string) {
    return this.dashboardService.getActivity(limit ? parseInt(limit) : 30)
  }

  @Get('region/:id')
  @Roles('SUPER_ADMIN', 'HQ_MANAGER', 'COMMANDER', 'DISTRICT_MANAGER')
  getRegionStats(@Param('id') id: string) {
    return this.dashboardService.getRegionStats(id)
  }
}
