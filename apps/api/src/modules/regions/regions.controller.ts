import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { RegionsService } from './regions.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'

@ApiTags('regions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('regions')
export class RegionsController {
  constructor(private service: RegionsService) {}

  @Get() findAll() { return this.service.findAll() }
  @Get('tree') findTree() { return this.service.findTree() }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id) }

  @Post()
  @Roles('SUPER_ADMIN', 'HQ_MANAGER')
  create(@Body() body: any) { return this.service.create(body) }

  @Put(':id')
  @Roles('SUPER_ADMIN', 'HQ_MANAGER')
  update(@Param('id') id: string, @Body() body: any) { return this.service.update(id, body) }
}
