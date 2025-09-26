import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db.js';

export const router = Router();

const genderEnum = z.enum(['male','female','other']);
const roleEnum = z.enum(['patient','doctor','admin']);

const profileSchema = z.object({
  id: z.string().uuid(),
  mobile_number: z.string().min(5),
  name: z.string().min(1),
  age: z.number().int().positive(),
  gender: genderEnum,
  role: roleEnum,
  is_deleted: z.boolean().optional()
});

router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      'select id, mobile_number, name, age, gender, role, is_deleted, created_at, updated_at from public.profiles where is_deleted = false order by created_at desc'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      'select id, mobile_number, name, age, gender, role, is_deleted, created_at, updated_at from public.profiles where id=$1',
      [id]
    );
    if (rows.length === 0) return res.sendStatus(404);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const body = profileSchema.parse(req.body);
    const { rows } = await pool.query(
      'insert into public.profiles(id, mobile_number, name, age, gender, role, is_deleted) values($1,$2,$3,$4,$5,$6,coalesce($7,false)) returning id, mobile_number, name, age, gender, role, is_deleted, created_at, updated_at',
      [body.id, body.mobile_number, body.name, body.age, body.gender, body.role, body.is_deleted]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const body = profileSchema.partial({ id: true }).parse(req.body);
    const { id } = req.params;
    const { rows } = await pool.query(
      `update public.profiles set
        mobile_number = coalesce($1, mobile_number),
        name = coalesce($2, name),
        age = coalesce($3, age),
        gender = coalesce($4, gender),
        role = coalesce($5, role),
        is_deleted = coalesce($6, is_deleted),
        updated_at = now()
       where id=$7
       returning id, mobile_number, name, age, gender, role, is_deleted, created_at, updated_at`,
      [body.mobile_number ?? null, body.name ?? null, body.age ?? null, body.gender ?? null, body.role ?? null, body.is_deleted ?? null, id]
    );
    if (rows.length === 0) return res.sendStatus(404);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

