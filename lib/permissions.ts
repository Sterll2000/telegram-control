import type { Permission, RoleCode, User } from './types';
export const ALL_PERMISSIONS:Permission[]=['VIEW_CONTENT','EDIT_CONTENT','MANAGE_NAVIGATION','MANAGE_PREFIXES','MANAGE_USERS','MANAGE_TASKS','MANAGE_AFK','VIEW_STATISTICS','MANAGE_STATISTICS','VIEW_AUDIT_LOG'];
export const ROLE_PERMISSIONS:Record<RoleCode,Permission[]>={
 USER:['VIEW_CONTENT','VIEW_STATISTICS'],
 JUNIOR_STAFF:['VIEW_CONTENT','EDIT_CONTENT','VIEW_STATISTICS'],
 SENIOR_STAFF:['VIEW_CONTENT','EDIT_CONTENT','VIEW_STATISTICS'],
 SENIOR_ADMIN:[...ALL_PERMISSIONS.filter(p=>p!=='MANAGE_USERS'&&p!=='MANAGE_PREFIXES')],
 SYS_ADMIN:[...ALL_PERMISSIONS],
 SUPER_ADMIN:[...ALL_PERMISSIONS]
};
export const ROLE_NAMES:Record<RoleCode,string>={USER:'Стажер',JUNIOR_STAFF:'Ст.стажер',SENIOR_STAFF:'Админ',SENIOR_ADMIN:'Гл Админ',SYS_ADMIN:'Сис админ',SUPER_ADMIN:'Владелец'};
export const STAR_LEVELS=[
 {stars:1,label:'Стажер',prefix:'Стажер',color:'#94a3b8',style:'outline' as const},
 {stars:2,label:'Ст.стажер',prefix:'Ст.стажер',color:'#22d3ee',style:'soft' as const},
 {stars:3,label:'Админ',prefix:'Админ',color:'#60a5fa',style:'solid' as const},
 {stars:4,label:'Гл Админ',prefix:'Гл Админ',color:'#c084fc',style:'glow' as const},
 {stars:5,label:'Владелец',prefix:'Владелец',color:'#fbbf24',style:'glow' as const},
] as const;
export function starLevel(stars:number){return STAR_LEVELS.find(x=>x.stars===stars)||STAR_LEVELS[0]}
export function starName(stars:number){return starLevel(stars).label}
export function defaultPrefix(stars:number){const x=starLevel(stars);return {prefix:x.prefix,color:x.color,style:x.style};}
export type PermissionMap=Record<RoleCode,Permission[]>;
export function hasPermission(user:Pick<User,'role'>, permission:Permission, map:PermissionMap=ROLE_PERMISSIONS){return map[user.role].includes(permission)}
export function canUseStars(stars:number){return Math.min(5,Math.max(1,Math.round(stars)))}
export function roleForStars(stars:number):RoleCode{if(stars>=5)return'SUPER_ADMIN';if(stars===4)return'SENIOR_ADMIN';if(stars===3)return'SENIOR_STAFF';if(stars===2)return'JUNIOR_STAFF';return'USER'}
