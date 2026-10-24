import test from 'node:test';
import assert from 'node:assert/strict';
import {gpsQuality,accessNotice} from '../public/trip-quality.js';
test('stale and inaccurate GPS cannot be treated as ready for guidance',()=>{const now=100000;assert.equal(gpsQuality(null,now),'stale');assert.equal(gpsQuality({timestamp:now-26000,accuracy:5},now),'stale');assert.equal(gpsQuality({timestamp:now,accuracy:120},now),'imprecise');assert.equal(gpsQuality({timestamp:now,accuracy:NaN},now),'imprecise');assert.equal(gpsQuality({timestamp:now,accuracy:15},now),'ready')});
test('tunnel routes carry an access notice even if assessment is missing',()=>{assert.match(accessNotice({via:'West Dallas Tunnel',edges:null}),/opening hours/);assert.match(accessNotice({edges:[{tunnel:true}]}),/public access/);assert.equal(accessNotice({via:'Main Street',edges:[{tunnel:false}]}),'')});
