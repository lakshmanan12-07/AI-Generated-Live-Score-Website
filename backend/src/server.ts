
import http from 'http';
import { PORT } from './config/env';
import { connectDB } from './db/mongoose';
import { createApp } from './app';
import { initSocket } from './sockets';

async function bootstrap() {
  await connectDB();
  const app = createApp();
  const server = http.createServer(app);
  initSocket(server);

  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to bootstrap server', err);
});
