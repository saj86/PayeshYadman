import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../prisma/prisma.service'
import * as bcrypt from 'bcryptjs'

const loginAttempts = new Map<string, { count: number; until: number }>()

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  private checkLockout(email: string) {
    const maxAttempts = this.config.get<number>('lockout.maxAttempts') || 5
    const windowMs = this.config.get<number>('lockout.windowMs') || 900000
    const record = loginAttempts.get(email)
    if (record && record.count >= maxAttempts && Date.now() < record.until) {
      const waitMin = Math.ceil((record.until - Date.now()) / 60000)
      throw new UnauthorizedException(`حساب قفل شده است. لطفاً ${waitMin} دقیقه دیگر تلاش کنید`)
    }
  }

  private recordFailedAttempt(email: string) {
    const maxAttempts = this.config.get<number>('lockout.maxAttempts') || 5
    const windowMs = this.config.get<number>('lockout.windowMs') || 900000
    const record = loginAttempts.get(email) || { count: 0, until: 0 }
    record.count++
    if (record.count >= maxAttempts) {
      record.until = Date.now() + windowMs
      this.logger.warn(`Account locked: ${email} after ${record.count} failed attempts`)
    }
    loginAttempts.set(email, record)
  }

  private clearAttempts(email: string) {
    loginAttempts.delete(email)
  }

  private buildUserPayload(user: any) {
    const roles = user.userRoles.map((ur: any) => ur.role.name)
    const permissions = [...new Set<string>(
      user.userRoles.flatMap((ur: any) => ur.role.rolePermissions.map((rp: any) => rp.permission.name))
    )]
    const appAccess = user.userAppAccess.filter((a: any) => a.isActive).map((a: any) => a.appType)
    return { roles, permissions, appAccess }
  }

  private signAccess(userId: string, email: string, roles: string[], permissions: string[], appAccess: string[]) {
    return this.jwt.sign(
      { sub: userId, email, roles, permissions, appAccess },
      {
        secret: this.config.get<string>('jwt.secret'),
        expiresIn: this.config.get<string>('jwt.expiresIn') || '15m',
      },
    )
  }

  private signRefresh(userId: string) {
    return this.jwt.sign(
      { sub: userId },
      {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: this.config.get<string>('jwt.refreshExpiresIn') || '7d',
      },
    )
  }

  async login(email: string, password: string) {
    this.checkLockout(email)

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } },
        userAppAccess: true,
      },
    })

    if (!user || !user.isActive) {
      this.recordFailedAttempt(email)
      this.logger.warn(`Failed login attempt for: ${email}`)
      throw new UnauthorizedException('اطلاعات ورود نامعتبر است')
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      this.recordFailedAttempt(email)
      this.logger.warn(`Invalid password for: ${email}`)
      throw new UnauthorizedException('اطلاعات ورود نامعتبر است')
    }

    this.clearAttempts(email)
    this.logger.log(`Successful login: ${email}`)

    const { roles, permissions, appAccess } = this.buildUserPayload(user)
    const accessToken = this.signAccess(user.id, user.email, roles, permissions, appAccess)
    const refreshToken = this.signRefresh(user.id)

    // Audit log
    await this.prisma.auditLog.create({
      data: { userId: user.id, action: 'LOGIN', entityType: 'User', entityId: user.id },
    }).catch(() => null)

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        roles,
        permissions,
        appAccess,
      },
    }
  }

  async refresh(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } },
        userAppAccess: true,
      },
    })
    if (!user || !user.isActive) throw new UnauthorizedException('جلسه منقضی شده است')

    const { roles, permissions, appAccess } = this.buildUserPayload(user)
    const accessToken = this.signAccess(user.id, user.email, roles, permissions, appAccess)
    return { accessToken }
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } },
        userAppAccess: true,
      },
    })
    if (!user) throw new UnauthorizedException('کاربر یافت نشد')

    const { roles, permissions, appAccess } = this.buildUserPayload(user)
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      createdAt: user.createdAt,
      roles,
      permissions,
      appAccess,
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new UnauthorizedException()

    const valid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!valid) throw new BadRequestException('رمز عبور فعلی نادرست است')

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } })
    this.logger.log(`Password changed for user: ${user.email}`)
    return { message: 'رمز عبور با موفقیت تغییر کرد' }
  }

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } })
    // Always return success to prevent email enumeration
    if (!user) return { message: 'اگر این ایمیل در سیستم موجود باشد، لینک بازنشانی ارسال خواهد شد' }

    const resetToken = this.jwt.sign(
      { sub: user.id, purpose: 'password-reset' },
      { secret: this.config.get<string>('jwt.secret'), expiresIn: '1h' },
    )

    this.logger.log(`Password reset requested for: ${email} — token generated (email delivery pending)`)
    // TODO: Send email via email service
    return {
      message: 'اگر این ایمیل در سیستم موجود باشد، لینک بازنشانی ارسال خواهد شد',
      ...(process.env.NODE_ENV === 'development' ? { resetToken } : {}),
    }
  }

  async registerCitizen(email: string, password: string, fullName: string, phone?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } })
    if (existing) throw new BadRequestException('این ایمیل قبلاً ثبت شده است')

    const citizenRole = await this.prisma.role.findFirst({ where: { name: 'CITIZEN' } })
    if (!citizenRole) throw new BadRequestException('خطای سیستمی در ایجاد حساب')

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        phone,
        isActive: true,
        userRoles: { create: { roleId: citizenRole.id } },
        userAppAccess: { create: { appType: 'CITIZEN', isActive: true } },
      },
      include: {
        userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } },
        userAppAccess: true,
      },
    })

    this.logger.log(`Citizen registered: ${email}`)
    await this.prisma.auditLog.create({
      data: { userId: user.id, action: 'REGISTER', entityType: 'User', entityId: user.id },
    }).catch(() => null)

    const { roles, permissions, appAccess } = this.buildUserPayload(user)
    const accessToken = this.signAccess(user.id, user.email, roles, permissions, appAccess)
    const refreshToken = this.signRefresh(user.id)
    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, fullName: user.fullName, roles, permissions, appAccess },
    }
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      const payload = this.jwt.verify(token, { secret: this.config.get<string>('jwt.secret') }) as any
      if (payload.purpose !== 'password-reset') throw new Error()

      const passwordHash = await bcrypt.hash(newPassword, 12)
      await this.prisma.user.update({ where: { id: payload.sub }, data: { passwordHash } })
      this.logger.log(`Password reset completed for user: ${payload.sub}`)
      return { message: 'رمز عبور با موفقیت تغییر کرد' }
    } catch {
      throw new BadRequestException('لینک بازنشانی نامعتبر یا منقضی شده است')
    }
  }
}
