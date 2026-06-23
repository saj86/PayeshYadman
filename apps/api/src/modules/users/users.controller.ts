import { Controller, Get, Post, Put, Delete, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common'
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
  @Roles('SUPER_ADMIN', 'SUPPORT', 'HQ_MANAGER', 'COMMANDER')
  findAll(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
  ) {
    return this.usersService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search,
      role,
      req.user.roles,
      status,
    )
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'SUPPORT', 'HQ_MANAGER')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.usersService.findOne(id, req.user.roles)
  }

  @Post()
  @Roles('SUPER_ADMIN', 'SUPPORT')
  create(@Body() body: any) {
    return this.usersService.create(body)
  }

  @Put(':id')
  @Roles('SUPER_ADMIN', 'SUPPORT')
  update(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.usersService.update(id, body, req.user.roles)
  }

  @Put(':id/roles')
  @Roles('SUPER_ADMIN', 'SUPPORT')
  updateRoles(@Request() req: any, @Param('id') id: string, @Body() body: { roleNames: string[] }) {
    return this.usersService.updateRoles(id, body.roleNames, req.user.roles)
  }

  @Put(':id/app-access')
  @Roles('SUPER_ADMIN', 'SUPPORT')
  updateAppTypes(@Request() req: any, @Param('id') id: string, @Body() body: { appTypes: string[] }) {
    return this.usersService.updateAppTypes(id, body.appTypes, req.user.roles)
  }

  @Patch(':id/toggle-active')
  @Roles('SUPER_ADMIN', 'SUPPORT')
  toggleActive(@Request() req: any, @Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.usersService.toggleActive(id, body.isActive, req.user.roles)
  }

  @Patch(':id/reset-password')
  @Roles('SUPER_ADMIN', 'SUPPORT')
  resetPassword(@Request() req: any, @Param('id') id: string, @Body() body: { password: string }) {
    return this.usersService.resetPassword(id, body.password, req.user.roles)
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id)
  }
}
