import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import {
  CreateGroupRequestSchema,
  type CreateGroupRequest,
  type CreateGroupResponse,
} from '@chat/contracts';
import { Auth, AuthGuard, type AuthContext } from '../auth/auth.guard.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { MessagesService } from '../messages/messages.service.js';

@Controller('groups')
export class GroupsController {
  constructor(private readonly messages: MessagesService) {}

  /** The caller becomes the Owner and a Member; `memberIds` are the other initial Members. */
  @Post()
  @HttpCode(201)
  @UseGuards(AuthGuard)
  create(
    @Auth() auth: AuthContext,
    @Body(new ZodValidationPipe(CreateGroupRequestSchema)) body: CreateGroupRequest,
  ): Promise<CreateGroupResponse> {
    return this.messages.createGroup(auth.userId, body);
  }
}
