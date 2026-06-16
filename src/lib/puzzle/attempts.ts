import { createAdminClient } from "@/lib/supabase/admin";
import type { Actor, AttemptRow } from "@/lib/puzzle/server-types";

export const TERMINAL_STATUSES = new Set(["succeeded", "failed", "abandoned"]);
export const COMPLETED_FEEDBACK_STATUSES = new Set(["succeeded", "failed"]);

export const ATTEMPT_SELECT = "id,publication_id,user_id,anonymous_session_id,started_at,submitted_at,elapsed_ms,used_clue_count,is_correct,status,is_ranked";

export async function getAttempt(publicationId: string, actor: Actor) {
  const admin = createAdminClient();
  let query = admin
    .from("attempts")
    .select(ATTEMPT_SELECT)
    .eq("publication_id", publicationId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (actor.userId) {
    query = query.eq("user_id", actor.userId);
  } else {
    if (!actor.anonymousSessionId) return null;
    query = query.eq("anonymous_session_id", actor.anonymousSessionId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data as AttemptRow | null;
}

export async function getAnonymousAttempt(publicationId: string, anonymousSessionId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("attempts")
    .select(ATTEMPT_SELECT)
    .eq("publication_id", publicationId)
    .eq("anonymous_session_id", anonymousSessionId)
    .is("user_id", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as AttemptRow | null;
}
