import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { AssignmentsService } from './assignments.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'

@ApiTags('assignments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('assignments')
export class AssignmentsController {
  constructor(private service: AssignmentsService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'HQ_MANAGER', 'COMMANDER')
  create(@Body() body: any, @Request() req: any) {
    return this.service.create(body.inspectionSubmissionId, body.assignedToId, req.user.sub, body.dueAt)
  }

  @Get('mine')
  @Roles('SUPER_ADMIN', 'HQ_MANAGER', 'COMMANDER', 'INSPECTOR')
  findMine(@Request() req: any) { return this.service.findMine(req.user.sub) }

  @Put(':id/status')
  @Roles('SUPER_ADMIN', 'HQ_MANAGER', 'COMMANDER', 'INSPECTOR')
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.service.updateStatus(id, body.status)
  }
}
