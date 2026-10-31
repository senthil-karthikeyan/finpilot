import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
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
  ApiBearerAuth,
} from '@nestjs/swagger';
import { type AuthUser } from '@finpilot/shared';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { AdminService, type UploadedCsvFile } from './admin.service.js';

@ApiBearerAuth()
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

  @Get('imports/:batchId/rejected')
  @ApiOperation({
    summary: 'Get paginated rejected rows for an import batch (Admin only)',
    description:
      'Returns paginated list of rejected and duplicate rows for an import batch.',
  })
  @ApiParam({
    name: 'batchId',
    description: 'Batch identifier (e.g. IMP-0001)',
    example: 'IMP-0001',
  })
  @ApiOkResponse({
    description: 'Paginated rejected rows.',
  })
  @ApiForbiddenResponse({
    description: 'Access denied: requires ADMIN role.',
  })
  async getRejectedRows(
    @Param('batchId') batchId: string,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '100',
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const pageSizeNum = parseInt(pageSize, 10) || 100;
    return this.adminService.getRejectedRows(batchId, pageNum, pageSizeNum);
  }

  @Get('imports/:batchId/rejected/csv')
  @ApiOperation({
    summary: 'Download CSV of rejected rows for an import batch (Admin only)',
    description:
      'Generates and streams a CSV file of all rejected and duplicate rows for an import batch.',
  })
  @ApiParam({
    name: 'batchId',
    description: 'Batch identifier (e.g. IMP-0001)',
    example: 'IMP-0001',
  })
  @ApiOkResponse({
    description: 'CSV file download of rejected rows.',
  })
  @ApiForbiddenResponse({
    description: 'Access denied: requires ADMIN role.',
  })
  async downloadRejectedRowsCsv(
    @Param('batchId') batchId: string,
    @Res() res: Response,
  ) {
    const csvData = await this.adminService.getRejectedRowsCsv(batchId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="rejected_rows_${batchId}.csv"`,
    );
    res.send(csvData);
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
