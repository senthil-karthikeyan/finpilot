import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'viewer@finpilot.test',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'A valid email address is required.' })
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    example: 'Viewer#2026',
    description: 'User account password',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1, { message: 'Password is required.' })
  password!: string;
}

