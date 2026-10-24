import {mkdirSync,cpSync,writeFileSync,rmSync} from 'node:fs';
rmSync('dist',{recursive:true,force:true});mkdirSync('dist/server',{recursive:true});
cpSync('public','dist/client',{recursive:true});cpSync('server','dist/server',{recursive:true});cpSync('server/worker.js','dist/server/index.js');
writeFileSync('dist/server/wrangler.json',JSON.stringify({name:'saferoute-houston',main:'index.js',compatibility_date:'2026-05-01',assets:{directory:'../client',binding:'ASSETS',run_worker_first:['/api/*']},d1_databases:[{binding:'DB',database_name:'saferoute-community',database_id:'local-saferoute'}]}));

mkdirSync('dist/.openai',{recursive:true});cpSync('drizzle','dist/.openai/drizzle',{recursive:true});cpSync('config/hosting.json','dist/.openai/hosting.json');
