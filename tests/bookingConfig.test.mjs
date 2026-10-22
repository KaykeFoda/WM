import test from 'node:test';
import assert from 'node:assert/strict';
import { isPublicBookingKey, normalizeBookingUrl } from '../src/lib/bookingConfig.js';
import { readPendingBooking, savePendingBooking, clearPendingBooking } from '../src/lib/bookingRecovery.js';
const jwt=role=>`${btoa('{}')}.${btoa(JSON.stringify({role}))}.test-signature`;
test('accepts public credentials with pasted whitespace, rejects privileged credentials',()=>{
 assert.equal(isPublicBookingKey(' sb_publishable_public-test \n'),true);
 assert.equal(isPublicBookingKey(jwt('anon')),true);
 assert.equal(isPublicBookingKey(jwt('service_role')),false);
 assert.equal(isPublicBookingKey('sb_secret_test'),false);
 assert.equal(isPublicBookingKey('sb_publishable_'),false);
 assert.equal(normalizeBookingUrl(' https://test.supabase.co/ \n'),'https://test.supabase.co');
 assert.equal(normalizeBookingUrl('https://test.supabase.co/rest/v1'),undefined);
});
test('keeps uncertain attempts separate for each project and barber, and clears only confirmed attempts',()=>{
 const data=new Map();const storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 const attempt={requestId:'12345678-1234-4234-8234-123456789abc',selection:'0',service:'corte-social',date:'2026-10-23',start:'2026-10-23T17:00:00Z',barber:'will'};
 savePendingBooking('project-one',attempt,storage);
 assert.deepEqual(readPendingBooking('project-one','will',storage),attempt);
 assert.equal(readPendingBooking('project-one','negraauu',storage),null);
 assert.equal(readPendingBooking('project-two','will',storage),null);
 clearPendingBooking('project-one','will',storage);
 assert.equal(readPendingBooking('project-one','will',storage),null);
 savePendingBooking('project-one',{...attempt,selection:'999',service:undefined},storage);
 assert.equal(readPendingBooking('project-one','will',storage),null);
});
test('storage failures do not break booking or manufacture a pending attempt',()=>{
 const storage={getItem(){throw Error('disabled');},setItem(){throw Error('disabled');},removeItem(){throw Error('disabled');}};
 assert.equal(readPendingBooking('p','will',storage),null);
 assert.doesNotThrow(()=>savePendingBooking('p',{barber:'will'},storage));
 assert.doesNotThrow(()=>clearPendingBooking('p','will',storage));
});
