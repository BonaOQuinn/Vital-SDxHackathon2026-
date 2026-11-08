// Snapshot of OpenStreetMap medical facilities within 15 km of central Ensenada,
// taken 2026-11-08. Data (c) OpenStreetMap contributors, ODbL.
//
// Kept raw, including the mis-tagged entries, so it passes through the same
// filter as a live lookup. The live query took 37 s when tested, too slow for the demo.
import type { OsmElement } from "../lib/care-routing";

export const ensenadaOsmElements: OsmElement[] = [
  { type: "node", id: 7212520349, lat: 31.857142, lon: -116.60557, tags: { amenity: "hospital", healthcare: "hospital", emergency: "yes", name: "IMSS #8" } },
  { type: "node", id: 14304977601, lat: 31.8631975, lon: -116.5921061, tags: { amenity: "hospital", name: "Unidad de medicina familiar #25" } },
  { type: "way", id: 288816065, center: { lat: 31.8695904, lon: -116.6676631 }, tags: { amenity: "hospital", healthcare: "yes", name: "Enfermería CICESE" } },
  { type: "way", id: 334434744, center: { lat: 31.8732993, lon: -116.6354005 }, tags: { amenity: "hospital", name: "Red Cross" } },
  { type: "way", id: 338429781, center: { lat: 31.8764379, lon: -116.6208247 }, tags: { amenity: "hospital" } },
  { type: "way", id: 556075344, center: { lat: 31.8245218, lon: -116.6002675 }, tags: { amenity: "hospital", healthcare: "hospital", emergency: "yes", name: "Hospital General Ensenada" } },
  { type: "way", id: 772531394, center: { lat: 31.8565001, lon: -116.6053637 }, tags: { amenity: "hospital", healthcare: "hospital", emergency: "yes", name: "IMSS8 Estacionamiento Interno" } },
  { type: "way", id: 1072397204, center: { lat: 31.8557578, lon: -116.6166147 }, tags: { amenity: "hospital", healthcare: "hospital", emergency: "yes", name: "Hospital ISSSTECALI", phone: "+526461763401" } },
  { type: "way", id: 1077777596, center: { lat: 31.8501526, lon: -116.6075782 }, tags: { amenity: "hospital", healthcare: "hospital", name: 'Clinica Hospital "Ensenada"' } },
  { type: "way", id: 1536106946, center: { lat: 31.7822128, lon: -116.598133 }, tags: { amenity: "clinic", healthcare: "clinic", name: "Centro de Salud Chapultepec" } },
];
