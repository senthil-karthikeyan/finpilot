import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Health check used by Docker Compose `healthcheck` and load-balancers.
   * Not behind auth — must be publicly accessible.
   */
  @Get('health')
  @ApiOperation({ summary: 'Liveness check' })
  health(): { status: string; timestamp: string } {
    return this.appService.health();
  }
}

