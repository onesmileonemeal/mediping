import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db.js';

export const router = Router();

const doctorSchema = z.object({
  doctor_id: z.string().uuid(),
  licence_number: z.string().min(3),
  specialization_id: z.string().uuid(),
  clinic_address: z.string().optional().nullable()
});

router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `select d.doctor_id, f.name, f.mobile_number, d.licence_number, d.specialization_id, s.name as specialization_name, d.clinic_address
       from public.doctors d
       join public.profiles f on f.id = d.doctor_id
       join public.specializations s on s.id = d.specialization_id
       where f.is_deleted = false
       order by f.name asc`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const body = doctorSchema.parse(req.body);
    const { rows } = await pool.query(
      `insert into public.doctors(doctor_id, licence_number, specialization_id, clinic_address)
       values($1,$2,$3,$4)
       returning doctor_id, licence_number, specialization_id, clinic_address`,
      [body.doctor_id, body.licence_number, body.specialization_id, body.clinic_address ?? null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const body = doctorSchema.partial({ doctor_id: true }).parse(req.body);
    const { id } = req.params;
    const { rows } = await pool.query(
      `update public.doctors set
        licence_number = coalesce($1, licence_number),
        specialization_id = coalesce($2, specialization_id),
        clinic_address = coalesce($3, clinic_address)
       where doctor_id=$4
       returning doctor_id, licence_number, specialization_id, clinic_address`,
      [body.licence_number ?? null, body.specialization_id ?? null, body.clinic_address ?? null, id]
    );
    if (rows.length === 0) return res.sendStatus(404);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

