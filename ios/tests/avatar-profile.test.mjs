import {test} from 'node:test';import assert from 'node:assert/strict';
import {normalizeProfile,saveProfile,readProfile,profileMarker} from '../Mobile/avatar-profile.js';
const store=new Map();globalThis.localStorage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};
test('invalid saved avatar falls back to original traveler',()=>{assert.equal(normalizeProfile({avatar:'bad'}).avatar,'traveler');assert.equal(profileMarker('pedestrian'),null)});
test('avatar persists and map badge follows travel mode',()=>{saveProfile({name:'  Alex  ',avatar:'girl'});assert.deepEqual(readProfile(),{name:'Alex',avatar:'girl'});assert.match(profileMarker('bicycle'),/#i-bike/);assert.match(profileMarker('pedestrian'),/#i-walk/)});
test('profile name is bounded and never injected into marker markup',()=>{saveProfile({name:'<script>alert(1)</script>',avatar:'robot'});assert.ok(!profileMarker('bicycle').includes('<script>'));assert.equal(normalizeProfile({name:'x'.repeat(100)}).name.length,32)});
