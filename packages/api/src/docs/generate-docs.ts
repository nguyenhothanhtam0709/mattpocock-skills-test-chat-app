// Wires the API's real sources into its generators. Thin and untested on purpose; the root
// `pnpm docs:generate` script calls it from the built `dist/` and writes the files.
import { API_PREFIX } from '../app.js';
import * as schema from '../db/schema.js';
import { FEATURE_MODULES } from '../feature-modules.js';
import { renderErDiagram } from './er-diagram.js';
import { renderRoutes } from './routes.js';

export function generateApiDocs(): { erDiagram: string; routes: string } {
  return {
    erDiagram: renderErDiagram(schema),
    routes: renderRoutes(FEATURE_MODULES, { globalPrefix: API_PREFIX }),
  };
}
