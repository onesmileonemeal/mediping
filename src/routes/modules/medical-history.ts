import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db.js';

export const router = Router();

const historySchema = z.object({
  patient_id: z.string().uuid(),
  record_date: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'invalid date'),
  icd_code: z.string().optional().nullable(),
  diagnosis: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
});

router.get('/', async (req, res, next) => {
  try {
    const { patient_id } = req.query as { patient_id?: string };
    const params: any[] = [];
    let where = '';
    if (patient_id) { where = 'where m.patient_id = $1'; params.push(patient_id); }
    const { rows } = await pool.query(
      `select m.id, m.patient_id, m.record_date, m.icd_code, m.diagnosis, m.notes, m.created_at
       from public.medical_history m ${where}
       order by m.record_date desc, m.created_at desc`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const body = historySchema.parse(req.body);
    const { rows } = await pool.query(
      `insert into public.medical_history(patient_id, record_date, icd_code, diagnosis, notes)
       values($1,$2,$3,$4,$5)
       returning id, patient_id, record_date, icd_code, diagnosis, notes, created_at`,
      [body.patient_id, body.record_date, body.icd_code ?? null, body.diagnosis ?? null, body.notes ?? null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const body = historySchema.partial({ patient_id: true, record_date: true }).parse(req.body);
    const { id } = req.params;
    const { rows } = await pool.query(
      `update public.medical_history set
        icd_code = coalesce($1, icd_code),
        diagnosis = coalesce($2, diagnosis),
        notes = coalesce($3, notes)
       where id=$4
       returning id, patient_id, record_date, icd_code, diagnosis, notes, created_at`,
      [body.icd_code ?? null, body.diagnosis ?? null, body.notes ?? null, id]
    );
    if (rows.length === 0) return res.sendStatus(404);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query('delete from public.medical_history where id=$1', [id]);
    if (result.rowCount === 0) return res.sendStatus(404);
    res.sendStatus(204);
  } catch (err) { next(err); }
});

