import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateGoalDto {
  @ApiPropertyOptional({
    description: 'Name of the goal (3–60 characters)',
    example: 'Retirement Corpus',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Name of the goal (alias for name, 3–60 characters)',
    example: 'Retirement Corpus',
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

  @ApiProperty({
    enum: GOAL_PRIORITIES,
    description: 'Priority level for goal funding',
    example: 'HIGH',
  })
  @IsEnum(GOAL_PRIORITIES)
  priority: GoalPriority;

  @ApiProperty({
    description: 'Target amount in INR (must be positive)',
    example: 2500000,
  })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  targetAmount: number;

  @ApiPropertyOptional({
    description: 'Current funded amount in INR (default 0)',
    example: 500000,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  currentAmount?: number;

  @ApiPropertyOptional({
    description: 'Current funded amount in INR (alias for currentAmount)',
    example: 500000,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  currentFundedAmount?: number;

  @ApiProperty({
    description:
      'Target date in ISO format YYYY-MM-DD (must be today or in future)',
    example: '2030-12-31',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'targetDate must be in YYYY-MM-DD format',
  })
  targetDate: string;
}

