/** Time helpers for StudyFlow. All civil dates are Asia/Ho_Chi_Minh (UTC+07). */
export const APP_TIMEZONE = 'Asia/Ho_Chi_Minh';
export function localDay(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}
export function dayPlus(date: string, days: number): string {
  const day = new Date(`${date}T12:00:00+07:00`);
  if (!Number.isFinite(day.getTime())) throw new Error('Ngày không hợp lệ');
  return localDay(new Date(day.getTime() + days * 86400000));
}
export function parseSlot(date: string, time: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new Error('Ngày hoặc giờ không hợp lệ');
  }
  const result = new Date(`${date}T${time}:00+07:00`);
  if (!Number.isFinite(result.getTime()) || localDay(result) !== date) throw new Error('Ngày không hợp lệ');
  return result;
}
export function slotEnd(start: Date, minutes: number): Date {
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 1440) throw new Error('Thời lượng phải từ 1 tới 1440 phút');
  return new Date(start.getTime() + minutes * 60000);
}
export function hourMinute(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {timeZone: APP_TIMEZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(date);
}
export interface TimeInterval { start: number; end: number; id?: string; status?: string }
export function hasOverlap(start: number, end: number, items: TimeInterval[], exceptId?: string): boolean {
  if (!(end > start)) throw new Error('Khoảng thời gian phải có kết thúc sau bắt đầu');
  return items.some(item => (exceptId === undefined || item.id !== exceptId) && item.status !== 'cancelled' && item.status !== 'rescheduled' && start < item.end && item.start < end);
}
export function nextFreeSlot(date: string, duration: number, intervals: TimeInterval[]): string | null {
  for (let minute = 8 * 60; minute + duration <= 22 * 60; minute += 15) {
    const time = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
    const start = parseSlot(date, time).getTime();
    if (!hasOverlap(start, start + duration * 60000, intervals)) return time;
  }
  return null;
}
