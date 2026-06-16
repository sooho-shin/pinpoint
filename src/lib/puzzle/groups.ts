import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActor, SHARE_GROUP_COOKIE } from "@/lib/puzzle/actor";
import { syncUserGroupLeaderboardEntries } from "@/lib/puzzle/leaderboard";
import { getTodayPublication } from "@/lib/puzzle/publication";
import { getProfile } from "@/lib/puzzle/profiles";
import { createInviteCode } from "@/lib/puzzle/server-format";
import type { GroupRow } from "@/lib/puzzle/server-types";

async function getGroupByInviteCode(inviteCode: string) {
  const { publication } = await getTodayPublication();
  if (!publication) return { publication: null, group: null };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("groups")
    .select("id,owner_user_id,publication_id,name,invite_code")
    .eq("publication_id", publication.id)
    .eq("invite_code", inviteCode)
    .maybeSingle();
  if (error) throw error;

  return {
    publication,
    group: data as GroupRow | null
  };
}

async function addGroupMemberAndProjection(group: GroupRow, userId: string) {
  const admin = createAdminClient();
  const { error: memberError } = await admin
    .from("group_members")
    .upsert({ group_id: group.id, user_id: userId }, { onConflict: "group_id,user_id", ignoreDuplicates: true });
  if (memberError) throw memberError;

  await syncUserGroupLeaderboardEntries(group.publication_id, userId);
}

function publicGroup(group: GroupRow) {
  return {
    id: group.id,
    name: group.name ?? "그룹 랭킹",
    inviteCode: group.invite_code
  };
}

export async function createRankingGroup(input: { name?: string }) {
  const actor = await getActor();
  const { publication } = await getTodayPublication();
  if (!publication) return { ok: false, error: "오늘 공개된 문제가 없습니다." };

  const profile = actor.userId ? await getProfile(actor.userId) : null;

  const trimmedName = String(input.name ?? "").trim();
  const groupName = trimmedName.length > 0 ? trimmedName.slice(0, 24) : profile ? `${profile.nickname}의 그룹` : "공유 그룹";
  const admin = createAdminClient();
  const cookieStore = await cookies();

  if (actor.userId && !trimmedName) {
    const { data: existing, error } = await admin
      .from("groups")
      .select("id,owner_user_id,publication_id,name,invite_code")
      .eq("publication_id", publication.id)
      .eq("owner_user_id", actor.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (existing) {
      const group = existing as GroupRow;
      if (profile) await addGroupMemberAndProjection(group, actor.userId);
      return { ok: true, group: publicGroup(group), reused: true };
    }
  } else if (!actor.userId) {
    const [cookiePublicationId, cookieInviteCode] = String(cookieStore.get(SHARE_GROUP_COOKIE)?.value ?? "").split(":");
    if (cookiePublicationId === publication.id && /^[0-9a-z]{6,24}$/i.test(cookieInviteCode ?? "")) {
      const { data: existing, error } = await admin
        .from("groups")
        .select("id,owner_user_id,publication_id,name,invite_code")
        .eq("publication_id", publication.id)
        .eq("invite_code", cookieInviteCode)
        .is("owner_user_id", null)
        .maybeSingle();
      if (error) throw error;
      if (existing) return { ok: true, group: publicGroup(existing as GroupRow), reused: true };
    }
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = createInviteCode();
    const { data, error } = await admin
      .from("groups")
      .insert({
        owner_user_id: actor.userId,
        publication_id: publication.id,
        name: groupName,
        invite_code: inviteCode
      })
      .select("id,owner_user_id,publication_id,name,invite_code")
      .single();

    if (error && String(error.code) === "23505") continue;
    if (error) throw error;

    const group = data as GroupRow;
    if (actor.userId && profile) await addGroupMemberAndProjection(group, actor.userId);
    if (!actor.userId) {
      cookieStore.set(SHARE_GROUP_COOKIE, `${publication.id}:${group.invite_code}`, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 2
      });
    }
    return { ok: true, group: publicGroup(group), reused: false };
  }

  return { ok: false, error: "초대 코드를 만들지 못했습니다. 다시 시도해 주세요." };
}

export async function joinRankingGroup(inviteCode: string) {
  const code = inviteCode.trim();
  if (!code) return { ok: false, error: "초대 코드가 필요합니다." };

  const actor = await getActor();
  if (!actor.userId) return { ok: false, error: "로그인이 필요합니다.", requiresSignIn: true };

  const profile = await getProfile(actor.userId);
  if (!profile) return { ok: false, error: "닉네임 설정이 필요합니다.", requiresNickname: true };

  const { group } = await getGroupByInviteCode(code);
  if (!group) return { ok: false, error: "오늘 문제의 그룹 초대 링크가 아닙니다." };

  await addGroupMemberAndProjection(group, actor.userId);
  return {
    ok: true,
    group: publicGroup(group)
  };
}

export async function getGroupLeaderboard(inviteCode: string) {
  const code = inviteCode.trim();
  const actor = await getActor();
  const { publishDateKst, publication } = await getTodayPublication();
  if (!publication) {
    return { status: "no_puzzle", publishDateKst, rows: [], group: null };
  }
  if (!code) {
    return { status: "missing_code", publishDateKst, rows: [], group: null, message: "그룹 초대 링크가 필요합니다." };
  }

  const { group } = await getGroupByInviteCode(code);
  if (!group) {
    return {
      status: "not_found",
      publishDateKst: publication.publish_date_kst,
      rows: [],
      group: null,
      message: "오늘 문제의 그룹 초대 링크가 아닙니다."
    };
  }

  if (!actor.userId) {
    return {
      status: "requires_sign_in",
      publishDateKst: publication.publish_date_kst,
      rows: [],
      group: { id: group.id, name: group.name ?? "그룹 랭킹", inviteCode: group.invite_code },
      message: "로그인하면 이 그룹 랭킹에 참여할 수 있습니다.",
      requiresSignIn: true
    };
  }

  const profile = await getProfile(actor.userId);
  if (!profile) {
    return {
      status: "requires_nickname",
      publishDateKst: publication.publish_date_kst,
      rows: [],
      group: { id: group.id, name: group.name ?? "그룹 랭킹", inviteCode: group.invite_code },
      message: "닉네임을 설정하면 이 그룹 랭킹에 참여할 수 있습니다.",
      requiresNickname: true
    };
  }

  await addGroupMemberAndProjection(group, actor.userId);

  const admin = createAdminClient();
  const { data: links, error: linkError } = await admin
    .from("group_leaderboard_entries")
    .select("leaderboard_entry_id")
    .eq("group_id", group.id);
  if (linkError) throw linkError;

  const leaderboardEntryIds = (links ?? []).map((row) => String(row.leaderboard_entry_id));
  if (leaderboardEntryIds.length === 0) {
    return {
      status: "ready",
      publishDateKst: publication.publish_date_kst,
      rows: [],
      group: { id: group.id, name: group.name ?? "그룹 랭킹", inviteCode: group.invite_code },
      isMember: true,
      myRank: null
    };
  }

  const { data, error } = await admin
    .from("leaderboard_entries")
    .select("id,user_id,nickname_snapshot,used_clue_count,elapsed_ms,submitted_at")
    .in("id", leaderboardEntryIds)
    .eq("rank_status", "visible")
    .order("used_clue_count", { ascending: true })
    .order("elapsed_ms", { ascending: true })
    .order("submitted_at", { ascending: true })
    .limit(50);
  if (error) throw error;

  const rows = (data ?? []).map((row, index) => ({
    id: String(row.id),
    rank: index + 1,
    nickname: String(row.nickname_snapshot),
    usedClueCount: Number(row.used_clue_count),
    elapsedMs: Number(row.elapsed_ms),
    submittedAt: String(row.submitted_at),
    isMe: row.user_id === actor.userId
  }));

  return {
    status: "ready",
    publishDateKst: publication.publish_date_kst,
    rows,
    group: { id: group.id, name: group.name ?? "그룹 랭킹", inviteCode: group.invite_code },
    isMember: true,
    myRank: rows.find((row) => row.isMe) ?? null
  };
}
