// Emergency numbers by country, for the "Call emergency services" directory.
// `medical` is the number to dial for an ambulance; `general` is another emergency
// number (all-services or police) when it differs. Countries we could not confirm are left out rather than
// guessed. Before relying on it, verify locally: numbers change.
// In most countries 112 also connects from a mobile phone.

export interface EmergencyEntry {
  /** ISO 3166-1 alpha-2. */
  code: string;
  name: string;
  /** Spanish name, for search. */
  nameEs: string;
  medical: string;
  general?: string;
}

export const emergencyNumbers: EmergencyEntry[] = [
  { code: "AR", name: "Argentina", nameEs: "Argentina", medical: "107", general: "911" },
  { code: "AU", name: "Australia", nameEs: "Australia", medical: "000", general: "112" },
  { code: "AT", name: "Austria", nameEs: "Austria", medical: "144", general: "112" },
  { code: "BE", name: "Belgium", nameEs: "Bélgica", medical: "112" },
  { code: "BR", name: "Brazil", nameEs: "Brasil", medical: "192", general: "190" },
  { code: "BG", name: "Bulgaria", nameEs: "Bulgaria", medical: "112" },
  { code: "KH", name: "Cambodia", nameEs: "Camboya", medical: "119" },
  { code: "CA", name: "Canada", nameEs: "Canadá", medical: "911" },
  { code: "CL", name: "Chile", nameEs: "Chile", medical: "131" },
  { code: "CN", name: "China", nameEs: "China", medical: "120", general: "110" },
  { code: "CO", name: "Colombia", nameEs: "Colombia", medical: "123" },
  { code: "CR", name: "Costa Rica", nameEs: "Costa Rica", medical: "911" },
  { code: "HR", name: "Croatia", nameEs: "Croacia", medical: "194", general: "112" },
  { code: "CY", name: "Cyprus", nameEs: "Chipre", medical: "112" },
  { code: "CZ", name: "Czechia", nameEs: "Chequia", medical: "155", general: "112" },
  { code: "DK", name: "Denmark", nameEs: "Dinamarca", medical: "112" },
  { code: "DO", name: "Dominican Republic", nameEs: "República Dominicana", medical: "911" },
  { code: "EC", name: "Ecuador", nameEs: "Ecuador", medical: "911" },
  { code: "EG", name: "Egypt", nameEs: "Egipto", medical: "123", general: "122" },
  { code: "EE", name: "Estonia", nameEs: "Estonia", medical: "112" },
  { code: "FI", name: "Finland", nameEs: "Finlandia", medical: "112" },
  { code: "FR", name: "France", nameEs: "Francia", medical: "15", general: "112" },
  { code: "DE", name: "Germany", nameEs: "Alemania", medical: "112" },
  { code: "GR", name: "Greece", nameEs: "Grecia", medical: "166", general: "112" },
  { code: "HK", name: "Hong Kong", nameEs: "Hong Kong", medical: "999" },
  { code: "HU", name: "Hungary", nameEs: "Hungría", medical: "112" },
  { code: "IS", name: "Iceland", nameEs: "Islandia", medical: "112" },
  { code: "IN", name: "India", nameEs: "India", medical: "108", general: "112" },
  { code: "ID", name: "Indonesia", nameEs: "Indonesia", medical: "118", general: "112" },
  { code: "IE", name: "Ireland", nameEs: "Irlanda", medical: "112", general: "999" },
  { code: "IL", name: "Israel", nameEs: "Israel", medical: "101", general: "100" },
  { code: "IT", name: "Italy", nameEs: "Italia", medical: "118", general: "112" },
  { code: "JM", name: "Jamaica", nameEs: "Jamaica", medical: "110", general: "119" },
  { code: "JP", name: "Japan", nameEs: "Japón", medical: "119", general: "110" },
  { code: "KE", name: "Kenya", nameEs: "Kenia", medical: "999", general: "112" },
  { code: "KR", name: "South Korea", nameEs: "Corea del Sur", medical: "119", general: "112" },
  { code: "LV", name: "Latvia", nameEs: "Letonia", medical: "112" },
  { code: "LT", name: "Lithuania", nameEs: "Lituania", medical: "112" },
  { code: "LU", name: "Luxembourg", nameEs: "Luxemburgo", medical: "112" },
  { code: "MY", name: "Malaysia", nameEs: "Malasia", medical: "999" },
  { code: "MT", name: "Malta", nameEs: "Malta", medical: "112" },
  { code: "MX", name: "Mexico", nameEs: "México", medical: "911" },
  { code: "NP", name: "Nepal", nameEs: "Nepal", medical: "102", general: "100" },
  { code: "NL", name: "Netherlands", nameEs: "Países Bajos", medical: "112" },
  { code: "NZ", name: "New Zealand", nameEs: "Nueva Zelanda", medical: "111" },
  { code: "NG", name: "Nigeria", nameEs: "Nigeria", medical: "112" },
  { code: "NO", name: "Norway", nameEs: "Noruega", medical: "113", general: "112" },
  { code: "PK", name: "Pakistan", nameEs: "Pakistán", medical: "1122", general: "15" },
  { code: "PA", name: "Panama", nameEs: "Panamá", medical: "911" },
  { code: "PH", name: "Philippines", nameEs: "Filipinas", medical: "911" },
  { code: "PL", name: "Poland", nameEs: "Polonia", medical: "999", general: "112" },
  { code: "PT", name: "Portugal", nameEs: "Portugal", medical: "112" },
  { code: "PR", name: "Puerto Rico", nameEs: "Puerto Rico", medical: "911" },
  { code: "QA", name: "Qatar", nameEs: "Catar", medical: "999" },
  { code: "RO", name: "Romania", nameEs: "Rumania", medical: "112" },
  { code: "SA", name: "Saudi Arabia", nameEs: "Arabia Saudita", medical: "997", general: "911" },
  { code: "SG", name: "Singapore", nameEs: "Singapur", medical: "995", general: "999" },
  { code: "SK", name: "Slovakia", nameEs: "Eslovaquia", medical: "155", general: "112" },
  { code: "SI", name: "Slovenia", nameEs: "Eslovenia", medical: "112" },
  { code: "ZA", name: "South Africa", nameEs: "Sudáfrica", medical: "10177", general: "112" },
  { code: "ES", name: "Spain", nameEs: "España", medical: "112" },
  { code: "LK", name: "Sri Lanka", nameEs: "Sri Lanka", medical: "1990", general: "119" },
  { code: "SE", name: "Sweden", nameEs: "Suecia", medical: "112" },
  { code: "CH", name: "Switzerland", nameEs: "Suiza", medical: "144", general: "112" },
  { code: "TW", name: "Taiwan", nameEs: "Taiwán", medical: "119", general: "110" },
  { code: "TH", name: "Thailand", nameEs: "Tailandia", medical: "1669", general: "191" },
  { code: "TR", name: "Turkey", nameEs: "Turquía", medical: "112" },
  { code: "AE", name: "United Arab Emirates", nameEs: "Emiratos Árabes Unidos", medical: "998", general: "999" },
  { code: "GB", name: "United Kingdom", nameEs: "Reino Unido", medical: "999", general: "112" },
  { code: "US", name: "United States", nameEs: "Estados Unidos", medical: "911" },
  { code: "UY", name: "Uruguay", nameEs: "Uruguay", medical: "911" },
  { code: "VN", name: "Vietnam", nameEs: "Vietnam", medical: "115", general: "113" },
];

/** Regional-indicator flag emoji from an ISO code ("ES" -> 🇪🇸). */
export const flag = (code: string) => String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/** Matches English or Spanish name, ISO code, or the number itself. */
export function searchEmergency(query: string): EmergencyEntry[] {
  const q = fold(query.trim());
  if (!q) return emergencyNumbers;
  return emergencyNumbers.filter(
    (e) => fold(e.name).includes(q) || fold(e.nameEs).includes(q) || e.code.toLowerCase() === q || e.medical.startsWith(q) || e.general?.startsWith(q),
  );
}

export const findCountry = (code: string | null | undefined) => emergencyNumbers.find((e) => e.code === code?.toUpperCase());
