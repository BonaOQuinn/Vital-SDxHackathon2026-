// Turns the injury record into citable items, so the live translation can be
// grounded in the report. Plain code: Claude only names item ids, and any id
// that is not in the report is dropped, so a citation can never be invented.
import type { InjuryRecord, LocalizedText, Source, Speaker, Turn, VitalSign } from "../data/types";

export type ReportItemKind = "mechanism" | "injury" | "symptom" | "vital" | "treatment";

export interface ReportItem {
  id: string;
  kind: ReportItemKind;
  text: LocalizedText;
  source: Source;
}

/** A report item that an utterance referred to, with the words it was recorded from. */
export interface ReportCitation {
  id: string;
  text: LocalizedText;
  reportedBy: Speaker;
  turn: number;
  quote?: string;
}

const MAX_CITATIONS = 3;

const VITAL_NAME: Record<VitalSign["kind"], LocalizedText> = {
  heart_rate: { en: "Heart rate", es: "Frecuencia cardiaca" },
  blood_pressure: { en: "Blood pressure", es: "Presión arterial" },
  respiratory_rate: { en: "Respiratory rate", es: "Frecuencia respiratoria" },
  spo2: { en: "Oxygen level", es: "Saturación de oxígeno" },
  temperature: { en: "Temperature", es: "Temperatura" },
  gcs: { en: "Glasgow score", es: "Escala de Glasgow" },
};

function vitalItem(v: VitalSign): ReportItem {
  const value = typeof v.value === "number" ? `${v.value}` : `${v.value.systolic}/${v.value.diastolic}`;
  const name = VITAL_NAME[v.kind];
  return { id: `vital-${v.kind}`, kind: "vital", text: { en: `${name.en}: ${value} ${v.unit}`, es: `${name.es}: ${value} ${v.unit}` }, source: v.source };
}

/** Accepts an empty or partial record: a session has none until extraction runs. */
export function reportItems(record: Partial<InjuryRecord> | null | undefined): ReportItem[] {
  if (!record) return [];
  const { mechanism, injuries = [], symptoms = [], vitals = [], interventions = [] } = record;
  return [
    ...(mechanism ? [{ id: "mechanism", kind: "mechanism" as const, text: mechanism.description, source: mechanism.source }] : []),
    ...injuries.map((i) => ({ id: i.id, kind: "injury" as const, text: i.description, source: i.source })),
    ...symptoms.map((s) => ({ id: s.id, kind: "symptom" as const, text: s.description, source: s.source })),
    ...vitals.map(vitalItem),
    ...interventions.map((i) => ({ id: i.id, kind: "treatment" as const, text: i.description, source: i.source })),
  ];
}

export function reportForPrompt(items: ReportItem[]): string {
  return items.map((item) => `- [${item.id}] (${item.kind}) ${item.text.en}`).join("\n");
}

export function resolveGrounding(refs: string[], items: ReportItem[], transcript: Pick<Turn, "index" | "original">[]): ReportCitation[] {
  const citations: ReportCitation[] = [];
  for (const id of new Set(refs)) {
    const item = items.find((candidate) => candidate.id === id);
    if (!item) continue;
    const turn = item.source.updatedTurn ?? item.source.turn;
    citations.push({ id, text: item.text, reportedBy: item.source.reportedBy, turn, quote: transcript.find((t) => t.index === turn)?.original });
  }
  return citations.slice(0, MAX_CITATIONS);
}
