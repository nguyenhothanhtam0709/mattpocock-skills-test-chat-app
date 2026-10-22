import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { CommitOrder } from './commit-order.js';
import { ConversationQueries } from './conversation-queries.js';
import { MessagesController } from './messages.controller.js';
import { MessagesService } from './messages.service.js';

@Module({
  imports: [RealtimeModule, AuthModule],
  controllers: [MessagesController],
  providers: [MessagesService, CommitOrder, ConversationQueries],
  exports: [MessagesService, CommitOrder, ConversationQueries],
})
export class MessagesModule {}
