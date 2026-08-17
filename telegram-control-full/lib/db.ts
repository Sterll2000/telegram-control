import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { AfkRecord, AdminCheck, AuditLog, NavCategory, Notification, Task, User } from './types';
import type { PermissionMap } from './permissions';
import { ROLE_PERMISSIONS } from './permissions';

type AdminGroup = 'BLACK' | 'BLUE';
type AdminRank = 'IMPERATOR' | 'IMPERATOR_HAND' | 'INQUISITOR' | 'IMPERIAL_MAGE' | 'IMPERIAL_GUARD';
type AdminAssignment = { id: string; userId: string; group: AdminGroup; rank: AdminRank; stars: number; source: 'IRIS' | 'MANUAL'; sourceChat?: string; sourceSeenAt: string };
type AutomationConfig = { enabled: boolean; chats: { BLACK: string; BLUE: string }; lastSyncAt?: string; lastMessage?: string; lastResult?: { processed: number; added: number; updated: number; removed: number }; syncRequestedAt?: string; syncRequestedBy?: string };
type DB = { users: User[]; nav: NavCategory[]; tasks: Task[]; afk: AfkRecord[]; notifications: Notification[]; checks: AdminCheck[]; audit: AuditLog[]; rolePermissions: PermissionMap; adminAssignments: AdminAssignment[]; adminSnapshots: Record<string, Record<string, string>>; adminAutomation: AutomationConfig };

const file = path.join(process.cwd(), 'data', 'db.json');

/**
 * Production starts from a clean application state.
 * Telegram authentication creates the currently authenticated user at runtime;
 * no demo users, posts/tasks, AFK records, checks or statistics are seeded.
 */
const seed = (): DB => ({
  users: [],
  nav: [
    {
      id: 'cat-main',
      title: 'Основное',
      icon: '◈',
      items: [
        { id: 'nav-rules', title: 'Правила', body: 'Основные правила команды, стандарты поведения и порядок взаимодействия.' },
        { id: 'nav-contacts', title: 'Контакты', body: 'Контакты руководства и полезные ссылки.' },
      ],
    },
    {
      id: 'cat-learn',
      title: 'Обучение',
      icon: '⌘',
      items: [
        { id: 'nav-training', title: 'Базовое обучение', body: 'Материалы для новых сотрудников.' },
        { id: 'nav-checks', title: 'Проверки', body: 'Порядок проведения проверок и оформления результатов.' },
      ],
    },
    {
      id: 'cat-tools',
      title: 'Инструменты',
      icon: '◎',
      items: [{ id: 'nav-tools', title: 'Рабочие инструменты', body: 'Список инструментов и инструкции по их использованию.' }],
    },
  ],
  tasks: [],
  afk: [],
  notifications: [],
  checks: [],
  audit: [],
  rolePermissions: JSON.parse(JSON.stringify(ROLE_PERMISSIONS)),
  adminAssignments: [],
  adminSnapshots: {},
  adminAutomation: { enabled: false, chats: { BLACK: '', BLUE: '' } },
});

function normalizeDB(d: DB): DB {
  d.rolePermissions = { ...ROLE_PERMISSIONS, ...(d.rolePermissions || {}) };
  d.users ??= [];
  d.tasks ??= [];
  d.afk ??= [];
  d.notifications ??= [];
  d.checks ??= [];
  d.audit ??= [];
  d.adminAssignments ??= [];
  d.adminSnapshots ??= {};
  d.adminAutomation ??= { enabled: false, chats: { BLACK: '', BLUE: '' } };
  if (!d.adminAutomation.chats) d.adminAutomation.chats = { BLACK: '', BLUE: '' };
  for (const key of ['BLACK', 'BLUE'] as const) {
    const value = d.adminAutomation.chats[key] as unknown;
    if (Array.isArray(value)) d.adminAutomation.chats[key] = String(value.find(Boolean) ?? '');
    else d.adminAutomation.chats[key] = String(value ?? '');
  }
  for (const a of d.adminAssignments) {
    const u = d.users.find(x => x.id === a.userId);
    if (u && !u.adminSince) u.adminSince = a.sourceSeenAt || new Date().toISOString();
    if (u && !u.status) u.status = 'Активен';
    if (u && !u.prefixStyle) u.prefixStyle = 'soft';
  }
  return d;
}

function read(): DB {
  try {
    if (!fs.existsSync(file)) {
      const d = seed();
      if (process.env.NODE_ENV !== 'production' || process.env.DEMO_MODE === 'true') {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, JSON.stringify(d, null, 2));
      }
      return d;
    }
    return normalizeDB(JSON.parse(fs.readFileSync(file, 'utf8')));
  } catch {
    return seed();
  }
}

function write(d: DB) {
  // Vercel's serverless filesystem is ephemeral. Keep production state clean
  // until persistent storage is configured; local development still persists data/db.json.
  if (process.env.NODE_ENV === 'production') return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(d, null, 2));
}

export function db() { return read(); }
export function updateDB(fn: (d: DB) => void) { const d = read(); fn(d); write(d); return d; }
export function uid() { return randomUUID(); }
export function audit(actorId: string, action: string, entity: string, entityId?: string, payload?: Record<string, unknown>) {
  updateDB(d => d.audit.unshift({ id: uid(), actorId, action, entity, entityId, payload, createdAt: new Date().toISOString() }));
}
