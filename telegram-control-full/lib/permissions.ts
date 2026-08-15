import type { Permission, RoleCode, User } from './types';
export const ALL_PERMISSIONS:Permission[]=['VIEW_CONTENT','EDIT_CONTENT','MANAGE_NAVIGATION','MANAGE_PREFIXES','MANAGE_USERS','MANAGE_TASKS','MANAGE_AFK','VIEW_STATISTICS','MANAGE_STATISTICS','VIEW_AUDIT_LOG'];
export const ROLE_PERMISSIONS:Record<RoleCode,Permission[]>={
 USER:['VIEW_CONTENT','VIEW_STATISTICS'],
 JUNIOR_STAFF:['VIEW_CONTENT','EDIT_CONTENT','VIEW_STATISTICS'],
 SENIOR_STAFF:['VIEW_CONTENT','EDIT_CONTENT','VIEW_STATISTICS'],
 SENIOR_ADMIN:[...ALL_PERMISSIONS.filter(p=>p!=='MANAGE_USERS'&&p!=='MANAGE_PREFIXES')],
 SUPER_ADMIN:[...ALL_PERMISSIONS]
};
export const ROLE_NAMES:Record<RoleCode,string>={USER:'Пользователь',JUNIOR_STAFF:'Младший состав',SENIOR_STAFF:'Старший состав',SENIOR_ADMIN:'Ст. Админ',SUPER_ADMIN:'Главный Админ'};
export type PermissionMap=Record<RoleCode,Permission[]>;
export function hasPermission(user:Pick<User,'role'>, permission:Permission, map:PermissionMap=ROLE_PERMISSIONS){return map[user.role].includes(permission)}
export function canUseStars(stars:number){return Math.min(5,Math.max(1,Math.round(stars)))}
export function roleForStars(stars:number):RoleCode{if(stars>=5)return'SUPER_ADMIN';if(stars===4)return'SENIOR_ADMIN';if(stars===3)return'SENIOR_STAFF';if(stars===2)return'JUNIOR_STAFF';return'USER'}
