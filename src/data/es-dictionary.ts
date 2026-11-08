// Static Spanish (Mexico) dictionary for fixed fields, so labels and codes
// never depend on the LLM. Each table is a full Record over its code type,
// so adding a code in types.ts without a translation fails to compile.
//
// First draft. The Spanish-fluent teammate must review it before the demo.

import type {
  AllergenCode,
  BloodType,
  BodyRegion,
  FrequencyCode,
  InjuryType,
  ReactionCode,
  RelationshipCode,
  RouteCode,
  SeverityCode,
  SexCode,
  Side,
  VitalSign,
} from "./types";

export const labelsEs = {
  patientProfile: "Perfil del paciente",
  fullName: "Nombre",
  age: "Edad",
  years: "años",
  dateOfBirth: "Fecha de nacimiento",
  sex: "Sexo",
  bloodType: "Tipo de sangre",
  weight: "Peso",
  height: "Estatura",
  allergies: "Alergias",
  reaction: "Reacción",
  severity: "Gravedad",
  currentMedications: "Medicamentos actuales",
  dose: "Dosis",
  frequency: "Frecuencia",
  route: "Vía",
  conditions: "Padecimientos",
  pastProcedures: "Cirugías previas",
  immunizations: "Vacunas",
  lastDose: "Última dosis",
  emergencyContacts: "Contactos de emergencia",
  additionalNotes: "Notas adicionales",
  noKnownAllergies: "Sin alergias conocidas",
  // Injury record
  injuryRecord: "Registro de lesiones",
  mechanism: "Mecanismo de la lesión",
  timeOfInjury: "Hora de la lesión",
  lossOfConsciousness: "Pérdida del conocimiento",
  injuries: "Lesiones",
  symptoms: "Síntomas",
  painScore: "Dolor (0 a 10)",
  vitals: "Signos vitales",
  interventions: "Intervenciones",
  openQuestions: "Preguntas pendientes",
  reportedByPatient: "Referido por el paciente",
  reportedByClinician: "Indicado por el personal médico",
  // Alerts and actions
  alert: "Alerta",
  allergyAlert: "Alerta de alergia",
  anticoagulantAlert: "Alerta: anticoagulante",
  callEmergencyServices: "Llamar a servicios de emergencia",
  confirm: "Confirmar",
  // Summaries
  doctorSummary: "Resumen para el médico",
  nurseSummary: "Resumen para enfermería",
  emsSummary: "Resumen para paramédicos",
  chiefComplaint: "Motivo de consulta",
  findings: "Hallazgos referidos",
  criticalAlerts: "Alertas críticas",
  relevantHistory: "Antecedentes relevantes",
  pendingTasks: "Pendientes",
  linkExpired: "Este enlace ha expirado.",
  yes: "Sí",
  no: "No",
  unknown: "Desconocido",
} as const;

export const bloodTypeEs: Record<BloodType, string> = {
  "O+": "O positivo",
  "O-": "O negativo",
  "A+": "A positivo",
  "A-": "A negativo",
  "B+": "B positivo",
  "B-": "B negativo",
  "AB+": "AB positivo",
  "AB-": "AB negativo",
  unknown: "Desconocido",
};

export const sexEs: Record<SexCode, string> = {
  female: "Femenino",
  male: "Masculino",
  intersex: "Intersexual",
  not_specified: "No especificado",
};

export const allergenEs: Record<AllergenCode, string> = {
  penicillin: "Penicilina",
  amoxicillin: "Amoxicilina",
  cephalosporins: "Cefalosporinas",
  sulfonamides: "Sulfonamidas (sulfas)",
  nsaids: "AINE (antiinflamatorios no esteroideos)",
  aspirin: "Ácido acetilsalicílico (aspirina)",
  latex: "Látex",
  iodine_contrast: "Medio de contraste yodado",
  peanut: "Cacahuate",
  shellfish: "Mariscos",
};

export const reactionEs: Record<ReactionCode, string> = {
  anaphylaxis: "Anafilaxia",
  hives: "Urticaria",
  rash: "Erupción cutánea",
  swelling: "Hinchazón",
  breathing_difficulty: "Dificultad para respirar",
  nausea: "Náuseas",
};

export const severityEs: Record<SeverityCode, string> = {
  mild: "Leve",
  moderate: "Moderada",
  severe: "Grave",
};

export const frequencyEs: Record<FrequencyCode, string> = {
  once_daily: "Una vez al día",
  twice_daily: "Dos veces al día",
  three_times_daily: "Tres veces al día",
  as_needed: "Según sea necesario",
  once: "Dosis única",
};

export const routeEs: Record<RouteCode, string> = {
  oral: "Oral",
  iv: "Intravenosa",
  im: "Intramuscular",
  subcutaneous: "Subcutánea",
  topical: "Tópica",
};

export const relationshipEs: Record<RelationshipCode, string> = {
  spouse: "Cónyuge",
  partner: "Pareja",
  parent: "Padre o madre",
  sibling: "Hermano o hermana",
  child: "Hijo o hija",
  friend: "Amistad",
  primary_care_doctor: "Médico de cabecera",
};

export const bodyRegionEs: Record<BodyRegion, string> = {
  head: "Cabeza",
  face: "Cara",
  neck: "Cuello",
  chest: "Tórax",
  abdomen: "Abdomen",
  back: "Espalda",
  shoulder: "Hombro",
  upper_arm: "Brazo",
  elbow: "Codo",
  forearm: "Antebrazo",
  wrist: "Muñeca",
  hand: "Mano",
  hip: "Cadera",
  thigh: "Muslo",
  knee: "Rodilla",
  lower_leg: "Pierna",
  ankle: "Tobillo",
  foot: "Pie",
};

export const sideEs: Record<Side, string> = {
  left: "izquierdo",
  right: "derecho",
  both: "bilateral",
  midline: "línea media",
};

export const injuryTypeEs: Record<InjuryType, string> = {
  laceration: "Herida cortante (laceración)",
  abrasion: "Raspón (abrasión)",
  contusion: "Golpe (contusión)",
  burn: "Quemadura",
  possible_fracture: "Posible fractura",
  sprain: "Esguince",
  head_strike: "Golpe en la cabeza",
  other: "Otra",
};

export const vitalKindEs: Record<VitalSign["kind"], string> = {
  heart_rate: "Frecuencia cardiaca",
  blood_pressure: "Presión arterial",
  respiratory_rate: "Frecuencia respiratoria",
  spo2: "Saturación de oxígeno",
  temperature: "Temperatura",
  gcs: "Escala de Glasgow",
};

/** Shown at the bottom of every Spanish summary. */
export const disclaimerEs =
  "Vital traduce y organiza lo que se dijo en la consulta. No emite diagnósticos ni sustituye a un intérprete profesional ni a los servicios de emergencia. Verifique los datos críticos con el paciente.";

/** Shown at the bottom of the English patient summary. */
export const disclaimerEn =
  "Vital translates and organizes what was said during your visit. It does not diagnose and does not replace a professional interpreter or emergency services. Follow the instructions of the medical staff who treated you.";
