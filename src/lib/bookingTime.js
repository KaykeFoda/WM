// All booking dates are civil dates in the barbershop's time zone.
export const bookingTimeZone = 'America/Sao_Paulo';
export function todayAtShop(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone:bookingTimeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const part = type => parts.find(p=>p.type===type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function validDate(date) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(date+'T12:00:00Z');
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0,10)===date;
}
export function isOpenDay(date) {
  if(!validDate(date)) return false;
  const day = new Date(date+'T12:00:00Z').getUTCDay();
  return day >= 2 && day <= 6;
}
export function formatBookingDate(date) {
  return validDate(date) ? new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(date+'T12:00:00Z')) : '';
}
export function shopTime(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB',{timeZone:bookingTimeZone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
  return `${parts.find(p=>p.type==='hour').value}:${parts.find(p=>p.type==='minute').value}`;
}
export function addBookingDays(date, days) {
  const value=new Date(date+'T12:00:00Z');
  value.setUTCDate(value.getUTCDate()+days);
  return value.toISOString().slice(0,10);
}
