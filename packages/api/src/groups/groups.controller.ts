import { Body, Controller, Delete, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import {
  AddGroupMemberRequestSchema,
  CreateGroupRequestSchema,
  type AddGroupMemberRequest,
  type GroupMembershipResponse,
  type CreateGroupRequest,
  type CreateGroupResponse,
} from '@chat/contracts';
import { Auth, AuthGuard, type AuthContext } from '../auth/auth.guard.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { z } from 'zod';
import { MessagesService } from '../messages/messages.service.js';

const IdPipe = new ZodValidationPipe(z.uuid());

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

  /** Owner only; the User is a Member at once. */
  @Post(':id/members')
  @HttpCode(201)
  @UseGuards(AuthGuard)
  addMember(
    @Auth() auth: AuthContext,
    @Param('id', IdPipe) groupId: string,
    @Body(new ZodValidationPipe(AddGroupMemberRequestSchema)) body: AddGroupMemberRequest,
  ): Promise<GroupMembershipResponse> {
    return this.messages.addGroupMember(auth.userId, groupId, body.userId);
  }

  /** Owner only; the Owner cannot remove themselves. */
  @Delete(':id/members/:userId')
  @UseGuards(AuthGuard)
  removeMember(
    @Auth() auth: AuthContext,
    @Param('id', IdPipe) groupId: string,
    @Param('userId', IdPipe) userId: string,
  ): Promise<GroupMembershipResponse> {
    return this.messages.removeGroupMember(auth.userId, groupId, userId);
  }
}
