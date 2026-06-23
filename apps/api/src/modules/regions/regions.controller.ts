import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { RegionsService } from './regions.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

@ApiTags('regions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('regions')
export class RegionsController {
  constructor(private service: RegionsService) {}

  @Get() findAll() { return this.service.findAll() }
  @Get('tree') findTree() { return this.service.findTree() }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id) }
  @Post() create(@Body() body: any) { return this.service.create(body) }
  @Put(':id') update(@Param('id') id: string, @Body() body: any) { return this.service.update(id, body) }
}
