import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiUnprocessableEntityResponse,
  ApiParam,
} from '@nestjs/swagger';
import { GoalsService } from './goals.service.js';
import { CreateGoalDto } from './dto/create-goal.dto.js';

@ApiTags('Goals')
@Controller('customers')
export class CustomerGoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Get(':id/goals')
  @ApiOperation({
    summary: 'Get all financial goals for a customer',
    description:
      'Retrieves the full list of financial goals for the specified customer, including calculated funded percentages and overdue indicators.',
  })
  @ApiParam({
    name: 'id',
    description: 'Customer identifier (e.g. C0001)',
    example: 'C0001',
  })
  @ApiOkResponse({
    description: 'List of customer financial goals with progress metrics.',
  })
  @ApiNotFoundResponse({
    description: 'Customer with the specified ID was not found.',
  })
  async getCustomerGoals(@Param('id') id: string) {
    return this.goalsService.getCustomerGoals(id);
  }

  @Post(':id/goals')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new financial goal for a customer',
    description:
      'Creates a new financial goal linked to the customer. Validates that the target date is today or in the future.',
  })
  @ApiParam({
    name: 'id',
    description: 'Customer identifier (e.g. C0001)',
    example: 'C0001',
  })
  @ApiCreatedResponse({
    description: 'The newly created financial goal.',
  })
  @ApiNotFoundResponse({
    description: 'Customer with the specified ID was not found.',
  })
  @ApiUnprocessableEntityResponse({
    description: 'Target date is in the past.',
  })
  async createGoal(@Param('id') id: string, @Body() dto: CreateGoalDto) {
    return this.goalsService.createGoal(id, dto);
  }
}

