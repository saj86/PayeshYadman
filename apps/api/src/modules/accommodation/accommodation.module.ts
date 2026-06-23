import { Module } from '@nestjs/common'
import { AccommodationController } from './accommodation.controller'
import { AccommodationService } from './accommodation.service'
import { PrismaModule } from '../../prisma/prisma.module'

@Module({ imports: [PrismaModule], controllers: [AccommodationController], providers: [AccommodationService] })
export class AccommodationModule {}
