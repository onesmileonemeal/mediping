import 'dotenv/config';
import pino from 'pino';
import { pool } from '../db.js';

const isPretty = process.env.LOG_PRETTY === 'true';
const logger = pino(isPretty ? { transport: { target: 'pino-pretty' } } : {});

async function runOnce() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: due } = await client.query(
      `select id from public.reminder_schedule
       where status in ('pending','in_progress') and scheduled_time <= now()
       order by scheduled_time asc
       limit 50
       for update skip locked`
    );
    for (const row of due) {
      const scheduleId: string = row.id;
      // mark in progress
      await client.query("update public.reminder_schedule set status='in_progress' where id=$1", [scheduleId]);
      // Simulate send via log; in real system, integrate WhatsApp/SMS provider here
      logger.info({ scheduleId }, 'Sending reminder');
      // mark sent
      await client.query("update public.reminder_schedule set status='sent' where id=$1", [scheduleId]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error(err);
  } finally {
    client.release();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const intervalMs = 5000;
  logger.info({ intervalMs }, 'Reminder worker started');
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  setInterval(runOnce, intervalMs);
}

export { runOnce };
