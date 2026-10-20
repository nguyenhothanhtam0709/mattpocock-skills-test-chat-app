import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  UpdateProfileRequestSchema,
  type MeResponse,
  type UpdateProfileRequest,
} from '@chat/contracts';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
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

  /** Sets or clears the Nickname; the only profile field that can change. */
  @Patch('me')
  @UseGuards(AuthGuard)
  async updateMe(
    @Auth() auth: AuthContext,
    @Body(new ZodValidationPipe(UpdateProfileRequestSchema)) body: UpdateProfileRequest,
  ): Promise<MeResponse> {
    return { user: await this.auth.updateNickname(auth.userId, body.nickname) };
  }
}
