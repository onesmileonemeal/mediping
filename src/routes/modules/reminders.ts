import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db.js';

export const router = Router();

router.get('/schedule', async (req, res, next) => {
  try {
    const { drug_id, status } = req.query as { drug_id?: string; status?: string };
    const params: any[] = [];
    let where = '';
    if (drug_id) { params.push(drug_id); where += (where ? ' and ' : ' where ') + `s.prescription_drug_id = $${params.length}`; }
    if (status) { params.push(status); where += (where ? ' and ' : ' where ') + `s.status = $${params.length}`; }
    const { rows } = await pool.query(
      `select s.id, s.prescription_drug_id, s.scheduled_time, s.status, s.intake_confirmed_at, s.created_at
       from public.reminder_schedule s ${where}
       order by s.scheduled_time asc`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/schedule/:id/confirm', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `update public.reminder_schedule set status='completed', intake_confirmed_at = now() where id=$1
       returning id, status, intake_confirmed_at`,
      [id]
    );
    if (rows.length === 0) return res.sendStatus(404);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

const attemptSchema = z.object({
  schedule_id: z.string().uuid(),
  channel: z.enum(['whatsapp','gsm']),
  result: z.enum(['success','failure','read','no_response'])
});

router.post('/attempts', async (req, res, next) => {
  try {
    const body = attemptSchema.parse(req.body);
    const { rows } = await pool.query(
      `insert into public.reminder_attempts(schedule_id, channel, result)
       values($1,$2,$3)
       returning id, schedule_id, channel, result, attempted_at`,
      [body.schedule_id, body.channel, body.result]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

