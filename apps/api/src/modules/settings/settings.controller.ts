import { Controller, Get, Put, Body, Param, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { SettingsService } from './settings.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'

@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private service: SettingsService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'HQ_MANAGER', 'SUPPORT')
  findAll() {
    return this.service.findAll()
  }

  @Put(':key')
  @Roles('SUPER_ADMIN', 'HQ_MANAGER')
  upsert(@Param('key') key: string, @Body() body: { value: string; description?: string }, @Request() req: any) {
    return this.service.upsert(key, body.value, body.description, req.user.sub)
  }
}
