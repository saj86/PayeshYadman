import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user,
)

export interface JwtPayload {
  sub: string
  email: string
  roles: string[]
  permissions: string[]
  appAccess: string[]
}
