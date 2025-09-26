import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'validation_error', details: err.flatten() });
  }
  const anyErr = err as any;
  if (anyErr && anyErr.code === '23505') {
    return res.status(409).json({ error: 'conflict', detail: anyErr.detail });
  }
  if (anyErr && anyErr.code) {
    return res.status(400).json({ error: 'db_error', code: anyErr.code, detail: anyErr.detail });
  }
  console.error(err);
  res.status(500).json({ error: 'internal_server_error' });
}
