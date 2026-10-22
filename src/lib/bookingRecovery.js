import { serviceId } from './bookingCatalog.js';
import { validDate, todayAtShop } from './bookingTime.js';

const key=(project,barber)=>`wm.pending-booking:${project}:${barber}`;
export function readPendingBooking(project,barber,storage){
  try{
    const value=JSON.parse((storage||globalThis.sessionStorage)?.getItem(key(project,barber))||'null');
    if(!value||!/^\d+$/.test(value.selection)||!serviceId(value.selection)||serviceId(value.selection)!==value.service||
       value.barber!==barber||!validDate(value.date)||!Number.isFinite(Date.parse(value.start))||
       todayAtShop(new Date(value.start))!==value.date||
       !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.requestId))return null;
    return value;
  }catch{return null;}
}
export function savePendingBooking(project,attempt,storage){
  try{(storage||globalThis.sessionStorage)?.setItem(key(project,attempt.barber),JSON.stringify(attempt));}catch{/* In-memory recovery still works when storage is unavailable. */}
}
export function clearPendingBooking(project,barber,storage){
  try{(storage||globalThis.sessionStorage)?.removeItem(key(project,barber));}catch{/* Storage may be disabled by the browser. */}
}
