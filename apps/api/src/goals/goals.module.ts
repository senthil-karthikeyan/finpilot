import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { CustomerGoalsController } from './customer-goals.controller.js';
import { GoalsController } from './goals.controller.js';
import { GoalsService } from './goals.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [CustomerGoalsController, GoalsController],
  providers: [GoalsService],
  exports: [GoalsService],
})
export class GoalsModule {}

