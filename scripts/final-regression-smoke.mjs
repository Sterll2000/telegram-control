import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const dashboard=fs.readFileSync('components/dashboard.tsx','utf8');
const adminList=fs.readFileSync('components/admin-list.tsx','utf8');
const sync=fs.readFileSync('app/api/admins/internal/sync/route.ts','utf8');
const adminSync=fs.readFileSync('lib/admin-sync.ts','utf8');
const state=fs.readFileSync('app/api/state/route.ts','utf8');
const bot=fs.readFileSync('scripts/iris-bot-automation.mjs','utf8');
const css=fs.readFileSync('app/globals.css','utf8');
const checks=[
 ['Назад из списка админов возвращает в предыдущий экран',dashboard.includes('back={()=>navTo(previousTab)}')&&dashboard.includes('setPreviousTab(\'admin\')')],
 ['Telegram BackButton учитывает текущий экран',dashboard.includes("if(tab==='admin-list'){setTab(previousTab);return}")],
 ['Контент ограничен по ширине',dashboard.includes('max-w-lg')],
 ['Навигация в модальном списке идёт вертикально',dashboard.includes('space-y-2')&&dashboard.includes('break-words text-sm font-semibold')],
 ['Собственный список выбора не выпирает за контейнер',css.includes('.custom-select-menu{max-width:100vw}')&&dashboard.includes('max-h-72 overflow-y-auto')],
 ['Аватар показывается в списке админов',adminList.includes('x.user.avatarUrl')&&adminList.includes('<img')],
 ['Синхронизация Iris принимает профильные данные',sync.includes('avatarData')&&sync.includes('saveAvatar')&&adminSync.includes('IrisMemberMeta')],
 ['Вход в приложение ставит запрос на сверку Iris',state.includes('syncRequestedAt')&&state.includes('lastSyncAt')],
 ['Worker получает профиль и аватар через MTProto',bot.includes('getEntity(username)')&&bot.includes('downloadProfilePhoto')],
 ['Worker отправляет данные в сайт',bot.includes('/api/admins/internal/sync')&&bot.includes('members: await enrichMembers(text)')],
];
let ok=true;
for(const [name,pass] of checks){console.log(`${pass?'PASS':'FAIL'} ${name}`);ok&&=pass}
execFileSync(process.execPath,['--check','scripts/iris-bot-automation.mjs'],{stdio:'inherit'});
process.exit(ok?0:1);
