// Browser storage for profile metadata, per-section approvals and the live
// conversation. Every access is guarded: storage can be unavailable.
import type { Note } from "@/lib/contract";
import type { ReviewedWarning, SessionTurn } from "@/lib/report";
import type { Approvals, ProfileMeta } from "@/lib/sharing";

const META_KEY = "vital.profileMeta";
const APPROVALS_KEY = "vital.approvals";
const SESSION_KEY = "vital.session";

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked: state lives only in memory for this page.
  }
}

export const loadMeta = (): ProfileMeta => read<ProfileMeta>(META_KEY) ?? { source: "manual", unverified: [] };
export const saveMeta = (m: ProfileMeta) => write(META_KEY, m);

export const loadApprovals = (): Approvals => read<Approvals>(APPROVALS_KEY) ?? {};
export const saveApprovals = (a: Approvals) => write(APPROVALS_KEY, a);

export interface StoredSession {
  sessionId: string;
  startedAt: string;
  endedAt?: string;
  turns: SessionTurn[];
  notes: Note[];
  warnings: ReviewedWarning[];
}

export const loadSession = (): StoredSession | null => read<StoredSession>(SESSION_KEY);
export const saveSession = (s: StoredSession) => write(SESSION_KEY, s);
