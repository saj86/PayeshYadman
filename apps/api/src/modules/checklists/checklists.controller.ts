import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { ChecklistsService } from './checklists.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'

@ApiTags('checklists')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('checklists')
export class ChecklistsController {
  constructor(private service: ChecklistsService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'HQ_MANAGER', 'COMMANDER', 'INSPECTOR', 'DISTRICT_MANAGER')
  findAll() { return this.service.findAll() }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'HQ_MANAGER', 'COMMANDER', 'INSPECTOR', 'DISTRICT_MANAGER')
  findOne(@Param('id') id: string) { return this.service.findOne(id) }

  @Post()
  @Roles('SUPER_ADMIN', 'HQ_MANAGER')
  create(@Body() body: any) { return this.service.create(body) }

  @Post(':id/items')
  @Roles('SUPER_ADMIN', 'HQ_MANAGER')
  createItem(@Param('id') id: string, @Body() body: any) { return this.service.createItem(id, body) }
}
