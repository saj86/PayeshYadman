import { Controller, Get, Post, Put, Delete, Patch, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { UsersService } from './users.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'SUPPORT', 'HQ_MANAGER')
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
  ) {
    return this.usersService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search,
      role,
    )
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'SUPPORT', 'HQ_MANAGER')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id)
  }

  @Post()
  @Roles('SUPER_ADMIN', 'SUPPORT')
  create(@Body() body: any) {
    return this.usersService.create(body)
  }

  @Put(':id')
  @Roles('SUPER_ADMIN', 'SUPPORT')
  update(@Param('id') id: string, @Body() body: any) {
    return this.usersService.update(id, body)
  }

  @Patch(':id/reset-password')
  @Roles('SUPER_ADMIN', 'SUPPORT')
  resetPassword(@Param('id') id: string, @Body() body: { password: string }) {
    return this.usersService.resetPassword(id, body.password)
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id)
  }
}
