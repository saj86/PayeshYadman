import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './modules/auth/auth.module'
import { UsersModule } from './modules/users/users.module'
import { RegionsModule } from './modules/regions/regions.module'
import { InspectionsModule } from './modules/inspections/inspections.module'
import { ChecklistsModule } from './modules/checklists/checklists.module'
import { ReportsModule } from './modules/reports/reports.module'
import { AccommodationModule } from './modules/accommodation/accommodation.module'
import { LostFoundModule } from './modules/lost-found/lost-found.module'
import { EmergencyModule } from './modules/emergency/emergency.module'
import { AssignmentsModule } from './modules/assignments/assignments.module'
import { DashboardModule } from './modules/dashboard/dashboard.module'
import { UploadsModule } from './modules/uploads/uploads.module'
import { AuditModule } from './modules/audit/audit.module'
import { SupportModule } from './modules/support/support.module'
import { NotificationsModule } from './modules/notifications/notifications.module'
import configuration from './config/configuration'
import { validateConfig } from './config/config.validation'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateConfig,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.RATE_LIMIT_TTL || '60') * 1000,
        limit: parseInt(process.env.RATE_LIMIT_MAX || '100'),
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    RegionsModule,
    InspectionsModule,
    ChecklistsModule,
    ReportsModule,
    AccommodationModule,
    LostFoundModule,
    EmergencyModule,
    AssignmentsModule,
    DashboardModule,
    UploadsModule,
    AuditModule,
    SupportModule,
    NotificationsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
