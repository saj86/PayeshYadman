import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import * as bcrypt from 'bcryptjs'

const USER_INCLUDE = {
  userRoles: { include: { role: true } },
  userAppAccess: true,
} as const

function stripHash<T extends { passwordHash?: string }>(user: T): Omit<T, 'passwordHash'> {
  const { passwordHash: _, ...rest } = user
  return rest
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name)

  constructor(private prisma: PrismaService) {}

  private isSuperAdmin(roles: string[]) { return roles.includes('SUPER_ADMIN') }

  private assertCanManageTarget(targetRoles: string[], callerRoles: string[]) {
    if (!this.isSuperAdmin(callerRoles) && targetRoles.includes('SUPER_ADMIN')) {
      this.logger.warn(`Non-admin caller attempted to manage a SUPER_ADMIN account`)
      throw new ForbiddenException('عملیات روی حساب مدیر کل مجاز نیست')
    }
  }

  async findAll(page = 1, limit = 20, search?: string, role?: string, callerRoles: string[] = []) {
    const skip = (page - 1) * limit
    const where: any = { isActive: true }

    // SUPPORT users cannot see SUPER_ADMIN accounts
    if (!this.isSuperAdmin(callerRoles)) {
      where.NOT = { userRoles: { some: { role: { name: 'SUPER_ADMIN' } } } }
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (role && role !== 'SUPER_ADMIN') {
      where.userRoles = { some: { role: { name: role } } }
    } else if (role === 'SUPER_ADMIN' && this.isSuperAdmin(callerRoles)) {
      where.userRoles = { some: { role: { name: role } } }
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, include: USER_INCLUDE }),
      this.prisma.user.count({ where }),
    ])

    return { data: data.map(stripHash), total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  async findOne(id: string, callerRoles: string[] = []) {
    const user = await this.prisma.user.findUnique({ where: { id }, include: USER_INCLUDE })
    if (!user) throw new NotFoundException('کاربر یافت نشد')
    const targetRoles = (user as any).userRoles?.map((ur: any) => ur.role?.name) ?? []
    this.assertCanManageTarget(targetRoles, callerRoles)
    return stripHash(user)
  }

  async create(data: { email: string; fullName: string; password: string; roleNames?: string[]; appTypes?: string[] }) {
    const passwordHash = await bcrypt.hash(data.password, 10)

    const user = await this.prisma.user.create({
      data: { email: data.email, fullName: data.fullName, passwordHash, isActive: true },
    })

    if (data.roleNames?.length) {
      const roles = await this.prisma.role.findMany({ where: { name: { in: data.roleNames } } })
      await this.prisma.userRole.createMany({
        data: roles.map(r => ({ userId: user.id, roleId: r.id })),
        skipDuplicates: true,
      })
    }

    if (data.appTypes?.length) {
      await this.prisma.userAppAccess.createMany({
        data: data.appTypes.map((appType: any) => ({ userId: user.id, appType, isActive: true })),
        skipDuplicates: true,
      })
    }

    return this.findOne(user.id)
  }

  async update(id: string, data: { fullName?: string; email?: string; isActive?: boolean }, callerRoles: string[] = []) {
    await this.findOne(id, callerRoles)
    const updated = await this.prisma.user.update({ where: { id }, data })
    return stripHash(updated)
  }

  async resetPassword(id: string, newPassword: string, callerRoles: string[] = []) {
    await this.findOne(id, callerRoles)
    const passwordHash = await bcrypt.hash(newPassword, 10)
    await this.prisma.user.update({ where: { id }, data: { passwordHash } })
    return { message: 'رمز عبور با موفقیت تغییر کرد' }
  }

  async remove(id: string) {
    await this.findOne(id)
    await this.prisma.user.update({ where: { id }, data: { isActive: false } })
    return { message: 'کاربر غیرفعال شد' }
  }
}
