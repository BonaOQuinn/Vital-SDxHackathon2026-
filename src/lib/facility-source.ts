// Server-only. Finds medical facilities near a point. Only coordinates leave
// the server here, never anything about the patient.
import { demoLocation } from "@/data";
import { ensenadaOsmElements } from "@/data/facilities-ensenada";
import { distanceKm, parseOsmFacilities, type CareRouteResponse, type Facility, type GeoPoint, type OsmElement } from "@/lib/care-routing";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const OVERPASS_TIMEOUT_MS = 12_000;
const SEARCH_RADIUS_M = 25_000;
/** Inside the 15 km the snapshot covers, so the closest facility is always in it. */
const SNAPSHOT_RADIUS_KM = 10;

export interface FacilityLookup {
  facilities: Facility[];
  dataSource: CareRouteResponse["dataSource"];
  emergencyNumber: string | null;
}

export async function findFacilities(origin: GeoPoint): Promise<FacilityLookup> {
  if (distanceKm(origin, demoLocation) <= SNAPSHOT_RADIUS_KM) {
    return { facilities: parseOsmFacilities(ensenadaOsmElements), dataSource: "snapshot", emergencyNumber: demoLocation.emergencyNumber };
  }

  const around = `(around:${SEARCH_RADIUS_M},${origin.lat},${origin.lng})`;
  const query = `[out:json][timeout:10];(nwr["amenity"~"^(hospital|clinic|doctors)$"]${around};nwr["healthcare"~"^(hospital|clinic|centre)$"]${around};);out center tags;`;
  try {
    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "vital-hackathon-demo" },
      body: new URLSearchParams({ data: query }),
      signal: AbortSignal.timeout(OVERPASS_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Overpass returned ${res.status}`);
    const json = (await res.json()) as { elements: OsmElement[] };
    return { facilities: parseOsmFacilities(json.elements), dataSource: "live", emergencyNumber: null };
  } catch (e) {
    console.error("facility lookup failed", e);
    return { facilities: [], dataSource: "unavailable", emergencyNumber: null };
  }
}
