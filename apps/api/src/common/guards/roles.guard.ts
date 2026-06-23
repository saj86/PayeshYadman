import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ROLES_KEY } from '../decorators/roles.decorator'

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name)

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!requiredRoles || requiredRoles.length === 0) return true

    const { user, url, method } = context.switchToHttp().getRequest()
    const hasRole = requiredRoles.some(role => user?.roles?.includes(role))

    if (!hasRole) {
      this.logger.warn(
        `Authorization denied: user=${user?.sub} roles=[${user?.roles?.join(',')}] needed=[${requiredRoles.join(',')}] ${method} ${url}`,
      )
      throw new ForbiddenException('دسترسی غیر مجاز')
    }

    return true
  }
}
