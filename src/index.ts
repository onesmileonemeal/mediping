import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { createServer } from 'http';
import { router as apiRouter } from './routes/index.js';
import { errorHandler } from './middleware/error.js';

const isPretty = process.env.LOG_PRETTY === 'true';
const logger = pino(isPretty ? { transport: { target: 'pino-pretty' } } : {});

const app = express();
app.use(cors());
app.use(express.json());
app.use(pinoHttp({ logger }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'medical-reminder-backend' });
});

app.use('/api', apiRouter);

// Error handling last
app.use(errorHandler);

const port = Number(process.env.PORT ?? 4000);
const server = createServer(app);
server.listen(port, () => {
  logger.info({ port }, 'Server listening');
});
