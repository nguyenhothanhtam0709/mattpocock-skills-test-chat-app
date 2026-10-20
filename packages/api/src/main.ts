import { createApp } from './app.js';
import { loadConfig } from './config/config.js';

const config = loadConfig(process.env);
const app = await createApp(process.env);
await app.listen(config.PORT, config.HOST);
console.log(`API listening on http://${config.HOST}:${config.PORT}/api/v1`);
