import { Controller, Get, Post, Delete, Param, Query, UseGuards, Request, Res, HttpException, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { AttachmentsService } from './attachments.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import type { FastifyReply } from 'fastify'

@ApiTags('attachments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attachments')
export class AttachmentsController {
  constructor(private service: AttachmentsService) {}

  @Post('upload')
  async upload(
    @Request() req: any,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ) {
    if (!entityType || !entityId) throw new HttpException('entityType و entityId الزامی هستند', HttpStatus.BAD_REQUEST)
    const file = await req.raw.file().catch(() => null)
    if (!file) throw new HttpException('فایلی ارسال نشده است', HttpStatus.BAD_REQUEST)
    return this.service.upload(file, entityType, entityId, req.user.sub, req.user.roles)
  }

  @Get()
  list(
    @Request() req: any,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ) {
    return this.service.list(entityType, entityId, req.user.sub, req.user.roles)
  }

  @Get(':id/file')
  async getFile(@Param('id') id: string, @Request() req: any, @Res() res: FastifyReply) {
    const { stream, mimeType, fileName } = await this.service.getFile(id, req.user.sub, req.user.roles)
    res.header('Content-Type', mimeType)
    res.header('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`)
    res.header('Cache-Control', 'private, no-store')
    res.send(stream)
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Request() req: any) {
    return this.service.delete(id, req.user.sub, req.user.roles)
  }
}
