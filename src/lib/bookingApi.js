import { isPublicBookingKey, normalizeBookingUrl } from './bookingConfig';
const url=normalizeBookingUrl(import.meta.env.VITE_SUPABASE_URL);
const key=import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
export const bookingConfigured=Boolean(url&&isPublicBookingKey(key));
export const bookingProject=url||'unconfigured';
export class BookingError extends Error {constructor(code){super(code);this.code=code;}}
async function rpc(name,args,signal){
 if(!bookingConfigured)throw new BookingError('NOT_CONFIGURED');
 const headers={'Content-Type':'application/json',apikey:key};
 if(!key.startsWith('sb_publishable_'))headers.Authorization=`Bearer ${key}`;
 const controller=new AbortController();
 const abort=()=>controller.abort();
 signal?.addEventListener('abort',abort,{once:true});
 if(signal?.aborted)controller.abort();
 const timeout=setTimeout(abort,15000);
 try{
   const response=await fetch(`${url}/rest/v1/rpc/${name}`,{method:'POST',headers,body:JSON.stringify(args),signal:controller.signal});
   let data;try{data=await response.json();}catch{throw new BookingError('NETWORK');}
   if(!response.ok){const known=['SLOT_TAKEN','INVALID_TIME','INVALID_SERVICE','INVALID_REQUEST'];throw new BookingError(known.find(c=>data?.message===c)||'UNAVAILABLE');}
   return data;
 }catch(error){
   if(signal?.aborted)throw new DOMException('Request cancelled','AbortError');
   if(error instanceof BookingError)throw error;
   throw new BookingError('NETWORK');
 }finally{clearTimeout(timeout);signal?.removeEventListener('abort',abort);}

}
function validPeriod(row){
 return typeof row?.starts_at==='string'&&typeof row?.ends_at==='string'&&Number.isFinite(Date.parse(row.starts_at))&&Date.parse(row.ends_at)>Date.parse(row.starts_at);
}
export async function getAvailability({barber,service,date,signal}){
 const data=await rpc('wm_availability',{p_barber:barber,p_service:service,p_day:date},signal);
 if(!Array.isArray(data)||data.some(s=>!validPeriod(s)||typeof s.available!=='boolean'))throw new BookingError('UNAVAILABLE');
 return data;
}
export async function reserveBooking({requestId,barber,service,start}){
 const data=await rpc('wm_reserve',{p_request_id:requestId,p_barber:barber,p_service:service,p_start:start});
 if(data?.id!==requestId||data.barber_id!==barber||data.service_id!==service||!Number.isInteger(data.price_cents)||data.price_cents<0||typeof data.service_name!=='string'||!data.service_name.trim()||!validPeriod(data)||Date.parse(data.starts_at)!==Date.parse(start))throw new BookingError('UNAVAILABLE');
 return data;
}
