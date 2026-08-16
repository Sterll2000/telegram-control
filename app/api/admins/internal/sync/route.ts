import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { db, updateDB } from '@/lib/db';
import { syncIrisSnapshot, type IrisMemberMeta } from '@/lib/admin-sync';
import { persistIrisSnapshotToDatabase } from '@/lib/admin-sync-db';

const schema = z.object({
  group: z.enum(['BLACK','BLUE']),
  text: z.string().min(1).max(100000),
  sourceChat: z.string().min(1).max(128),
  members: z.array(z.object({
    username: z.string().min(1).max(128),
    displayName: z.string().max(256).optional(),
    telegramId: z.number().int().positive().optional(),
    firstName: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
    avatarData: z.string().max(4_000_000).optional(),
  })).max(1000).optional(),
});

function saveAvatar(username: string, data: string) {
  const match = data.match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/i);
  if (!match) return undefined;
  try {
    const dir = path.join(process.cwd(), 'public', 'avatars');
    fs.mkdirSync(dir, { recursive: true });
    const safe = username.toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 64) || 'telegram-user';
    const ext = match[1].toLowerCase() === 'png' ? 'png' : match[1].toLowerCase() === 'webp' ? 'webp' : 'jpg';
    const file = path.join(dir, `${safe}.${ext}`);
    fs.writeFileSync(file, Buffer.from(match[2], 'base64'));
    return `/avatars/${safe}.${ext}`;
  } catch {
    return undefined;
  }
}

export async function POST(req: Request) {
  const secret = process.env.ADMIN_SYNC_SECRET;
  if (!secret || req.headers.get('x-admin-sync-secret') !== secret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = schema.parse(await req.json());
    const members: IrisMemberMeta[] = (body.members || []).map(m => ({
      username: m.username,
      displayName: m.displayName,
      telegramId: m.telegramId,
      firstName: m.firstName,
      lastName: m.lastName,
      avatarUrl: m.avatarData ? saveAvatar(m.username, m.avatarData) : undefined,
    }));

    const result = syncIrisSnapshot(body.group, body.text, body.sourceChat, members);
    const database = await persistIrisSnapshotToDatabase(body.group, body.sourceChat, body.text, members);

    let automation;
    updateDB(d => {
      d.adminAutomation = {
        ...d.adminAutomation,
        lastSyncAt: new Date().toISOString(),
        lastMessage: `${body.group}:${body.sourceChat}`,
        lastResult: result,
        syncRequestedAt: undefined,
        syncRequestedBy: undefined,
      };
      automation = d.adminAutomation;
    });

    return NextResponse.json({ ok: true, result, automation, database });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid request' }, { status: 400 });
  }
}
