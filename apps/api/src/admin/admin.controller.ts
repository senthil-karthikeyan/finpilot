import {
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiParam,
} from '@nestjs/swagger';
import { type AuthUser } from '@finpilot/shared';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { AdminService, type UploadedCsvFile } from './admin.service.js';

@ApiTags('Admin')
@Controller('admin')
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('imports/transactions')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload and reconcile transactions CSV (Admin only)',
    description:
      'Accepts multipart CSV upload, verifies foreign keys, detects anomalies, isolates duplicate/invalid records into import_rows, and persists valid transactions.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Transactions CSV file',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description:
      'Batch processing summary including imported, duplicate, future-dated, and rejected counts.',
  })
  @ApiForbiddenResponse({
    description: 'Access denied: requires ADMIN role.',
  })
  async importTransactions(
    @UploadedFile() file: UploadedCsvFile,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.importTransactionsCsv(
      file,
      user?.email ?? 'admin@finpilot.test',
    );
  }

  @Get('imports')
  @ApiOperation({
    summary: 'List all CSV import batches (Admin only)',
    description:
      'Retrieves history of all executed CSV ingestion batches with counts and status.',
  })
  @ApiOkResponse({
    description: 'Array of import batch audit records.',
  })
  @ApiForbiddenResponse({
    description: 'Access denied: requires ADMIN role.',
  })
  async getImportBatches() {
    return this.adminService.getImportBatches();
  }

  @Get('imports/:batchId')
  @ApiOperation({
    summary: 'Get batch details and row-level audit trail (Admin only)',
    description:
      'Retrieves metadata and all rejected/anomalous row audit logs for the specified batch ID.',
  })
  @ApiParam({
    name: 'batchId',
    description: 'Batch identifier (e.g. IMP-0001 or BATCH-INITIAL-SEED)',
    example: 'IMP-0001',
  })
  @ApiOkResponse({
    description: 'Batch details and per-row reconciliation results.',
  })
  @ApiNotFoundResponse({
    description: 'Import batch not found.',
  })
  @ApiForbiddenResponse({
    description: 'Access denied: requires ADMIN role.',
  })
  async getImportBatch(@Param('batchId') batchId: string) {
    return this.adminService.getImportBatch(batchId);
  }

  @Get('data-quality')
  @ApiOperation({
    summary: 'Get consolidated data-quality anomaly summary (Admin only)',
    description:
      'Returns aggregate counts and handling documentation for all detected anomalies across the system.',
  })
  @ApiOkResponse({
    description: 'Consolidated data-quality anomalies summary.',
  })
  @ApiForbiddenResponse({
    description: 'Access denied: requires ADMIN role.',
  })
  async getDataQualitySummary() {
    return this.adminService.getDataQualitySummary();
  }
}
