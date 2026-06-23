import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../prisma/prisma.service'
import { join, extname } from 'path'
import { writeFile, mkdir, readFile, unlink } from 'fs/promises'
import { v4 as uuid } from 'uuid'
import { createReadStream, existsSync } from 'fs'

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
const ADMIN_ROLES = ['SUPER_ADMIN', 'HQ_MANAGER', 'SUPPORT', 'COMMANDER']

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name)

  constructor(private prisma: PrismaService, private config: ConfigService) {}

  private uploadDir() {
    return this.config.get<string>('upload.dir') || join(process.cwd(), 'uploads')
  }

  private async canAccessEntity(entityType: string, entityId: string, callerId: string, roles: string[]) {
    const isAdmin = roles.some(r => ADMIN_ROLES.includes(r))
    if (isAdmin) return true

    if (entityType === 'CitizenReport') {
      const r = await this.prisma.citizenReport.findUnique({ where: { id: entityId } })
      if (!r) return false
      if (r.reporterId === callerId) return true
      if (roles.includes('INSPECTOR') && r.assignedToId === callerId) return true
      return false
    }
    // For other entity types, allow if owner
    return false
  }

  async upload(file: any, entityType: string, entityId: string, callerId: string, roles: string[]) {
    const isAdmin = roles.some(r => ADMIN_ROLES.includes(r))

    // Verify the entity exists and caller can attach to it
    if (entityType === 'CitizenReport') {
      const report = await this.prisma.citizenReport.findUnique({ where: { id: entityId } })
      if (!report) throw new NotFoundException('گزارش یافت نشد')
      if (!isAdmin && report.reporterId !== callerId) throw new ForbiddenException('فقط صاحب گزارش می‌تواند فایل ضمیمه کند')
    }

    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException(`نوع فایل مجاز نیست. انواع مجاز: JPEG, PNG, WebP, PDF`)
    }

    const ext = extname(file.filename || '').replace('.', '').toLowerCase() || 'bin'
    const chunks: Buffer[] = []
    let totalSize = 0

    for await (const chunk of file.file) {
      totalSize += chunk.length
      if (totalSize > MAX_SIZE) throw new BadRequestException('حجم فایل بیشتر از ۱۰ مگابایت است')
      chunks.push(chunk)
    }

    const buffer = Buffer.concat(chunks)
    const dir = this.uploadDir()
    await mkdir(dir, { recursive: true })

    const storeName = `${uuid()}.${ext}`
    const diskPath = join(dir, storeName)
    await writeFile(diskPath, buffer)

    const attachment = await this.prisma.attachment.create({
      data: {
        entityType,
        entityId,
        uploadedById: callerId,
        fileName: file.filename || storeName,
        mimeType: file.mimetype,
        size: buffer.length,
        path: storeName,
      },
    })

    await this.prisma.auditLog.create({
      data: { userId: callerId, action: 'UPLOAD_ATTACHMENT', entityType, entityId, newValue: { attachmentId: attachment.id, fileName: attachment.fileName } },
    }).catch(() => null)

    this.logger.log(`Attachment uploaded: ${attachment.id} for ${entityType}:${entityId} by ${callerId}`)
    return { id: attachment.id, fileName: attachment.fileName, mimeType: attachment.mimeType, size: attachment.size, createdAt: attachment.createdAt }
  }

  async list(entityType: string, entityId: string, callerId: string, roles: string[]) {
    const canAccess = await this.canAccessEntity(entityType, entityId, callerId, roles)
    if (!canAccess) throw new ForbiddenException('دسترسی به فایل‌های این پرونده مجاز نیست')

    return this.prisma.attachment.findMany({
      where: { entityType, entityId },
      select: { id: true, fileName: true, mimeType: true, size: true, createdAt: true, uploadedBy: { select: { fullName: true } } },
      orderBy: { createdAt: 'asc' },
    })
  }

  async getFile(id: string, callerId: string, roles: string[]) {
    const attachment = await this.prisma.attachment.findUnique({ where: { id } })
    if (!attachment) throw new NotFoundException('فایل یافت نشد')

    const canAccess = await this.canAccessEntity(attachment.entityType, attachment.entityId, callerId, roles)
    if (!canAccess) throw new ForbiddenException('دسترسی به این فایل مجاز نیست')

    const diskPath = join(this.uploadDir(), attachment.path)
    if (!existsSync(diskPath)) throw new NotFoundException('فایل روی دیسک یافت نشد')

    await this.prisma.auditLog.create({
      data: { userId: callerId, action: 'VIEW_ATTACHMENT', entityType: attachment.entityType, entityId: attachment.entityId, newValue: { attachmentId: id } },
    }).catch(() => null)

    return { stream: createReadStream(diskPath), mimeType: attachment.mimeType, fileName: attachment.fileName }
  }

  async delete(id: string, callerId: string, roles: string[]) {
    const attachment = await this.prisma.attachment.findUnique({ where: { id } })
    if (!attachment) throw new NotFoundException('فایل یافت نشد')

    const isAdmin = roles.some(r => ADMIN_ROLES.includes(r))
    if (!isAdmin && attachment.uploadedById !== callerId) throw new ForbiddenException('فقط آپلودکننده یا مدیر می‌تواند فایل را حذف کند')

    const diskPath = join(this.uploadDir(), attachment.path)
    if (existsSync(diskPath)) await unlink(diskPath).catch(() => null)

    await this.prisma.attachment.delete({ where: { id } })

    await this.prisma.auditLog.create({
      data: { userId: callerId, action: 'DELETE_ATTACHMENT', entityType: attachment.entityType, entityId: attachment.entityId, oldValue: { attachmentId: id, fileName: attachment.fileName } },
    }).catch(() => null)

    this.logger.log(`Attachment deleted: ${id} by ${callerId}`)
    return { message: 'فایل حذف شد' }
  }
}
