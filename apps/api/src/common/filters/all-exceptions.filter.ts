import {
  ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger,
} from '@nestjs/common'
import { FastifyReply, FastifyRequest } from 'fastify'

const PERSIAN_ERRORS: Record<number, string> = {
  400: 'درخواست نامعتبر است',
  401: 'برای دسترسی باید وارد شوید',
  403: 'شما مجاز به این عملیات نیستید',
  404: 'منبع مورد نظر یافت نشد',
  409: 'تعارض داده — این مورد قبلاً ثبت شده است',
  422: 'داده‌های ارسال‌شده معتبر نیستند',
  429: 'تعداد درخواست‌ها از حد مجاز تجاوز کرده است',
  500: 'خطای داخلی سرور رخ داد',
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const reply = ctx.getResponse<FastifyReply>()
    const request = ctx.getRequest<FastifyRequest>()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let message = PERSIAN_ERRORS[500]
    let details: any = undefined

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const response = exception.getResponse()
      if (typeof response === 'object' && 'message' in response) {
        const rawMessage = (response as any).message
        message = Array.isArray(rawMessage) ? rawMessage.join(', ') : rawMessage
      } else if (typeof response === 'string') {
        message = response
      }
      message = PERSIAN_ERRORS[status] || message
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled error: ${exception.message}`, exception.stack)
      if (process.env.NODE_ENV === 'development') {
        details = exception.message
      }
    }

    this.logger.warn(`[${request.method}] ${request.url} → ${status}`)

    reply.status(status).send({
      statusCode: status,
      message,
      ...(details ? { details } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
    })
  }
}
