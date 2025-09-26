import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db.js';

export const router = Router();

const patientSchema = z.object({
  patient_id: z.string().uuid(),
  emergency_contact: z.string().min(3),
  insurance_type: z.string().optional().nullable(),
  blood_group: z.string().optional().nullable(),
  timezone_offset: z.number().int()
});

router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `select p.patient_id, f.name, f.mobile_number, p.emergency_contact, p.insurance_type, p.blood_group, p.timezone_offset, p.updated_at
       from public.patients p
       join public.profiles f on f.id = p.patient_id
       where f.is_deleted = false
       order by f.name asc`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const body = patientSchema.parse(req.body);
    const { rows } = await pool.query(
      `insert into public.patients(patient_id, emergency_contact, insurance_type, blood_group, timezone_offset)
       values($1,$2,$3,$4,$5)
       returning patient_id, emergency_contact, insurance_type, blood_group, timezone_offset, updated_at`,
      [body.patient_id, body.emergency_contact, body.insurance_type ?? null, body.blood_group ?? null, body.timezone_offset]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const body = patientSchema.partial({ patient_id: true }).parse(req.body);
    const { id } = req.params;
    const { rows } = await pool.query(
      `update public.patients set
        emergency_contact = coalesce($1, emergency_contact),
        insurance_type = coalesce($2, insurance_type),
        blood_group = coalesce($3, blood_group),
        timezone_offset = coalesce($4, timezone_offset),
        updated_at = now()
       where patient_id=$5
       returning patient_id, emergency_contact, insurance_type, blood_group, timezone_offset, updated_at`,
      [body.emergency_contact ?? null, body.insurance_type ?? null, body.blood_group ?? null, body.timezone_offset ?? null, id]
    );
    if (rows.length === 0) return res.sendStatus(404);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// Manage allergies for a patient
router.get('/:id/allergies', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `select a.id, a.name
       from public.patient_allergies pa
       join public.allergies_master a on a.id = pa.allergy_id
       where pa.patient_id = $1
       order by a.name asc`,
      [id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/:id/allergies', async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = z.object({ allergy_id: z.string().uuid() }).parse(req.body);
    await pool.query(
      'insert into public.patient_allergies(patient_id, allergy_id) values($1,$2) on conflict do nothing',
      [id, body.allergy_id]
    );
    res.sendStatus(204);
  } catch (err) { next(err); }
});

router.delete('/:id/allergies/:allergyId', async (req, res, next) => {
  try {
    const { id, allergyId } = req.params;
    const result = await pool.query(
      'delete from public.patient_allergies where patient_id=$1 and allergy_id=$2',
      [id, allergyId]
    );
    if (result.rowCount === 0) return res.sendStatus(404);
    res.sendStatus(204);
  } catch (err) { next(err); }
});

