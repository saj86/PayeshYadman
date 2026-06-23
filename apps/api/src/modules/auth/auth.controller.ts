import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { JwtRefreshGuard } from '../../common/guards/jwt-refresh.guard'
import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator'

class RegisterDto {
  @IsEmail({}, { message: 'ایمیل معتبر وارد کنید' })
  email: string

  @IsString()
  @MinLength(8, { message: 'رمز عبور باید حداقل ۸ کاراکتر باشد' })
  password: string

  @IsString()
  @MinLength(2, { message: 'نام باید حداقل ۲ کاراکتر باشد' })
  fullName: string

  @IsOptional()
  @IsString()
  phone?: string
}

class LoginDto {
  @IsEmail({}, { message: 'ایمیل معتبر وارد کنید' })
  email: string

  @IsString()
  @MinLength(6, { message: 'رمز عبور باید حداقل ۶ کاراکتر باشد' })
  password: string
}

class ChangePasswordDto {
  @IsString() @MinLength(6) currentPassword: string
  @IsString() @MinLength(8, { message: 'رمز جدید باید حداقل ۸ کاراکتر باشد' }) newPassword: string
}

class ForgotPasswordDto {
  @IsEmail({}, { message: 'ایمیل معتبر وارد کنید' }) email: string
}

class ResetPasswordDto {
  @IsString() token: string
  @IsString() @MinLength(8) newPassword: string
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  register(@Body() dto: RegisterDto) {
    return this.authService.registerCitizen(dto.email, dto.password, dto.fullName, dto.phone)
  }

  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password)
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  refresh(@Request() req: any) {
    return this.authService.refresh(req.user.sub)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  me(@Request() req: any) {
    return this.authService.me(req.user.sub)
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  logout(@Request() req: any) {
    return { message: 'با موفقیت خارج شدید' }
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  changePassword(@Body() dto: ChangePasswordDto, @Request() req: any) {
    return this.authService.changePassword(req.user.sub, dto.currentPassword, dto.newPassword)
  }

  @Post('forgot-password')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(dto.email)
  }

  @Post('reset-password')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword)
  }
}
