import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { DashboardService } from './dashboard.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('hq')
  getHQStats() {
    return this.dashboardService.getHQStats()
  }

  @Get('activity')
  getActivity(@Query('limit') limit?: string) {
    return this.dashboardService.getActivity(limit ? parseInt(limit) : 30)
  }

  @Get('region/:id')
  getRegionStats(@Param('id') id: string) {
    return this.dashboardService.getRegionStats(id)
  }
}
