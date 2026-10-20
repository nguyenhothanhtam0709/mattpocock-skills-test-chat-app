import { Controller, Get, UseGuards } from '@nestjs/common';
import type { MeResponse } from '@chat/contracts';
import { Auth, AuthGuard, type AuthContext } from './auth.guard.js';
import { AuthService } from './auth.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly auth: AuthService) {}

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@Auth() auth: AuthContext): Promise<MeResponse> {
    return { user: await this.auth.getUser(auth.userId) };
  }
}
