import { chromium } from 'playwright';
import axe from 'axe-core';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});
const page=await browser.newPage();const errors=[];const externalFonts=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('request',r=>{if(/fonts\.(googleapis|gstatic)\.com/.test(r.url()))externalFonts.push(r.url());});
await page.route('https://maps.google.com/**',r=>r.abort());
async function audit(label){
 const result=await page.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}}));
 assert.deepEqual(result.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),[],label);
}
try{
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const width of[320,360,390,430,760,761,768,900,1024,1440,1920]){
  await page.setViewportSize({width,height:900});await page.goto('http://localhost:5173',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Overflow at ${width}`);
  assert.equal(await page.evaluate(()=>document.fonts.check('600 40px "Barlow Condensed"')),true);
  const clipped=await page.locator('h1').evaluate(h=>{
    const bounds=h.getBoundingClientRect();const walk=document.createTreeWalker(h,NodeFilter.SHOW_TEXT);let node;
    while((node=walk.nextNode())){const r=document.createRange();r.selectNodeContents(node);if([...r.getClientRects()].some(box=>box.width&&box.right>bounds.right+1))return true;}
    return false;
  });assert.equal(clipped,false,`Heading clipped at ${width}`);
  if(width<=760){await page.getByRole('button',{name:'Abrir menu'}).click();await page.keyboard.press('Escape');assert.equal(await page.getByRole('button',{name:'Abrir menu'}).getAttribute('aria-expanded'),'false');}
 }
 for(const img of await page.locator('.hero-photo img, .gallery-item img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(e=>e.decode());assert.equal(await img.evaluate(e=>e.naturalWidth>0),true);}
 await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
 await page.addScriptTag({content:axe.source});await audit('Home accessibility');
 const missingAnchors=await page.locator('a[href^="#"]').evaluateAll(links=>links.map(a=>a.hash).filter(hash=>!document.getElementById(hash.slice(1))));assert.deepEqual(missingAnchors,[]);
 await page.getByRole('button',{name:'Ver tabela completa'}).click();assert.equal(await page.locator('.price-row').count(),15);
 await page.getByRole('button',{name:'Agendar com Will'}).click();await audit('Booking accessibility');await page.keyboard.press('Escape');
 await page.locator('.gallery-item').first().click();await audit('Gallery accessibility');await page.keyboard.press('ArrowLeft');assert.match(await page.locator('.photo-dialog img').getAttribute('src'),/platinado\.jpg$/);await page.keyboard.press('Escape');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:1440,height:900});await page.waitForFunction(()=>document.documentElement.classList.contains('lenis'));
 await page.evaluate(()=>scrollTo({top:2200,behavior:'instant'}));await page.waitForTimeout(80);await page.mouse.move(400,400);await page.mouse.wheel(0,1100);await page.waitForTimeout(40);
 await page.getByRole('button',{name:'Agendar com Will'}).evaluate(e=>e.click());
 await page.waitForFunction(()=>document.documentElement.classList.contains('lenis-stopped'));
 const before=await page.evaluate(()=>scrollY);await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>scrollY),before,'Scroll moved behind booking dialog');
 await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.documentElement.classList.contains('lenis-stopped'));
 await page.locator('.gallery-item').first().click();await page.waitForFunction(()=>document.documentElement.classList.contains('lenis-stopped'));await page.keyboard.press('Escape');
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.pole-stripes').evaluate(e=>getComputedStyle(e).animationName),'none');assert.equal(await page.locator('.hero-trace').evaluate(e=>getComputedStyle(e).animationName),'none');
 assert.deepEqual(externalFonts,[]);assert.deepEqual(errors,[]);
 console.log('PASS: 11 widths, local fonts, complete headings, keyboard menu/gallery, anchors/prices, modal scroll/inertia lock, reduced motion, and zero automated WCAG A/AA violations in home/booking/gallery.');
}finally{await browser.close();}
