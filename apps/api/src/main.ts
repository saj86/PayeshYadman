import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { ValidationPipe, Logger } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { ConfigService } from '@nestjs/config'
import { AppModule } from './app.module'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter'
import { LoggingInterceptor } from './common/interceptors/logging.interceptor'
import { join } from 'path'
import { mkdir } from 'fs/promises'

async function bootstrap() {
  const logger = new Logger('Bootstrap')

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
    { bufferLogs: true },
  )

  const config = app.get(ConfigService)
  const port = config.get<number>('port') || 3001
  const nodeEnv = config.get<string>('nodeEnv') || 'development'
  const corsOrigins = config.get<string[]>('cors.origins') || ['http://localhost:3000']

  // Security headers via Fastify
  await app.register(require('@fastify/helmet'), {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        scriptSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })

  // CORS
  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })

  // File serving
  const uploadDir = config.get<string>('upload.dir') || './uploads'
  await mkdir(uploadDir, { recursive: true })
  await app.register(require('@fastify/static'), {
    root: join(process.cwd(), uploadDir),
    prefix: '/uploads/',
    decorateReply: false,
  })

  // Multipart
  await app.register(require('@fastify/multipart'), {
    limits: { fileSize: config.get<number>('upload.maxSize') || 10 * 1024 * 1024 },
  })

  // Global pipes, filters, interceptors
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: false,
    stopAtFirstError: true,
  }))
  app.useGlobalFilters(new AllExceptionsFilter())
  app.useGlobalInterceptors(new LoggingInterceptor())

  // Swagger (non-production only)
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('سامانه نظارت شهرداری تهران')
      .setDescription('Municipality Inspection & Monitoring Platform API')
      .setVersion('1.0')
      .addBearerAuth()
      .build()
    const document = SwaggerModule.createDocument(app, swaggerConfig)
    SwaggerModule.setup('api/docs', app, document)
    logger.log(`📚 Swagger docs: http://localhost:${port}/api/docs`)
  }

  await app.listen(port, '0.0.0.0')
  logger.log(`🚀 API running in ${nodeEnv} mode on port ${port}`)
}

bootstrap().catch(err => {
  console.error('Fatal startup error:', err)
  process.exit(1)
})
