import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Turn } from "@/data/types";

let client: SupabaseClient | undefined;
/** Server-only Supabase client using the service-role key. */
export const db = () =>
  (client ??= createClient(env.supabaseUrl, env.supabaseServiceKey, { auth: { persistSession: false } }));

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Only uuid session ids are stored. Anything else (mock ids) skips the database. */
export const isSessionId = (s: string) => UUID.test(s);

/** Appends a turn atomically (creating the session on first use). Returns the turn index. */
export async function appendTurn(sessionId: string, turn: Omit<Turn, "index">): Promise<number> {
  const { data, error } = await db().rpc("append_turn", { p_session: sessionId, p_turn: turn });
  if (error) throw new Error(`append_turn failed: ${error.message}`);
  return (data as { index: number }).index;
}

export interface SessionRow {
  id: string;
  profile_id: string | null;
  transcript: Turn[];
  injury_record: unknown;
  summary_es: unknown;
  summary_en: unknown;
  status: "active" | "ended";
  expires_at: string;
  updated_at: string;
}

export async function getSession(sessionId: string): Promise<SessionRow | null> {
  const { data, error } = await db().from("sessions").select("*").eq("id", sessionId).maybeSingle();
  if (error) throw new Error(`getSession failed: ${error.message}`);
  return data as SessionRow | null;
}
