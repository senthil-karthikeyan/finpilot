import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  TRANSACTION_TYPES,
  TRANSACTION_STATUSES,
  type TransactionType,
  type TransactionStatus,
} from '@finpilot/shared';

export class GetTransactionsDto {
  @ApiPropertyOptional({
    description: 'Filter by account ID (e.g. A0001)',
    example: 'A0001',
  })
  @IsOptional()
  @IsString()
  accountId?: string;

  @ApiPropertyOptional({
    description: 'Filter by instrument ID (e.g. I0001)',
    example: 'I0001',
  })
  @IsOptional()
  @IsString()
  instrumentId?: string;

  @ApiPropertyOptional({
    enum: TRANSACTION_TYPES,
    description: 'Filter by transaction type (BUY, SELL, DIVIDEND, FEE)',
    example: 'BUY',
  })
  @IsOptional()
  @IsEnum(TRANSACTION_TYPES)
  transactionType?: TransactionType;

  @ApiPropertyOptional({
    enum: TRANSACTION_TYPES,
    description: 'Alias for transactionType',
    example: 'BUY',
  })
  @IsOptional()
  @IsEnum(TRANSACTION_TYPES)
  type?: TransactionType;

  @ApiPropertyOptional({
    enum: TRANSACTION_STATUSES,
    description: 'Filter by transaction status (SETTLED, PENDING, REVERSED)',
    example: 'SETTLED',
  })
  @IsOptional()
  @IsEnum(TRANSACTION_STATUSES)
  status?: TransactionStatus;

  @ApiPropertyOptional({
    description: 'Filter transactions on or after this ISO date (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter transactions on or before this ISO date (YYYY-MM-DD)',
    example: '2026-09-18',
  })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Alias for startDate (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Alias for endDate (YYYY-MM-DD)',
    example: '2026-09-18',
  })
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Filter specifically for future-dated anomaly transactions',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isFuture?: boolean;

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
    default: 100,
    minimum: 1,
    maximum: 100,
    description: 'Page size (default 100, maximum 100)',
    example: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 100;

  @ApiPropertyOptional({
    default: 100,
    minimum: 1,
    maximum: 100,
    description: 'Alias for pageSize (items per page, max 100)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    enum: ['tradeDate', 'amount', 'transactionType'],
    default: 'tradeDate',
    description: 'Sort field',
  })
  @IsOptional()
  @IsEnum(['tradeDate', 'amount', 'transactionType'])
  sortBy: 'tradeDate' | 'amount' | 'transactionType' = 'tradeDate';

  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    default: 'desc',
    description: 'Sort direction',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortDir: 'asc' | 'desc' = 'desc';
}
