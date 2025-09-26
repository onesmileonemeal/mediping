import { Router } from 'express';
import { router as drugsRouter } from './modules/drugs.js';
import { router as allergiesRouter } from './modules/allergies.js';
import { router as specializationsRouter } from './modules/specializations.js';
import { router as profilesRouter } from './modules/profiles.js';
import { router as patientsRouter } from './modules/patients.js';
import { router as doctorsRouter } from './modules/doctors.js';
import { router as medicalHistoryRouter } from './modules/medical-history.js';
import { router as prescriptionsRouter } from './modules/prescriptions.js';
import { router as remindersRouter } from './modules/reminders.js';

export const router = Router();

router.use('/drugs', drugsRouter);
router.use('/allergies', allergiesRouter);
router.use('/specializations', specializationsRouter);
router.use('/profiles', profilesRouter);
router.use('/patients', patientsRouter);
router.use('/doctors', doctorsRouter);
router.use('/medical-history', medicalHistoryRouter);
router.use('/prescriptions', prescriptionsRouter);
router.use('/reminders', remindersRouter);
