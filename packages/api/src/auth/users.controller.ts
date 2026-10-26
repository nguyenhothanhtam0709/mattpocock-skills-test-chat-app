import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import {
  SearchUsersQuerySchema,
  UpdateProfileRequestSchema,
  type MeResponse,
  type SearchUsersQuery,
  type SearchUsersResponse,
  type UpdateProfileRequest,
} from '@chat/contracts';
import { SearchThrottlerGuard } from '../throttling/app-throttler.guard.js';
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

  /** Username-prefix search; rate limited to 30 per minute per User (see `ThrottlingModule`). */
  @Get('search')
  @UseGuards(AuthGuard, SearchThrottlerGuard)
  async search(
    @Auth() auth: AuthContext,
    @Query(new ZodValidationPipe(SearchUsersQuerySchema)) query: SearchUsersQuery,
  ): Promise<SearchUsersResponse> {
    return { users: await this.auth.searchUsers(auth.userId, query.q) };
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
