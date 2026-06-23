import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { AssignmentsService } from './assignments.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

@ApiTags('assignments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('assignments')
export class AssignmentsController {
  constructor(private service: AssignmentsService) {}

  @Post() create(@Body() body: any, @Request() req: any) {
    return this.service.create(body.inspectionSubmissionId, body.assignedToId, req.user.sub, body.dueAt)
  }

  @Get('mine') findMine(@Request() req: any) { return this.service.findMine(req.user.sub) }

  @Put(':id/status') updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.service.updateStatus(id, body.status)
  }
}
