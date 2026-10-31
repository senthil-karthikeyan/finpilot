import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service.js';
import { Public } from './auth/decorators/public.decorator.js';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Health check used by Docker Compose `healthcheck` and load-balancers.
   * Not behind auth — must be publicly accessible.
   */
  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Liveness check' })
  health(): { status: string; timestamp: string } {
    return this.appService.health();
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Welcome root check' })
  getHello(): string {
    return this.appService.getHello();
  }
}
