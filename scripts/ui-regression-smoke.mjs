import fs from 'node:fs';
const dashboard=fs.readFileSync('components/dashboard.tsx','utf8');
const adminsApi=fs.readFileSync('app/api/admins/route.ts','utf8');
const adminList=fs.readFileSync('components/admin-list.tsx','utf8');
const css=fs.readFileSync('app/globals.css','utf8');
const checks=[
  ['Итоги проверки имеет отдельный экран', dashboard.includes("tab==='stats'&&<StatsView data={data}/>")],
  ['Список админов не ограничен canAdmin в UI', dashboard.includes("tab==='admin-list'&&<><PageTitle title=\"Список админов\"")],
  ['Список админов есть в нижней навигации', dashboard.includes("['admin-list','Админы',Users]")],
  ['API списка админов доступен по VIEW_CONTENT', adminsApi.includes("hasPermission(me, 'VIEW_CONTENT')")],
  ['Права переведены на русский', dashboard.includes("Просмотр содержимого") && dashboard.includes("Управление пользователями")],
  ['Переключатели прав имеют отдельный стиль', css.includes('.permission-switch') && dashboard.includes('permission-toggle')],
  ['Компактный режим реально меняет плотность интерфейса', css.includes('.compact-mode') && dashboard.includes('compact-mode') && dashboard.includes('Меньше отступов')],
  ['Приоритеты заданий переводятся', dashboard.includes('priorityName(t.priority)')],
  ['Синхронизация Iris остаётся в списке админов', adminList.includes('Применить тестовый снимок') && adminList.includes('Автоматическое обновление')],
];
for (const [name, ok] of checks) {
  if (!ok) throw new Error(`FAIL: ${name}`);
  console.log(`PASS: ${name}`);
}
console.log(`UI regression smoke: PASS (${checks.length} checks)`);
