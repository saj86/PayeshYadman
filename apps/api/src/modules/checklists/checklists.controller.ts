import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { ChecklistsService } from './checklists.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

@ApiTags('checklists')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('checklists')
export class ChecklistsController {
  constructor(private service: ChecklistsService) {}

  @Get() findAll() { return this.service.findAll() }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id) }
  @Post() create(@Body() body: any) { return this.service.create(body) }
  @Post(':id/items') createItem(@Param('id') id: string, @Body() body: any) { return this.service.createItem(id, body) }
}
