import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { AuditService } from './audit.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit-logs')
export class AuditController {
  constructor(private service: AuditService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'SUPPORT', 'HQ_MANAGER')
  findAll(@Query('page') p?: string, @Query('limit') l?: string, @Query('entityType') et?: string) {
    return this.service.findAll(p ? parseInt(p) : 1, l ? parseInt(l) : 50, et)
  }
}
