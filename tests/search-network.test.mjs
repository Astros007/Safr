import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchSearch,resetSearchCooldown} from '../public/search-network.js';
test('a temporary failure retries once and returns actual results',async()=>{let n=0;const data=await fetchSearch('https://example.test',{fetcher:async()=>++n===1?new Response('',{status:503}):Response.json({features:[{id:1}]}),wait:async()=>{}});assert.equal(n,2);assert.deepEqual(data,[{id:1}])});
test('rate limit is honored without extra requests',async()=>{resetSearchCooldown();let n=0;const fetcher=async()=>{n++;return new Response('',{status:429,headers:{'Retry-After':'60'}})};await assert.rejects(fetchSearch('https://example.test',{fetcher}),/busy/);await assert.rejects(fetchSearch('https://example.test',{fetcher}),/busy/);assert.equal(n,1);resetSearchCooldown()});
test('canceled search does not retry',async()=>{const c=new AbortController();let n=0;await assert.rejects(fetchSearch('https://example.test',{signal:c.signal,fetcher:async()=>{n++;c.abort();throw Error('network')},wait:async()=>{}}),{name:'AbortError'});assert.equal(n,1)});
test('persistent service failure stops after two attempts',async()=>{let n=0;await assert.rejects(fetchSearch('https://example.test',{fetcher:async()=>{n++;throw TypeError('network')},wait:async()=>{}}),/connection/);assert.equal(n,2)});
