import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import {
  GOAL_TYPES,
  GOAL_PRIORITIES,
  type GoalType,
  type GoalPriority,
} from '@finpilot/shared';

export class UpdateGoalDto {
  @ApiPropertyOptional({
    description: 'Name of the goal (3–60 characters)',
    example: 'Updated Retirement Goal',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Name of the goal (alias for name, 3–60 characters)',
    example: 'Updated Retirement Goal',
  })
  @IsOptional()
  @IsString()
  goalName?: string;

  @ApiPropertyOptional({
    enum: GOAL_TYPES,
    description: 'Goal type classification',
    example: 'RETIREMENT',
  })
  @IsOptional()
  @IsEnum(GOAL_TYPES)
  type?: GoalType;

  @ApiPropertyOptional({
    enum: GOAL_TYPES,
    description: 'Goal type classification (alias for type)',
    example: 'RETIREMENT',
  })
  @IsOptional()
  @IsEnum(GOAL_TYPES)
  goalType?: GoalType;

  @ApiPropertyOptional({
    enum: GOAL_PRIORITIES,
    description: 'Priority level for goal funding',
    example: 'HIGH',
  })
  @IsOptional()
  @IsEnum(GOAL_PRIORITIES)
  priority?: GoalPriority;

  @ApiPropertyOptional({
    description: 'Target amount in INR (must be positive)',
    example: 3000000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  targetAmount?: number;

  @ApiPropertyOptional({
    description: 'Current funded amount in INR',
    example: 750000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  currentAmount?: number;

  @ApiPropertyOptional({
    description: 'Current funded amount in INR (alias for currentAmount)',
    example: 750000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  currentFundedAmount?: number;

  @ApiPropertyOptional({
    description:
      'Target date in ISO format YYYY-MM-DD (allowed past if unchanged, must be today or later if changed)',
    example: '2032-06-30',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'targetDate must be in YYYY-MM-DD format',
  })
  targetDate?: string;
}

