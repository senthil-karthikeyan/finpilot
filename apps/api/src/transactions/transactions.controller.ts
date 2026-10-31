import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TransactionsService } from './transactions.service.js';
import { GetTransactionsDto } from './dto/get-transactions.dto.js';

@ApiBearerAuth()
@ApiTags('Transactions')
@Controller('customers')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get(':id/transactions')
  @ApiOperation({
    summary: 'Get paginated customer transactions with filters',
    description:
      'Returns a paginated ledger of transactions across all accounts belonging to the customer. Supports date range, account, instrument, transaction type, status, and anomaly filters with server-side sorting.',
  })
  @ApiParam({
    name: 'id',
    description: 'Customer identifier (e.g. C0001)',
    example: 'C0001',
  })
  @ApiOkResponse({
    description:
      'Paginated transactions list with pagination metadata and data-quality anomaly flags.',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { type: 'object' },
        },
        meta: {
          type: 'object',
          properties: {
            page: { type: 'number', example: 1 },
            pageSize: { type: 'number', example: 100 },
            total: { type: 'number', example: 4554 },
            totalPages: { type: 'number', example: 46 },
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Customer with the specified ID was not found.',
  })
  async getCustomerTransactions(
    @Param('id') id: string,
    @Query() query: GetTransactionsDto,
  ) {
    return this.transactionsService.getCustomerTransactions(id, query);
  }
}

