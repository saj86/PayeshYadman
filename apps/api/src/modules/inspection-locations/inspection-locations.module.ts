import { Module } from '@nestjs/common'
import { InspectionLocationsController } from './inspection-locations.controller'
import { InspectionLocationsService } from './inspection-locations.service'
import { PrismaModule } from '../../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [InspectionLocationsController],
  providers: [InspectionLocationsService],
  exports: [InspectionLocationsService],
})
export class InspectionLocationsModule {}
