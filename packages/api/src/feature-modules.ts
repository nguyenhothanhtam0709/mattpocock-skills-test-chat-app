import { AuthApiModule } from './auth/auth-api.module.js';
import { GroupsModule } from './groups/groups.module.js';
import { HealthModule } from './health/health.module.js';
import { MessagesModule } from './messages/messages.module.js';

/**
 * The feature modules that serve HTTP routes. `AppModule` imports them and the routes doc
 * (`docs/generate-docs.ts`) is rendered from them, so a module added here shows up in both.
 */
export const FEATURE_MODULES = [HealthModule, AuthApiModule, MessagesModule, GroupsModule];
