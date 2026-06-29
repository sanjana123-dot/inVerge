import http from 'http';
import app from './app';
import { env } from './config/env';
import { disconnectDatabase } from './config/database';
import { initSockets } from './sockets';

const server = http.createServer(app);
initSockets(server);

server.listen(env.PORT, () => {
  console.log(`INverge API running on port ${env.PORT} [${env.NODE_ENV}]`);
});

const shutdown = async (signal: string) => {
  console.log(`${signal} received — closing server`);
  server.close(async () => {
    await disconnectDatabase();
    process.exit(0);
  });
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
