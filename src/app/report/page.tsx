"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { allergenEs, bloodTypeEs, disclaimerEn, disclaimerEs, frequencyEs, relationshipEs } from "@/data";
import { AlertIcon, ChevronLeftIcon } from "@/components/icons";
import { allergenEn, bloodTypeEn, frequencyEn, relationshipEn } from "@/lib/labels-en";
import { loadProfile } from "@/lib/profile-store";
import type { PatientEmergencyReport, ReportRequest } from "@/lib/report";
import { loadApprovals, loadMeta, loadSession } from "@/lib/session-store";
import { blankProfile, buildSharedProfile, sections } from "@/lib/sharing";
import { formatCm, formatKg, formatLb } from "@/lib/units";

type L = "en" | "es";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="break-inside-avoid border-t border-line py-4">
      <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-3">{title}</h2>
      <div className="mt-1.5 text-[16px] leading-snug">{children}</div>
    </section>
  );
}

const List = ({ items, empty }: { items: string[]; empty: string }) =>
  items.length ? (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((x, i) => (
        <li key={i}>{x}</li>
      ))}
    </ul>
  ) : (
    <p className="text-ink-3">{empty}</p>
  );

export default function ReportPage() {
  const [report, setReport] = useState<PatientEmergencyReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<L>("es");
  // Bona's /api/session/<id>/end writes the stored doctor/patient summaries and returns a share link.
  const [link, setLink] = useState<{ state: "pending" | "ready" | "unavailable"; path?: string }>({ state: "pending" });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const profile = loadProfile();
    const session = loadSession();
    if (!session) {
      setError("No conversation found. Start a translation session first.");
      return;
    }
    const body: ReportRequest = {
      sessionId: session.sessionId,
      startedAt: session.startedAt,
      profile: profile ? buildSharedProfile(profile, loadMeta(), loadApprovals()) : blankProfile,
      turns: session.turns,
      notes: session.notes,
      warnings: session.warnings,
    };
    if (session.turns.length === 0) setLink({ state: "unavailable" });
    else
      fetch(`/api/session/${session.sessionId}/end`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile: body.profile }) })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((r: { path: string }) => setLink({ state: "ready", path: r.path }))
        .catch(() => setLink({ state: "unavailable" }));
    fetch("/api/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setReport)
      .catch(() => setError("The report could not be generated. Check your connection and reload."));
  }, []);

  if (error)
    return (
      <main className="mx-auto max-w-[720px] px-6 py-10">
        <p className="text-[17px]">{error}</p>
        <Link href="/share" className="mt-4 inline-block text-blue underline">Go to profile</Link>
      </main>
    );
  if (!report) return <main className="mx-auto max-w-[720px] px-6 py-10 text-[17px] text-ink-2">Generating Patient Emergency Report…</main>;

  const p = report.profile;
  const n = report.narrative;
  const t = (en: string, es: string) => (lang === "en" ? en : es);
  const pick = (x: { en: string; es: string }) => x[lang];
  const notShared = t("Not shared by the patient", "No compartido por el paciente");
  const unverified = new Set(p.unverified);
  const shared = new Set(p.approved);
  const tag = (id: (typeof sections)[number]["id"]) =>
    unverified.has(id) ? <span className="ml-2 rounded bg-red-soft px-1.5 py-0.5 text-[12px] font-bold text-red">{t("UNVERIFIED", "NO VERIFICADO")}</span> : null;

  return (
    <main className="mx-auto max-w-[720px] bg-surface px-6 pt-[max(env(safe-area-inset-top),16px)] pb-12 print:max-w-none">
      <header className="flex items-center justify-between print:hidden">
        <Link href="/conversation" className="-ml-2 flex h-11 items-center gap-1 px-2 text-[17px] text-blue">
          <ChevronLeftIcon />
          Back
        </Link>
        <div className="flex gap-2">
          <div className="flex rounded-full border border-line p-0.5 text-[14px] font-semibold">
            {(["es", "en"] as L[]).map((l) => (
              <button key={l} onClick={() => setLang(l)} className={`rounded-full px-3 py-1 ${lang === l ? "bg-blue text-white" : "text-ink-2"}`}>
                {l === "es" ? "Español" : "English"}
              </button>
            ))}
          </div>
          <button onClick={() => window.print()} className="rounded-full bg-blue px-4 py-1 text-[14px] font-semibold text-white">
            {t("Print", "Imprimir")}
          </button>
        </div>
      </header>

      <div className="mt-4 rounded-card bg-blue-soft p-3 text-[14px] print:hidden">
        {link.state === "pending" && <p className="text-ink-2">{t("Saving the shareable summary…", "Guardando el resumen para compartir…")}</p>}
        {link.state === "unavailable" && <p className="text-ink-2">{t("Shareable link unavailable (session not saved). This report is still complete on this device.", "Enlace no disponible (sesión no guardada). Este reporte sigue completo en este dispositivo.")}</p>}
        {link.state === "ready" && link.path && (
          <div className="flex items-center gap-2">
            <a href={link.path} className="min-w-0 flex-1 truncate font-semibold text-blue underline">{`${window.location.origin}${link.path}`}</a>
            <button
              onClick={() => navigator.clipboard?.writeText(`${window.location.origin}${link.path}`).then(() => setCopied(true)).catch(() => {})}
              className="shrink-0 rounded-full bg-blue px-3 py-1 font-semibold text-white"
            >
              {copied ? t("Copied", "Copiado") : t("Copy link", "Copiar enlace")}
            </button>
          </div>
        )}
      </div>

      <h1 className="mt-4 text-[28px] font-bold leading-tight">{t("Patient Emergency Report", "Reporte de emergencia del paciente")}</h1>
      <p className="mt-1 text-[14px] text-ink-3">
        {new Date(report.generatedAt).toLocaleString(lang === "en" ? "en-US" : "es-ES")} · {report.turns.length} {t("turns", "intervenciones")}
        {report.engine === "fallback" ? t(" · narrative from notes", " · narrativa desde notas") : ""}
      </p>

      <Section title={t("Patient", "Paciente")}>
        {shared.has("identity") ? (
          <p>
            <b>{p.fullName}</b> · {p.dateOfBirth} {tag("identity")}
          </p>
        ) : (
          <p className="text-ink-3">{notShared}</p>
        )}
        {shared.has("body") && (
          <p className="mt-1">
            {formatKg(p.weight.kg)}
            {p.weight.entered.unit === "lb" ? ` (${formatLb(p.weight.entered.value)})` : ""} · {formatCm(p.height.cm)}
          </p>
        )}
      </Section>

      {report.warnings.length > 0 && (
        <Section title={t("Warnings and inconsistencies", "Alertas e inconsistencias")}>
          <ul className="space-y-2">
            {report.warnings.map((w) => (
              <li key={w.id} className="flex gap-2 rounded-lg bg-red-soft p-2.5 text-red">
                <AlertIcon size={18} className="mt-0.5 shrink-0" />
                <span>
                  {w.message[lang]}{" "}
                  <b>
                    {w.resolution === "confirmed" ? t("(reviewed)", "(revisado)") : w.resolution === "corrected" ? t("(profile to be corrected)", "(perfil por corregir)") : t("(not reviewed)", "(sin revisar)")}
                  </b>
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title={t("What happened", "Qué pasó")}>
        <p>{pick(n.whatHappened)}</p>
      </Section>
      <Section title={t("Injuries", "Lesiones")}>
        <List items={n.injuries.map(pick)} empty={t("None described", "No se describieron")} />
      </Section>
      <Section title={t("Symptoms", "Síntomas")}>
        <List items={n.symptoms.map(pick)} empty={t("None described", "No se describieron")} />
      </Section>
      <Section title={t("Timeline", "Cronología")}>
        <List items={n.timeline.map(pick)} empty={t("Not stated", "No se mencionó")} />
      </Section>
      <Section title={t("Treatment during the visit", "Tratamiento en la consulta")}>
        <List items={n.treatment.map(pick)} empty={t("None stated", "No se mencionó")} />
      </Section>
      <Section title={t("Clinician instructions", "Indicaciones del médico")}>
        <List items={n.instructions.map(pick)} empty={t("None stated", "No se mencionaron")} />
      </Section>

      <Section title={t("Allergies", "Alergias")}>
        {shared.has("allergies") ? (
          <>
            {tag("allergies")}
            <List items={p.allergies.map((a) => `${lang === "en" ? allergenEn[a.allergen] : allergenEs[a.allergen]} (${a.severity})`)} empty={t("No known allergies", "Sin alergias conocidas")} />
          </>
        ) : (
          <p className="text-ink-3">{notShared}</p>
        )}
      </Section>
      <Section title={t("Current medications", "Medicamentos actuales")}>
        {shared.has("medications") ? (
          <>
            {tag("medications")}
            <List items={p.medications.map((m) => `${m.name} ${m.dose.amount} ${m.dose.unit}, ${lang === "en" ? frequencyEn[m.frequency] : frequencyEs[m.frequency]}`)} empty={t("None", "Ninguno")} />
          </>
        ) : (
          <p className="text-ink-3">{notShared}</p>
        )}
      </Section>
      <Section title={t("Blood type", "Tipo de sangre")}>
        {shared.has("bloodType") ? <p>{lang === "en" ? bloodTypeEn(p.bloodType) : bloodTypeEs[p.bloodType]} {tag("bloodType")}</p> : <p className="text-ink-3">{notShared}</p>}
      </Section>
      <Section title={t("Medical history", "Antecedentes")}>
        {shared.has("conditions") || shared.has("history") ? (
          <List
            items={[...p.conditions.map((c) => pick(c.name)), ...p.pastProcedures.map((x) => `${pick(x.name)} (${x.year})`), ...p.immunizations.map((x) => `${pick(x.name)}: ${x.lastDose}`)]}
            empty={t("None recorded", "Sin registros")}
          />
        ) : (
          <p className="text-ink-3">{notShared}</p>
        )}
      </Section>
      <Section title={t("Emergency contacts", "Contactos de emergencia")}>
        {shared.has("contacts") ? (
          <List items={p.emergencyContacts.map((c) => `${c.name} (${lang === "en" ? relationshipEn[c.relationship] : relationshipEs[c.relationship]}) ${c.phone}`)} empty={t("None", "Ninguno")} />
        ) : (
          <p className="text-ink-3">{notShared}</p>
        )}
      </Section>
      {p.insurance && (
        <Section title={t("Insurance", "Seguro médico")}>
          <p>
            {p.insurance.provider} · {p.insurance.memberId} {tag("insurance")}
          </p>
        </Section>
      )}

      <Section title={t("Conversation notes", "Notas de la conversación")}>
        <List items={report.notes.map((x) => `[${x.category}] ${x.text}`)} empty={t("No notes", "Sin notas")} />
      </Section>
      <Section title={t("Transcript", "Transcripción")}>
        <ol className="space-y-2">
          {report.turns.map((x, i) => (
            <li key={i}>
              <b>{x.speaker === "patient" ? t("Patient", "Paciente") : t("Clinician", "Médico")}:</b> {x.original}
              <br />
              <span className="text-ink-2">→ {x.translation}</span>
            </li>
          ))}
        </ol>
      </Section>

      <p className="mt-6 rounded-lg bg-bg p-3 text-[13px] leading-snug text-ink-2">{lang === "en" ? disclaimerEn : disclaimerEs}</p>
    </main>
  );
}
