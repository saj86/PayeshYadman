import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name)

  canActivate(context: ExecutionContext) {
    return super.canActivate(context)
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      const { url, method } = context.switchToHttp().getRequest()
      this.logger.warn(`Unauthenticated access attempt: ${method} ${url} — ${info?.message || err?.message || 'no token'}`)
      throw err || new UnauthorizedException('احراز هویت الزامی است')
    }
    return user
  }
}
