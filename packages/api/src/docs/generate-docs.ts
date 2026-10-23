// Wires the API's real sources into its generators. Thin and untested on purpose; the root
// `pnpm docs:generate` script calls it from the built `dist/` and writes the files.
import { API_PREFIX } from '../app.js';
import { AuthApiModule } from '../auth/auth-api.module.js';
import * as schema from '../db/schema.js';
import { GroupsModule } from '../groups/groups.module.js';
import { HealthModule } from '../health/health.module.js';
import { MessagesModule } from '../messages/messages.module.js';
import { renderErDiagram } from './er-diagram.js';
import { renderRoutes } from './routes.js';

export function generateApiDocs(): { erDiagram: string; routes: string } {
  return {
    erDiagram: renderErDiagram(schema),
    routes: renderRoutes([HealthModule, AuthApiModule, MessagesModule, GroupsModule], {
      globalPrefix: API_PREFIX,
    }),
  };
}
