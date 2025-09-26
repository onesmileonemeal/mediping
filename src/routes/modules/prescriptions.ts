import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db.js';
import { withTransaction } from '../../db.js';
import { computeScheduleUtcTimestamps } from '../../utils/schedule.js';

export const router = Router();

const drugItemSchema = z.object({
  drug_id: z.string().uuid(),
  dosage: z.string().min(1),
  frequency: z.string().min(1),
  duration_days: z.number().int().positive(),
  drug_notes: z.string().optional().nullable(),
  reminder_plan: z.object({ times: z.array(z.string().regex(/^\d{2}:\d{2}$/)), startDate: z.string().optional() }).optional()
});

const createPrescriptionSchema = z.object({
  patient_id: z.string().uuid(),
  doctor_id: z.string().uuid(),
  general_notes: z.string().optional().nullable(),
  is_completed: z.boolean().optional(),
  drugs: z.array(drugItemSchema).min(1)
});

router.get('/', async (req, res, next) => {
  try {
    const { patient_id } = req.query as { patient_id?: string };
    const params: any[] = [];
    let where = '';
    if (patient_id) { where = 'where r.patient_id = $1'; params.push(patient_id); }
    const { rows } = await pool.query(
      `select r.id, r.patient_id, r.doctor_id, r.general_notes, r.is_completed, r.prescribed_on
       from public.prescription_records r ${where}
       order by r.prescribed_on desc`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `select r.id, r.patient_id, r.doctor_id, r.general_notes, r.is_completed, r.prescribed_on
       from public.prescription_records r where r.id=$1`,
      [id]
    );
    if (rows.length === 0) return res.sendStatus(404);
    const header = rows[0];
    const { rows: items } = await pool.query(
      `select d.id, d.drug_id, g.name as drug_name, d.dosage, d.frequency, d.duration_days, d.drug_notes
       from public.prescription_drugs d
       join public.drugs g on g.id = d.drug_id
       where d.record_id = $1
       order by g.name asc`,
      [id]
    );
    res.json({ ...header, drugs: items });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const body = createPrescriptionSchema.parse(req.body);
    const result = await withTransaction(async (client) => {
      const { rows: recRows } = await client.query(
        `insert into public.prescription_records(patient_id, doctor_id, general_notes, is_completed)
         values($1,$2,$3,coalesce($4,false))
         returning id, patient_id, doctor_id, general_notes, is_completed, prescribed_on`,
        [body.patient_id, body.doctor_id, body.general_notes ?? null, body.is_completed ?? false]
      );
      const record = recRows[0];

      const { rows: patientRows } = await client.query('select timezone_offset from public.patients where patient_id=$1', [body.patient_id]);
      if (patientRows.length === 0) throw new Error('patient_not_found');
      const tzOffset = patientRows[0].timezone_offset as number;

      const insertedDrugs: any[] = [];
      for (const item of body.drugs) {
        const { rows: drugRows } = await client.query(
          `insert into public.prescription_drugs(record_id, drug_id, dosage, frequency, duration_days, drug_notes)
           values($1,$2,$3,$4,$5,$6)
           returning id, record_id, drug_id, dosage, frequency, duration_days, drug_notes`,
          [record.id, item.drug_id, item.dosage, item.frequency, item.duration_days, item.drug_notes ?? null]
        );
        const drug = drugRows[0];
        insertedDrugs.push(drug);

        if (item.reminder_plan && item.reminder_plan.times.length > 0) {
          const timestamps = computeScheduleUtcTimestamps(tzOffset, item.duration_days, {
            times: item.reminder_plan.times,
            startDate: item.reminder_plan.startDate
          });
          for (const ts of timestamps) {
            await client.query(
              `insert into public.reminder_schedule(prescription_drug_id, scheduled_time) values($1, $2)`,
              [drug.id, ts.toISOString()]
            );
          }
        }
      }
      return { record, drugs: insertedDrugs };
    });
    res.status(201).json(result);
  } catch (err) { next(err); }
});

router.patch('/:id/complete', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      'update public.prescription_records set is_completed = true where id=$1 returning id, is_completed',
      [id]
    );
    if (rows.length === 0) return res.sendStatus(404);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

