// Saves the patient profile on this phone (browser storage).
// Later this can sync to the backend `profiles` table.
import type { PatientProfile } from "@/data";

const PROFILE_KEY = "vital.profile";

export function saveProfile(profile: PatientProfile): boolean {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}

export function loadProfile(): PatientProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as PatientProfile) : null;
  } catch {
    return null;
  }
}
