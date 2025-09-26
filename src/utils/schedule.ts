import { DateTime } from 'luxon';

export type ReminderPlan = {
  times: string[]; // array of HH:mm in patient's local time
  startDate?: string; // YYYY-MM-DD in patient's local time
};

export function computeScheduleUtcTimestamps(
  patientTimezoneOffsetMinutes: number,
  durationDays: number,
  plan: ReminderPlan
): Date[] {
  const times = plan.times;
  if (!Array.isArray(times) || times.length === 0) return [];
  const startLocal = plan.startDate
    ? DateTime.fromISO(plan.startDate, { zone: `UTC${formatOffset(patientTimezoneOffsetMinutes)}` })
    : DateTime.now().setZone(`UTC${formatOffset(patientTimezoneOffsetMinutes)}`).startOf('day');

  const results: Date[] = [];
  for (let dayIndex = 0; dayIndex < durationDays; dayIndex++) {
    for (const hhmm of times) {
      const [hh, mm] = hhmm.split(':').map((s) => Number(s));
      const localTime = startLocal.plus({ days: dayIndex }).set({ hour: hh, minute: mm, second: 0, millisecond: 0 });
      const asUtc = localTime.setZone('UTC');
      results.push(asUtc.toJSDate());
    }
  }
  return results.sort((a, b) => a.getTime() - b.getTime());
}

function formatOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const hours = Math.floor(abs / 60).toString().padStart(2, '0');
  const minutes = (abs % 60).toString().padStart(2, '0');
  return `${sign}${hours}:${minutes}`;
}
