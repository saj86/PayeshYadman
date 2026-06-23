import { Controller, Post, UseGuards, Request, HttpException, HttpStatus } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { join, extname } from 'path'
import { writeFile, mkdir } from 'fs/promises'
import { v4 as uuid } from 'uuid'

const SAFE_EXT_PATTERN = /^[a-z0-9]+$/i

@ApiTags('uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private config: ConfigService) {}

  @Post()
  async upload(@Request() req: any) {
    const data = await (req.raw as any).file()
    if (!data) throw new HttpException('فایلی ارسال نشده است', HttpStatus.BAD_REQUEST)

    const allowedTypes = (
      this.config.get<string>('upload.allowedTypes') || 'image/jpeg,image/png,image/webp,application/pdf'
    ).split(',')

    const maxSize = this.config.get<number>('upload.maxSize') || 10 * 1024 * 1024

    if (!allowedTypes.includes(data.mimetype)) {
      throw new HttpException('نوع فایل مجاز نیست', HttpStatus.UNPROCESSABLE_ENTITY)
    }

    const originalExt = extname(data.filename).replace('.', '').toLowerCase()
    if (!SAFE_EXT_PATTERN.test(originalExt) || originalExt.length > 10) {
      throw new HttpException('پسوند فایل نامعتبر است', HttpStatus.UNPROCESSABLE_ENTITY)
    }

    const chunks: Buffer[] = []
    let totalSize = 0

    for await (const chunk of data.file) {
      totalSize += chunk.length
      if (totalSize > maxSize) {
        throw new HttpException(
          `حجم فایل نباید بیشتر از ${Math.round(maxSize / 1024 / 1024)} مگابایت باشد`,
          HttpStatus.PAYLOAD_TOO_LARGE,
        )
      }
      chunks.push(chunk)
    }

    const buffer = Buffer.concat(chunks)
    const uploadDir = this.config.get<string>('upload.dir') || join(process.cwd(), 'uploads')
    const fileName = `${uuid()}.${originalExt}`

    await mkdir(uploadDir, { recursive: true })
    await writeFile(join(uploadDir, fileName), buffer)

    return { url: `/uploads/${fileName}`, fileName, size: buffer.length }
  }
}
