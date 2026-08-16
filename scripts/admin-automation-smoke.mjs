import fs from 'node:fs';
const worker=fs.readFileSync(new URL('./iris-monitor.mjs',import.meta.url),'utf8');
const scan=fs.readFileSync(new URL('./iris-scan.mjs',import.meta.url),'utf8');
const env=fs.readFileSync(new URL('../.env.example',import.meta.url),'utf8');
const checks=[
 ['Worker работает с двумя чатами',worker.includes('IRIS_CHAT_BLACK')&&worker.includes('IRIS_CHAT_BLUE')&&!worker.includes('IRIS_CHAT_BLACK_1')&&!worker.includes('IRIS_CHAT_BLUE_2')],
 ['Worker сканирует историю',worker.includes('iterMessages')&&worker.includes('scanHistory')],
 ['Есть разовый сканер',scan.includes('iterMessages')&&scan.includes('IRIS_SCAN_LIMIT')],
 ['В env только два ID',env.includes('IRIS_CHAT_BLACK=')&&env.includes('IRIS_CHAT_BLUE=')&&!env.includes('IRIS_CHAT_BLACK_1')&&!env.includes('IRIS_CHAT_BLUE_1')],
];
let ok=true;for(const [name,pass] of checks){console.log(`${pass?'PASS':'FAIL'} ${name}`);ok&&=pass}process.exit(ok?0:1);
