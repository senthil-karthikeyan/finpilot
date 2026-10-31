import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiParam,
} from '@nestjs/swagger';
import { CustomersService } from './customers.service.js';
import { GetCustomersDto } from './dto/get-customers.dto.js';

@ApiTags('Customers')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @ApiOperation({
    summary: 'Search, filter, and paginate customers',
    description:
      'Search customers by name, email, city, or ID, filter by wealth segment or KYC status, and sort by AUM, name, or onboarding date.',
  })
  @ApiOkResponse({
    description:
      'Paginated list of customer summaries with AUM and account counts.',
  })
  async findAll(@Query() query: GetCustomersDto) {
    return this.customersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get customer profile by ID',
    description:
      'Retrieves full customer master record, latest risk profile, and account summary with individual AUMs.',
  })
  @ApiParam({
    name: 'id',
    description: 'Customer identifier (e.g. C0001)',
    example: 'C0001',
  })
  @ApiOkResponse({
    description:
      'Detailed customer record with consolidated AUM and risk assessment.',
  })
  @ApiNotFoundResponse({
    description: 'Customer with the specified ID was not found.',
  })
  async findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }
}
