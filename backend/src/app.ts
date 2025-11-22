
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { CORS_ORIGIN } from './config/env';
import apiRouter from './routes';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(morgan('dev'));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api', apiRouter);

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
  });

  return app;
}
