import { db, updateDB, uid } from './db';
import { defaultPrefix, roleForStars, STAR_LEVELS } from './permissions';

export const ADMIN_GROUPS = [
  { key: 'BLACK' as const, title: 'Черный чат', icon: '⚫' },
  { key: 'BLUE' as const, title: 'Синий чат', icon: '🔵' },
];

export const ADMIN_RANKS = [
  { stars: 5, key: 'IMPERATOR' as const, title: STAR_LEVELS[4].label },
  { stars: 4, key: 'IMPERATOR_HAND' as const, title: STAR_LEVELS[3].label },
  { stars: 3, key: 'INQUISITOR' as const, title: STAR_LEVELS[2].label },
  { stars: 2, key: 'IMPERIAL_MAGE' as const, title: STAR_LEVELS[1].label },
  { stars: 1, key: 'IMPERIAL_GUARD' as const, title: STAR_LEVELS[0].label },
];

export type AdminGroup = typeof ADMIN_GROUPS[number]['key'];
export type AdminRank = typeof ADMIN_RANKS[number]['key'];

export function normalizeUsername(value: string) {
  return value.trim().replace(/^@/, '').replace(/\s+/g, ' ').toLocaleLowerCase('ru-RU');
}

function rankFromStars(stars: number) {
  return ADMIN_RANKS.find(r => r.stars === stars) ?? ADMIN_RANKS.at(-1)!;
}

const RANK_ALIASES: Record<string, string> = {
  'император': 'Владелец',
  'владелец': 'Владелец',
  'рука императора': 'Гл Админ',
  'гл админ': 'Гл Админ',
  'главный админ': 'Гл Админ',
  'инквизитор': 'Админ',
  'админ': 'Админ',
  'имперский маг': 'Ст.стажер',
  'ст.стажер': 'Ст.стажер',
  'стажёр': 'Ст.стажер',
  'императорский гвардеец': 'Стажер',
  'стажер': 'Стажер',
};

function parseMemberLine(line: string) {
  const cleaned = line
    .replace(/^(⚪️|⚪|🟢|🟡|🔴|🔵|🟠|🟣|⚫|🔘)\s*/u, '')
    .trim();
  if (!cleaned || /^(Ирис|Iris)\b/i.test(cleaned)) return null;

  const explicit = cleaned.match(/@([\w\d_]{2,64})/u)?.[1];
  const username = (explicit ?? cleaned.replace(/^@/, '').split(/\s+/)[0]).trim();
  if (!username) return null;

  const displayName = explicit
    ? cleaned.replace(/@([\w\d_]{2,64})/u, '').trim() || username
    : cleaned;

  return { username, displayName };
}

export function parseIrisMessage(text: string) {
  const lines = text
    .replace(/\r/g, '')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);

  let rank: ReturnType<typeof rankFromStars> | null = null;
  const members: { username: string; displayName: string; stars: number; rank: AdminRank }[] = [];

  for (const line of lines) {
    const title = line.replace(/[⭐️⭐]/gu, '').trim().toLocaleLowerCase('ru-RU');
    const normalizedTitle = RANK_ALIASES[title] || line.replace(/[⭐️⭐]/gu, '').trim();
    const found = ADMIN_RANKS.find(
      r => r.title.toLocaleLowerCase('ru-RU') === normalizedTitle.toLocaleLowerCase('ru-RU'),
    );

    if (found) {
      rank = found;
      continue;
    }

    if (!rank) continue;
    const member = parseMemberLine(line);
    if (member) members.push({ ...member, stars: rank.stars, rank: rank.key });
  }

  return members;
}

export type IrisMemberMeta = {
  username: string;
  displayName?: string;
  telegramId?: number;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
};

function findMeta(item: { username: string; displayName: string }, metadata: IrisMemberMeta[]) {
  const usernameKey = normalizeUsername(item.username);
  const displayKey = normalizeUsername(item.displayName);

  return metadata.find(m => {
    const mUsername = normalizeUsername(m.username || '');
    const mDisplay = normalizeUsername(m.displayName || '');
    return mUsername === usernameKey || mDisplay === usernameKey || mUsername === displayKey || mDisplay === displayKey;
  });
}

function applyRoleFromAssignments(user: ReturnType<typeof db>['users'][number], assignments: ReturnType<typeof db>['adminAssignments']) {
  const own = assignments.filter(a => a.userId === user.id);
  if (!own.length) return false;

  const stars = Math.max(...own.map(a => a.stars), 1);
  const changed = user.stars !== stars || user.role !== roleForStars(stars);
  user.stars = stars;
  user.role = roleForStars(stars);

  if (!user.prefix || !user.prefixColor || !user.prefixStyle) {
    const dp = defaultPrefix(stars);
    user.prefix ??= dp.prefix;
    user.prefixColor ??= dp.color;
    user.prefixStyle ??= dp.style;
  }
  return changed;
}

export function syncIrisSnapshot(
  group: AdminGroup,
  text: string,
  sourceChat = 'browser-demo',
  metadata: IrisMemberMeta[] = [],
) {
  const parsed = parseIrisMessage(text);
  const result = { processed: 0, added: 0, updated: 0, removed: 0, linked: 0 };

  updateDB(d => {
    d.adminSnapshots[group] ??= {};
    d.adminSnapshots[group][sourceChat] = JSON.stringify(parsed);

    const merged = new Map<string, typeof parsed[number]>();
    for (const raw of Object.values(d.adminSnapshots[group])) {
      try {
        for (const item of JSON.parse(raw) as typeof parsed) {
          const meta = findMeta(item, metadata);
          const key = meta?.telegramId ? `id:${meta.telegramId}` : normalizeUsername(item.username);
          merged.set(key, item);
        }
      } catch {
        // Ignore malformed historical snapshot.
      }
    }

    const now = new Date().toISOString();
    const seen = new Set<string>();
    const affectedUsers = new Set<string>();
    result.processed = merged.size;

    for (const item of merged.values()) {
      const meta = findMeta(item, metadata);
      const telegramId = Number(meta?.telegramId || 0);
      const usernameKey = normalizeUsername(item.username);

      let user = telegramId > 0
        ? d.users.find(u => u.telegramId === telegramId)
        : undefined;

      if (!user) {
        user = d.users.find(u => normalizeUsername(u.username) === usernameKey);
      }

      if (!user) {
        const dp = defaultPrefix(item.stars);
        user = {
          id: uid(),
          telegramId,
          username: meta?.username || item.username,
          firstName: meta?.firstName || meta?.displayName || item.displayName,
          lastName: meta?.lastName || '',
          stars: item.stars,
          role: roleForStars(item.stars),
          adminSince: now,
          status: 'Активен',
          avatarUrl: meta?.avatarUrl,
          prefix: dp.prefix,
          prefixColor: dp.color,
          prefixStyle: dp.style,
        };
        d.users.push(user);
        result.added++;
      } else {
        const beforeUsername = user.username;
        const beforeStars = user.stars;
        const beforeRole = user.role;

        if (meta?.username && !meta.username.startsWith('tg_')) user.username = meta.username;
        user.firstName = meta?.firstName || user.firstName || meta?.displayName || item.displayName;
        user.lastName = meta?.lastName || user.lastName;
        if (telegramId > 0) user.telegramId = telegramId;
        if (meta?.avatarUrl) user.avatarUrl = meta.avatarUrl;
        user.adminSince ??= now;
        user.status ??= 'Активен';

        if (beforeUsername !== user.username || beforeStars !== item.stars || beforeRole !== roleForStars(item.stars)) {
          result.updated++;
        }
      }

      affectedUsers.add(user.id);

      const old = d.adminAssignments.find(
        a => a.group === group && a.userId === user!.id && a.source === 'IRIS',
      );

      if (old) {
        old.rank = item.rank;
        old.stars = item.stars;
        old.sourceChat = sourceChat;
        old.sourceSeenAt = now;
      } else {
        d.adminAssignments.push({
          id: uid(),
          userId: user.id,
          group,
          rank: item.rank,
          stars: item.stars,
          source: 'IRIS',
          sourceChat,
          sourceSeenAt: now,
        });
        result.linked += telegramId > 0 ? 1 : 0;
      }

      seen.add(`${group}:${user.id}`);
    }

    const stale = d.adminAssignments.filter(
      a => a.source === 'IRIS' && a.group === group && !seen.has(`${group}:${a.userId}`),
    );
    for (const assignment of stale) affectedUsers.add(assignment.userId);

    const before = d.adminAssignments.length;
    d.adminAssignments = d.adminAssignments.filter(
      a => a.source !== 'IRIS' || a.group !== group || seen.has(`${group}:${a.userId}`),
    );
    result.removed = before - d.adminAssignments.length;

    for (const userId of affectedUsers) {
      const user = d.users.find(u => u.id === userId);
      if (!user) continue;

      const own = d.adminAssignments.filter(a => a.userId === user.id);
      if (own.length) {
        applyRoleFromAssignments(user, d.adminAssignments);
      } else if (user.stars !== 1 || user.role !== 'USER') {
        user.stars = 1;
        user.role = roleForStars(1);
        const dp = defaultPrefix(1);
        user.prefix = dp.prefix;
        user.prefixColor = dp.color;
        user.prefixStyle = dp.style;
        user.status = 'Активен';
      }
    }
  });

  return result;
}

export function listAdminAssignments(group?: AdminGroup) {
  const d = db();
  return d.adminAssignments
    .filter(a => !group || a.group === group)
    .map(a => ({
      ...a,
      user: d.users.find(u => u.id === a.userId) ?? null,
      rankTitle: ADMIN_RANKS.find(r => r.key === a.rank)?.title ?? a.rank,
      groupTitle: ADMIN_GROUPS.find(g => g.key === a.group)?.title ?? a.group,
    }))
    .filter(x => x.user);
}

export function getLocalIrisRole(telegramId: number) {
  const d = db();
  const user = d.users.find(u => u.telegramId === telegramId);
  if (!user) return null;
  const assignments = d.adminAssignments.filter(a => a.userId === user.id);
  if (!assignments.length) return null;
  const stars = Math.max(...assignments.map(a => a.stars), 1);
  return { stars, role: roleForStars(stars), userId: user.id };
}
