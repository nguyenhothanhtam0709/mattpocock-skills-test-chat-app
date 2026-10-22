import { Module } from '@nestjs/common';
import { GroupMemberships } from './group-memberships.js';

@Module({ providers: [GroupMemberships], exports: [GroupMemberships] })
export class MembershipsModule {}
