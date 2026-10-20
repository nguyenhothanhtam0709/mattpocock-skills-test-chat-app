import { Logger } from '@nestjs/common';
import { createApp } from './app.js';
import { loadConfig } from './config/config.js';

const config = loadConfig(process.env);
const app = await createApp(process.env);
await app.listen(config.PORT, config.HOST);
new Logger('Bootstrap').log(`API listening on http://${config.HOST}:${config.PORT}/api/v1`);
