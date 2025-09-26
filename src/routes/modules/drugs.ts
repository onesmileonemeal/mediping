import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db.js';

export const router = Router();

const upsertSchema = z.object({ name: z.string().min(1) });

router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query('select id, name from public.drugs order by name asc');
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const body = upsertSchema.parse(req.body);
    const { rows } = await pool.query(
      'insert into public.drugs(name) values($1) returning id, name',
      [body.name]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const body = upsertSchema.parse(req.body);
    const { id } = req.params;
    const { rows } = await pool.query(
      'update public.drugs set name=$1 where id=$2 returning id, name',
      [body.name, id]
    );
    if (rows.length === 0) return res.sendStatus(404);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query('delete from public.drugs where id=$1', [id]);
    if (result.rowCount === 0) return res.sendStatus(404);
    res.sendStatus(204);
  } catch (err) { next(err); }
});

