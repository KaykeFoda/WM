import test from 'node:test';
import assert from 'node:assert/strict';
import {todayAtShop, isOpenDay, validDate, addBookingDays, formatBookingDate} from '../src/lib/bookingTime.js';
test('uses São Paulo civil date across UTC midnight',()=>{
 assert.equal(todayAtShop(new Date('2026-10-23T01:30:00Z')),'2026-10-22');
});
test('rejects invalid dates and closed days',()=>{
 assert.equal(validDate('2026-02-30'),false);
 assert.equal(isOpenDay('2026-10-25'),false);
 assert.equal(isOpenDay('2026-10-26'),false);
 assert.equal(isOpenDay('2026-10-24'),true);
 assert.equal(formatBookingDate('2026-10-24'),'24/10/2026');
});
test('booking horizon spans month and year boundaries without timezone drift',()=>{
 assert.equal(addBookingDays('2026-12-31',1),'2027-01-01');
 assert.equal(addBookingDays('2028-02-28',1),'2028-02-29');
});
