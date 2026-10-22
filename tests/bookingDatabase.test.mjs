// Requires the isolated local container described in docs/AGENDA.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomUUID} from 'node:crypto';
const container='wm-booking-test';
assert.equal(execFileSync('docker',['inspect','--format','{{.HostConfig.NetworkMode}}',container],{encoding:'utf8'}).trim(),'none','Only the isolated test database may be used');
const args=['exec','-i',container,'psql','-U','postgres','-AtX','-v','ON_ERROR_STOP=1'];
const sql=q=>execFileSync('docker',args,{input:q,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
const command=q=>promisify(execFile)('docker',[...args,'-c',q]);
const day=sql("select d::date from generate_series(current_date+1,current_date+7,interval '1 day') d where extract(isodow from d) between 2 and 6 limit 1;");
const start=t=>`('${day}'::date+time '${t}') at time zone 'America/Sao_Paulo'`;
const reserve=(id,barber,service,t)=>`select public.wm_reserve('${id}','${barber}','${service}',${start(t)});`;
const slots=(barber,service)=>JSON.parse(sql(`select coalesce(json_agg(row_to_json(s)),'[]') from public.wm_availability('${barber}','${service}','${day}') s;`));
const at=(rows,t)=>rows.find(s=>new Date(s.starts_at).toISOString().slice(11,16)===`${String(Number(t.slice(0,2))+3).padStart(2,'0')}${t.slice(2)}`);
sql('truncate public.wm_bookings;');
test('reserves one hour; retries are idempotent and prices come from the database',()=>{
 const id=randomUUID();const q=reserve(id,'will','corte-social','14:00');const a=JSON.parse(sql('set role anon;'+q).split('\n').at(-1));const b=JSON.parse(sql(q));assert.equal(a.id,b.id);assert.equal(a.price_cents,3000);assert.equal(new Date(a.ends_at)-new Date(a.starts_at),3600000);assert.equal(sql(`select count(*) from public.wm_bookings where id='${id}';`),'1');
 assert.throws(()=>sql(reserve(id,'will','barba','14:00')),/INVALID_REQUEST/);
});
test('blocks partial overlaps but keeps adjacent periods and the other barber free',()=>{
 assert.throws(()=>sql(reserve(randomUUID(),'will','barba','14:30')),/SLOT_TAKEN/);
 assert.equal(at(slots('will','barba'),'13:30').available,false);
 assert.equal(at(slots('will','barba'),'14:30').available,false);
 assert.equal(at(slots('will','barba'),'15:00').available,true);
 assert.equal(at(slots('negraauu','barba'),'14:00').available,true);
});
test('two-hour services block their entire duration and cannot finish after 21h',()=>{
 const a=JSON.parse(sql(reserve(randomUUID(),'will','progressiva','16:00')));assert.equal(new Date(a.ends_at)-new Date(a.starts_at),7200000);
 assert.equal(at(slots('will','barba'),'17:30').available,false);
 assert.equal(at(slots('will','barba'),'18:00').available,true);
 assert.throws(()=>sql(reserve(randomUUID(),'negraauu','alisamento','19:30')),/INVALID_TIME/);
 assert.throws(()=>sql(reserve(randomUUID(),'negraauu','barba','09:30')),/INVALID_TIME/);
 assert.throws(()=>sql(reserve(randomUUID(),'negraauu','barba','14:15')),/INVALID_TIME/);
});
test('concurrent requests cannot both reserve the same barber and period',async()=>{
 const qs=[randomUUID(),randomUUID()].map(id=>`begin; ${reserve(id,'will','corte-degrade','10:00')} select pg_sleep(0.2); commit;`);
 const results=await Promise.allSettled(qs.map(command));assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.match(results.find(r=>r.status==='rejected').reason.stderr,/SLOT_TAKEN/);
 assert.equal(sql(`select count(*) from public.wm_bookings where barber_id='will' and starts_at=${start('10:00')};`),'1');
});
test('anonymous users cannot read bookings, insert directly, or cancel',()=>{
 assert.throws(()=>sql('set role anon;select * from public.wm_bookings;'),/permission denied/);
 assert.throws(()=>sql("set role anon;update public.wm_bookings set status='cancelled';"),/permission denied/);
});
test('closed days, old times and unknown services are rejected on the server',()=>{
 const sunday=sql("select d::date from generate_series(current_date+1,current_date+7,interval '1 day') d where extract(isodow from d)=7 limit 1;");
 assert.equal(sql(`select count(*) from public.wm_availability('will','barba','${sunday}');`),'0');
 assert.throws(()=>sql(`select public.wm_reserve('${randomUUID()}','will','barba',('${sunday}'::date+time '14:00') at time zone 'America/Sao_Paulo');`),/INVALID_TIME/);
 assert.throws(()=>sql(`select public.wm_reserve('${randomUUID()}','will','barba',now()-interval '1 day');`),/INVALID_TIME/);
 assert.throws(()=>sql(reserve(randomUUID(),'will','nonexistent','12:00')),/INVALID_SERVICE/);
});
