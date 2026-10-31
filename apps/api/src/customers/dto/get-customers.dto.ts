import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  CUSTOMER_SEGMENTS,
  KYC_STATUSES,
  type CustomerSegment,
  type KycStatus,
} from '@finpilot/shared';

export class GetCustomersDto {
  @ApiPropertyOptional({
    description: 'Search term for name, email, city, or customer ID',
    example: 'Aarav',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: CUSTOMER_SEGMENTS,
    description: 'Filter by customer wealth segment',
    example: 'Affluent',
  })
  @IsOptional()
  @IsEnum(CUSTOMER_SEGMENTS)
  segment?: CustomerSegment;

  @ApiPropertyOptional({
    enum: KYC_STATUSES,
    description: 'Filter by KYC verification status',
    example: 'VERIFIED',
  })
  @IsOptional()
  @IsEnum(KYC_STATUSES)
  kycStatus?: KycStatus;

  @ApiPropertyOptional({
    default: 1,
    minimum: 1,
    description: 'Page number',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    default: 20,
    minimum: 1,
    maximum: 100,
    description: 'Page size (items per page)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({
    enum: ['name', 'aum', 'onboardedAt', 'id'],
    default: 'name',
    description: 'Sort field',
  })
  @IsOptional()
  @IsEnum(['name', 'aum', 'onboardedAt', 'id'])
  sortBy: 'name' | 'aum' | 'onboardedAt' | 'id' = 'name';

  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    default: 'asc',
    description: 'Sort direction',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortDir: 'asc' | 'desc' = 'asc';
}
