// Remembers on this phone that the user accepted the emergency disclaimer.
// Browser storage can be unavailable (private mode), so every access is guarded.
const DISCLAIMER_KEY = "vital.disclaimerAcceptedAt";

export function acceptDisclaimer(): void {
  try {
    localStorage.setItem(DISCLAIMER_KEY, new Date().toISOString());
  } catch {
    // Storage blocked: the user will see the disclaimer again next time.
  }
}

export function hasAcceptedDisclaimer(): boolean {
  try {
    return localStorage.getItem(DISCLAIMER_KEY) !== null;
  } catch {
    return false;
  }
}
