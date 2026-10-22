import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { AuthModule } from './auth.module.js';
import { AuthController } from './auth.controller.js';
import { UsersController } from './users.controller.js';

/** The auth and users HTTP routes. Logout revokes the session's sockets, hence Realtime. */
@Module({
  imports: [AuthModule, RealtimeModule],
  controllers: [AuthController, UsersController],
})
export class AuthApiModule {}
