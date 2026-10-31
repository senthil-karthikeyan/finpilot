import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PortfolioService } from './portfolio.service.js';

@ApiBearerAuth()
@ApiTags('Portfolio')
@Controller('customers')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get(':id/portfolio')
  @ApiOperation({
    summary: 'Get consolidated customer portfolio dashboard',
    description:
      'Calculates consolidated customer AUM, cost basis, unrealised P&L, asset-class allocation, account breakdown, and trailing 12-month net cash flow.',
  })
  @ApiParam({
    name: 'id',
    description: 'Customer identifier (e.g. C0001)',
    example: 'C0001',
  })
  @ApiOkResponse({
    description:
      'Consolidated portfolio dashboard with account summaries, asset allocation, and monthly cash flow.',
  })
  @ApiNotFoundResponse({
    description: 'Customer with the specified ID was not found.',
  })
  async getPortfolio(@Param('id') id: string) {
    return this.portfolioService.getCustomerPortfolio(id);
  }

  @Get(':id/cashflow')
  @ApiOperation({
    summary: 'Get trailing 12-month monthly cash flows',
    description:
      'Retrieves trailing 12-month settled BUY, SELL, and net cash flow aggregates from v_monthly_net_flows (excluding future-dated transactions).',
  })
  @ApiParam({
    name: 'id',
    description: 'Customer identifier (e.g. C0001)',
    example: 'C0001',
  })
  @ApiOkResponse({
    description:
      'List of monthly cash flow buckets for Recharts visualization.',
  })
  @ApiNotFoundResponse({
    description: 'Customer with the specified ID was not found.',
  })
  async getCashFlow(@Param('id') id: string) {
    return this.portfolioService.getCustomerCashFlow(id);
  }
}
