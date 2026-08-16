import { createClient } from '@supabase/supabase-js';
import { parseIrisMessage, normalizeUsername, type AdminGroup, type IrisMemberMeta } from './admin-sync';

function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function metaFor(item: { username: string; displayName: string }, metadata: IrisMemberMeta[]) {
  const username = normalizeUsername(item.username);
  const display = normalizeUsername(item.displayName);
  return metadata.find(m => {
    const mu = normalizeUsername(m.username || '');
    const md = normalizeUsername(m.displayName || '');
    return mu === username || md === username || mu === display || md === display;
  });
}

/**
 * Production persistence for Iris snapshots.
 * The service-role key is server/worker-only and never sent to the browser.
 */
export async function persistIrisSnapshotToDatabase(
  group: AdminGroup,
  sourceChat: string,
  text: string,
  metadata: IrisMemberMeta[] = [],
) {
  const supabase = supabaseServer();
  if (!supabase) return { persisted: false as const, reason: 'supabase_not_configured' as const };

  const parsed = parseIrisMessage(text);
  const enriched = parsed.map(item => {
    const meta = metaFor(item, metadata);
    return {
      ...item,
      telegramId: Number(meta?.telegramId || 0) || undefined,
      firstName: meta?.firstName || undefined,
      lastName: meta?.lastName || undefined,
    };
  });

  const snapshot = await supabase.from('iris_admin_snapshots').insert({
    group_code: group,
    source_chat: sourceChat,
    raw_text: text,
    parsed_admins: enriched,
  }).select('id').single();
  if (snapshot.error) throw new Error(`Supabase snapshot insert: ${snapshot.error.message}`);

  const deleted = await supabase.from('iris_admin_assignments').delete().eq('group_code', group);
  if (deleted.error) throw new Error(`Supabase assignment cleanup: ${deleted.error.message}`);

  if (enriched.length) {
    const rows = enriched.map(item => ({
      username: normalizeUsername(item.username),
      display_name: item.displayName,
      telegram_id: item.telegramId || null,
      group_code: group,
      rank_code: item.rank,
      stars: item.stars,
      source_chat: sourceChat,
      seen_at: new Date().toISOString(),
    }));
    const inserted = await supabase.from('iris_admin_assignments').insert(rows);
    if (inserted.error) throw new Error(`Supabase assignment insert: ${inserted.error.message}`);
  }

  return {
    persisted: true as const,
    snapshotId: snapshot.data.id,
    count: enriched.length,
    linkedByTelegramId: enriched.filter(x => x.telegramId).length,
  };
}

export async function getSupabaseIrisRole(telegramId: number) {
  const supabase = supabaseServer();
  if (!supabase || !Number.isSafeInteger(telegramId) || telegramId <= 0) return null;

  const result = await supabase
    .from('iris_admin_assignments')
    .select('stars')
    .eq('telegram_id', telegramId);

  if (result.error) throw new Error(`Supabase Iris role lookup: ${result.error.message}`);
  if (!result.data?.length) return null;

  const stars = Math.max(...result.data.map(row => Number(row.stars) || 1), 1);
  return { stars };
}

export async function persistUserToDatabase(user: {
  id: string;
  telegramId: number;
  username: string;
  firstName: string;
  lastName?: string;
  avatarUrl?: string;
  stars: number;
  role: string;
}) {
  const supabase = supabaseServer();
  if (!supabase) return { persisted: false as const, reason: 'supabase_not_configured' as const };

  const role = await supabase.from('roles').select('id').eq('code', user.role).maybeSingle();
  if (role.error) throw new Error(`Supabase role lookup: ${role.error.message}`);

  const payload = {
    telegram_id: user.telegramId,
    username: user.username,
    first_name: user.firstName,
    last_name: user.lastName || null,
    avatar_url: user.avatarUrl || null,
    stars: user.stars,
    role_id: role.data?.id || null,
    updated_at: new Date().toISOString(),
  };

  const result = await supabase.from('users').upsert(payload, { onConflict: 'telegram_id' }).select('id').single();
  if (result.error) throw new Error(`Supabase user upsert: ${result.error.message}`);
  return { persisted: true as const, id: result.data.id };
}

export async function persistAdminCheckToDatabase(check: {id:string;adminId:string;reviewerId:string;checkedAt:string;messages:number;messagesMax:number;replies:number;repliesMax:number;score:number;maxScore:number;items:unknown[];repeatNotes:string[]}) {
  const supabase = supabaseServer();
  if (!supabase) return {persisted:false as const,reason:'supabase_not_configured' as const};
  const r=await supabase.from('checks').insert({id:check.id,user_id:check.adminId,reviewer_id:check.reviewerId,title:'Проверка администратора',checked_at:check.checkedAt,messages:check.messages,messages_max:check.messagesMax,replies:check.replies,replies_max:check.repliesMax,score:check.score,max_score:check.maxScore,items:check.items,repeat_notes:check.repeatNotes}).select('id').single();
  if(r.error)throw new Error(`Supabase check insert: ${r.error.message}`); return {persisted:true as const,id:r.data.id};
}

export async function persistAfkToDatabase(record: {id:string;userId:string;reason:string;startsAt:string;endsAt:string;active:boolean;createdBy:string;status:string;reviewedBy?:string;reviewedAt?:string;reviewComment?:string}) {
  const supabase = supabaseServer();
  if(!supabase)return {persisted:false as const,reason:'supabase_not_configured' as const};
  const r=await supabase.from('afk_records').upsert({id:record.id,user_id:record.userId,reason:record.reason,starts_at:record.startsAt,ends_at:record.endsAt,active:record.active,created_by:record.createdBy,status:record.status,reviewed_by:record.reviewedBy||null,reviewed_at:record.reviewedAt||null,review_comment:record.reviewComment||null},{onConflict:'id'}).select('id').single();
  if(r.error)throw new Error(`Supabase AFK upsert: ${r.error.message}`); return {persisted:true as const,id:r.data.id};
}
