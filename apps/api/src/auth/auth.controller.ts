import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser } from '@finpilot/shared';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { Public } from './decorators/public.decorator.js';
import { CurrentUser } from './decorators/current-user.decorator.js';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 900_000 } }) // 10 attempts per 15 minutes
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user with email and password' })
  @ApiOkResponse({ description: 'Authentication successful. Returns access token and user profile in JSON body.' })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password.' })
  async login(@Body() dto: LoginDto) {
    const user = await this.authService.validateUser(dto.email, dto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const { token, user: authUser } = await this.authService.login(user);

    // Return the access token in the JSON body. Do not set cookies on the API server.
    return {
      accessToken: token,
      token,
      user: authUser,
    };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout notification endpoint' })
  @ApiOkResponse({ description: 'Logged out successfully.' })
  logout() {
    return { message: 'Logged out successfully.' };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiOkResponse({ description: 'Authenticated user profile.' })
  getProfile(@CurrentUser() user: AuthUser) {
    return { user };
  }
}
