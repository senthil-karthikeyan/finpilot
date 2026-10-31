import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiUnprocessableEntityResponse,
  ApiParam,
} from '@nestjs/swagger';
import { GoalsService } from './goals.service.js';
import { UpdateGoalDto } from './dto/update-goal.dto.js';

@ApiTags('Goals')
@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Patch(':goalId')
  @ApiOperation({
    summary: 'Update an existing financial goal',
    description:
      'Partially updates goal parameters. If the target date is modified, it must be today or in the future; if unmodified, existing past dates are accepted.',
  })
  @ApiParam({
    name: 'goalId',
    description: 'Goal identifier (e.g. G00001)',
    example: 'G00001',
  })
  @ApiOkResponse({
    description: 'The updated financial goal.',
  })
  @ApiNotFoundResponse({
    description: 'Goal with the specified ID was not found.',
  })
  @ApiUnprocessableEntityResponse({
    description: 'Target date was updated to a past date.',
  })
  async updateGoal(
    @Param('goalId') goalId: string,
    @Body() dto: UpdateGoalDto,
  ) {
    return this.goalsService.updateGoal(goalId, dto);
  }

  @Delete(':goalId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a financial goal',
    description: 'Removes the financial goal record by ID.',
  })
  @ApiParam({
    name: 'goalId',
    description: 'Goal identifier (e.g. G00001)',
    example: 'G00001',
  })
  @ApiOkResponse({
    description: 'Goal successfully deleted.',
  })
  @ApiNotFoundResponse({
    description: 'Goal with the specified ID was not found.',
  })
  async deleteGoal(@Param('goalId') goalId: string) {
    return this.goalsService.deleteGoal(goalId);
  }
}

