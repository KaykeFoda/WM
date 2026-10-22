// Browser integration against the real isolated PostgreSQL functions.
// Supabase's HTTP transport is routed locally; this does not validate a hosted project.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const container='wm-booking-test';
assert.equal(execFileSync('docker',['inspect','--format','{{.HostConfig.NetworkMode}}',container],{encoding:'utf8'}).trim(),'none');
const sql=query=>execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-AtX','-v','ON_ERROR_STOP=1'],{input:query,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
const literal=value=>`'${String(value).replaceAll("'","''")}'`;
const day=sql("select d::date from generate_series(current_date+1,current_date+7,interval '1 day') d where extract(isodow from d) between 2 and 6 limit 1;");
sql('truncate public.wm_bookings;');
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});
const errors=[];
async function newPage(){
 const page=await browser.newPage();page.setDefaultTimeout(12000);
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('https://fonts.googleapis.com/**',r=>r.abort());
 await page.route('https://maps.google.com/**',r=>r.abort());
 await page.route('https://wm-booking-test.supabase.co/rest/v1/rpc/**',async route=>{
   const data=route.request().postDataJSON();
   const reserve=route.request().url().endsWith('/wm_reserve');
   const query=reserve
     ?`select public.wm_reserve(${literal(data.p_request_id)}::uuid,${literal(data.p_barber)},${literal(data.p_service)},${literal(data.p_start)}::timestamptz);`
     :`select coalesce(json_agg(row_to_json(s)),'[]') from public.wm_availability(${literal(data.p_barber)},${literal(data.p_service)},${literal(data.p_day)}::date) s;`;
   try{const result=sql('set role anon;'+query).split('\n').at(-1);await route.fulfill({status:200,contentType:'application/json',body:result});}
   catch(error){const code=['SLOT_TAKEN','INVALID_TIME','INVALID_SERVICE'].find(s=>error.stderr?.toString().includes(s))||'UNAVAILABLE';await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({message:code})});}
 });
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('http://localhost:5174',{waitUntil:'domcontentloaded'});
 return page;
}
async function choose(page,barber,service='7'){
 await page.getByRole('button',{name:`Agendar com ${barber}`}).click();
 await page.getByLabel('Qual serviço você quer?').selectOption(service);
 await page.getByLabel('Dia do atendimento').fill(day);
 await page.waitForFunction(()=>document.querySelector('#booking-time option:not([disabled])'));
 const option=page.locator('#booking-time option').filter({hasText:/^14:00$/});
 await page.getByLabel('Horário disponível').selectOption(await option.getAttribute('value'));
}
try{
 const first=await newPage(),second=await newPage();
 await first.setViewportSize({width:390,height:900});await second.setViewportSize({width:1440,height:900});
 await choose(first,'Will');await choose(second,'Will');
 assert.match(await first.locator('.booking-inner').innerText(),/Tempo reservado: 2 horas/);
 await first.getByRole('button',{name:'Reservar horário',exact:true}).click();
 await first.getByRole('heading',{name:'Horário reservado!'}).waitFor();
 const href=await first.getByRole('link',{name:'Falar com Will'}).getAttribute('href');
 assert.equal(new URL(href).pathname,'/5511963809550');assert.match(new URL(href).searchParams.get('text'),/Progressiva/);
 await second.getByRole('button',{name:'Reservar horário',exact:true}).click();
 await second.getByRole('alert').filter({hasText:/acabou de ser reservado/}).waitFor();
 assert.equal(sql("select count(*) from public.wm_bookings where barber_id='will';"),'1');
 await second.getByLabel('Qual serviço você quer?').selectOption('0');
 await second.waitForFunction(()=>[...document.querySelectorAll('#booking-time option')].some(o=>o.textContent.startsWith('14:00')&&o.disabled));
 for(const time of['14:00','14:30','15:00','15:30'])assert.equal(await second.locator('#booking-time option').filter({hasText:new RegExp(`^${time}`)}).isDisabled(),true);
 await second.keyboard.press('Escape');
 await second.getByRole('button',{name:'Agendar com Negraauu'}).click();
 await second.getByLabel('Qual serviço você quer?').selectOption('0');await second.getByLabel('Dia do atendimento').fill(day);
 await second.waitForFunction(()=>[...document.querySelectorAll('#booking-time option')].some(o=>o.textContent==='14:00'&&!o.disabled));
 await second.keyboard.press('Escape');
 // A failed shared availability request must not turn into an available slot.
 const failed=await newPage();
 await failed.route('https://wm-booking-test.supabase.co/rest/v1/rpc/**',route=>route.abort());
 await failed.getByRole('button',{name:'Agendar com Will'}).click();
 await failed.getByLabel('Qual serviço você quer?').selectOption('0');
 await failed.getByLabel('Dia do atendimento').fill(day);
 await failed.getByRole('alert').filter({hasText:/Não foi possível consultar/}).waitFor();
 assert.equal(await failed.getByRole('button',{name:'Reservar horário',exact:true}).isDisabled(),true);
 // Unconfigured deployments must not pretend they reserved anything.
 const fallback=await browser.newPage();await fallback.route('https://fonts.googleapis.com/**',r=>r.abort());
 await fallback.goto('http://localhost:5173',{waitUntil:'domcontentloaded'});await fallback.getByRole('button',{name:'Agendar com Will'}).click();
 assert.match(await fallback.locator('.booking-notice').innerText(),/agenda online está sendo preparada/);
 assert.equal(await fallback.getByRole('button',{name:'Reservar horário',exact:true}).count(),0);
 for(const width of[360,390,768,1440]){
  await second.setViewportSize({width,height:900});await second.getByRole('button',{name:'Agendar com Will'}).click();
  assert.equal(await second.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await second.screenshot({path:`/tmp/wm-shared-booking-${width}.png`});await second.keyboard.press('Escape');
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: real database reserve, stale-slot conflict, 2-hour overlap, other barber, WhatsApp receipt, network failure, no-backend fallback, four widths; no page errors.');
}finally{await browser.close();}
