import { describe, expect, it } from 'vitest';
import { AuthApiModule } from '../auth/auth-api.module.js';
import { GroupsModule } from '../groups/groups.module.js';
import { HealthModule } from '../health/health.module.js';
import { MessagesModule } from '../messages/messages.module.js';
import { renderRoutes } from './routes.js';

describe('HTTP routes doc', () => {
  const markdown = renderRoutes([HealthModule, AuthApiModule, MessagesModule, GroupsModule], {
    globalPrefix: 'api/v1',
  });

  it('declares itself generated', () => {
    expect(markdown).toMatch(
      /^---\nkind: generated\ngenerator: packages\/api\/src\/docs\/routes\.ts\nsource: packages\/api\/src\/\*\*\/\*\.controller\.ts\n---\n/,
    );
    expect(markdown).toContain('Do not edit');
  });

  it('lists method, full path, auth and handler of each route, without booting the app', () => {
    expect(markdown).toContain('| GET | `/api/v1/health` | no | `HealthController.check` |');
    expect(markdown).toContain(
      '| POST | `/api/v1/auth/register` | no | `AuthController.register` |',
    );
    expect(markdown).toContain('| POST | `/api/v1/auth/logout` | yes | `AuthController.logout` |');
    expect(markdown).toContain('| PATCH | `/api/v1/users/me` | yes | `UsersController.updateMe` |');
    expect(markdown).toContain(
      '| GET | `/api/v1/conversations/:id/messages` | yes | `MessagesController.',
    );
    expect(markdown).toContain(
      '| DELETE | `/api/v1/groups/:id/members/:userId` | yes | `GroupsController.',
    );
  });

  it('sorts routes by path regardless of the order the modules are given', () => {
    const reversed = renderRoutes([GroupsModule, MessagesModule, AuthApiModule, HealthModule], {
      globalPrefix: 'api/v1',
    });
    expect(reversed).toBe(markdown);
    expect(markdown.indexOf('/api/v1/auth/login')).toBeLessThan(markdown.indexOf('/api/v1/health'));
    expect(markdown.indexOf('/api/v1/health')).toBeLessThan(markdown.indexOf('/api/v1/users/me'));
  });
});
