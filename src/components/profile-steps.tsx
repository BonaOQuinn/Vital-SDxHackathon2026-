"use client";

// The five short pages of profile setup. Each page owns its own "add" form and
// footer button, so anything typed but not yet added is kept when the user
// taps Next.
import { useState } from "react";
import type {
  AllergenCode,
  Allergy,
  BloodType,
  Condition,
  Dose,
  EmergencyContact,
  FrequencyCode,
  Height,
  LengthUnit,
  Medication,
  ReactionCode,
  RelationshipCode,
  RouteCode,
  SeverityCode,
  SexCode,
  Weight,
  WeightUnit,
} from "@/data";
import {
  allergenCrossReactive,
  allergenEn,
  bloodTypeEn,
  bloodTypes,
  doseUnits,
  frequencyEn,
  reactionEn,
  relationshipEn,
  routeEn,
  severityEn,
  sexEn,
} from "@/lib/labels-en";
import { cmToFtIn, formatCm, formatFtIn, formatKg, formatLb, ftInToCm, kgToLb, lbToKg, roundTo } from "@/lib/units";
import { Chip, Field, ItemCard, PrimaryButton, SecondaryButton, Segmented, Select, TextInput } from "./form";

/** Positive finite number from a text field, or null. */
function num(s: string): number | null {
  const n = Number(s.replace(",", "."));
  return s.trim() !== "" && Number.isFinite(n) && n > 0 ? n : null;
}

// ---------- 1. About you ----------

export interface AboutDraft {
  fullName: string;
  dateOfBirth: string;
  sex: SexCode;
  bloodType: BloodType;
  heightUnit: LengthUnit;
  heightCm: string;
  heightFt: string;
  heightIn: string;
  weightUnit: WeightUnit;
  weightValue: string;
}

export const emptyAbout: AboutDraft = {
  fullName: "",
  dateOfBirth: "",
  sex: "not_specified",
  bloodType: "unknown",
  heightUnit: "ft_in",
  heightCm: "",
  heightFt: "",
  heightIn: "",
  weightUnit: "lb",
  weightValue: "",
};

export function heightFromDraft(d: AboutDraft): Height | null {
  if (d.heightUnit === "cm") {
    const cm = num(d.heightCm);
    return cm ? { cm: roundTo(cm, 1), entered: { unit: "cm", value: cm } } : null;
  }
  const ft = num(d.heightFt);
  const inches = d.heightIn.trim() === "" ? 0 : Number(d.heightIn);
  if (!ft || !Number.isFinite(inches) || inches < 0 || inches >= 12) return null;
  return { cm: roundTo(ftInToCm(ft, inches), 1), entered: { unit: "ft_in", ft, in: inches } };
}

export function weightFromDraft(d: AboutDraft): Weight | null {
  const v = num(d.weightValue);
  if (!v) return null;
  const kg = d.weightUnit === "kg" ? v : lbToKg(v);
  return { kg: roundTo(kg, 2), entered: { value: v, unit: d.weightUnit } };
}

function aboutErrors(d: AboutDraft) {
  return {
    fullName: d.fullName.trim() ? "" : "Enter your full name.",
    dateOfBirth: d.dateOfBirth ? "" : "Enter your date of birth.",
    height: heightFromDraft(d) ? "" : "Enter your height.",
    weight: weightFromDraft(d) ? "" : "Enter your weight.",
  };
}

function ErrorText({ children }: { children: string }) {
  return children ? <span className="text-[15px] font-semibold text-red">{children}</span> : null;
}

export function AboutYouStep({
  value,
  onChange,
  onNext,
  onUseDemo,
}: {
  value: AboutDraft;
  onChange: (d: AboutDraft) => void;
  onNext: () => void;
  onUseDemo: () => void;
}) {
  const [tried, setTried] = useState(false);
  const errors = aboutErrors(value);
  const set = (patch: Partial<AboutDraft>) => onChange({ ...value, ...patch });
  const height = heightFromDraft(value);
  const weight = weightFromDraft(value);
  const [futureDob, setFutureDob] = useState(false);

  function next() {
    setTried(true);
    // Read the clock here, not during render (Next.js prerenders this page).
    const isFuture = value.dateOfBirth > new Date().toISOString().slice(0, 10);
    setFutureDob(isFuture);
    if (!isFuture && Object.values(errors).every((e) => !e)) onNext();
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        <Field label="Full name">
          <TextInput value={value.fullName} onChange={(e) => set({ fullName: e.target.value })} autoComplete="name" />
          {tried ? <ErrorText>{errors.fullName}</ErrorText> : null}
        </Field>

        <Field label="Date of birth">
          <TextInput type="date" value={value.dateOfBirth} onChange={(e) => set({ dateOfBirth: e.target.value })} autoComplete="bday" />
          {tried ? <ErrorText>{errors.dateOfBirth || (futureDob ? "Date of birth can't be in the future." : "")}</ErrorText> : null}
        </Field>

        <div className="flex flex-col gap-1.5">
          <span className="text-[15px] font-semibold text-ink-2">Sex</span>
          <Select aria-label="Sex" value={value.sex} onChange={(e) => set({ sex: e.target.value as SexCode })}>
            {(Object.keys(sexEn) as SexCode[]).map((s) => (
              <option key={s} value={s}>
                {sexEn[s]}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[15px] font-semibold text-ink-2">Blood type</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Blood type">
            {bloodTypes.map((b) => (
              <Chip key={b} selected={value.bloodType === b} onClick={() => set({ bloodType: b })}>
                {bloodTypeEn(b)}
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[15px] font-semibold text-ink-2">Height</span>
          <Segmented
            label="Height unit"
            value={value.heightUnit}
            onChange={(heightUnit) => set({ heightUnit })}
            options={[
              { value: "ft_in", label: "ft / in" },
              { value: "cm", label: "cm" },
            ]}
          />
          {value.heightUnit === "ft_in" ? (
            <div className="grid grid-cols-2 gap-3">
              <TextInput inputMode="numeric" placeholder="ft" aria-label="Feet" value={value.heightFt} onChange={(e) => set({ heightFt: e.target.value })} />
              <TextInput inputMode="numeric" placeholder="in" aria-label="Inches" value={value.heightIn} onChange={(e) => set({ heightIn: e.target.value })} />
            </div>
          ) : (
            <TextInput inputMode="decimal" placeholder="cm" aria-label="Centimeters" value={value.heightCm} onChange={(e) => set({ heightCm: e.target.value })} />
          )}
          {height ? (
            <span className="text-[15px] text-ink-2">
              ={" "}
              {value.heightUnit === "ft_in"
                ? formatCm(height.cm)
                : (({ ft, in: i }) => formatFtIn(ft, i))(cmToFtIn(height.cm))}
            </span>
          ) : tried ? (
            <ErrorText>{errors.height}</ErrorText>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[15px] font-semibold text-ink-2">Weight</span>
          <Segmented
            label="Weight unit"
            value={value.weightUnit}
            onChange={(weightUnit) => set({ weightUnit })}
            options={[
              { value: "lb", label: "lb" },
              { value: "kg", label: "kg" },
            ]}
          />
          <TextInput
            inputMode="decimal"
            placeholder={value.weightUnit}
            aria-label={`Weight in ${value.weightUnit}`}
            value={value.weightValue}
            onChange={(e) => set({ weightValue: e.target.value })}
          />
          {weight ? (
            <span className="text-[15px] text-ink-2">= {value.weightUnit === "lb" ? formatKg(weight.kg) : formatLb(kgToLb(weight.kg))}</span>
          ) : tried ? (
            <ErrorText>{errors.weight}</ErrorText>
          ) : null}
        </div>
      </div>

      <Footer>
        <PrimaryButton onClick={next}>Next</PrimaryButton>
        <button type="button" onClick={onUseDemo} className="min-h-11 text-[16px] font-semibold text-blue">
          Use demo profile instead
        </button>
      </Footer>
    </>
  );
}

// ---------- Shared bits for the list pages ----------

function Footer({ children }: { children: React.ReactNode }) {
  return <div className="mt-auto flex flex-col gap-2 pt-8">{children}</div>;
}

function AddCard({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-4 rounded-card bg-surface p-4">{children}</div>;
}

function ItemList({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 flex flex-col gap-2">{children}</div>;
}

// ---------- 2. Allergies ----------

export function AllergiesStep({ value, onChange, onNext }: { value: Allergy[]; onChange: (v: Allergy[]) => void; onNext: () => void }) {
  const [allergen, setAllergen] = useState<AllergenCode | "">("");
  const [reactions, setReactions] = useState<ReactionCode[]>([]);
  const [severity, setSeverity] = useState<SeverityCode>("moderate");

  const pending: Allergy | null = allergen
    ? { allergen, reaction: reactions, severity, crossReactiveTerms: allergenCrossReactive[allergen] }
    : null;

  function add(list = value) {
    if (!pending) return list;
    const next = [...list, pending];
    onChange(next);
    setAllergen("");
    setReactions([]);
    setSeverity("moderate");
    return next;
  }

  const used = new Set(value.map((a) => a.allergen));
  const empty = value.length === 0 && !pending;

  return (
    <>
      {value.length > 0 ? (
        <ItemList>
          {value.map((a, i) => (
            <ItemCard
              key={a.allergen}
              title={allergenEn[a.allergen]}
              detail={[severityEn[a.severity], ...a.reaction.map((r) => reactionEn[r])].join(" · ")}
              onRemove={() => onChange(value.filter((_, j) => j !== i))}
            />
          ))}
        </ItemList>
      ) : null}

      <AddCard>
        <Field label="Allergic to">
          <Select value={allergen} onChange={(e) => setAllergen(e.target.value as AllergenCode | "")}>
            <option value="">Choose…</option>
            {(Object.keys(allergenEn) as AllergenCode[])
              .filter((a) => !used.has(a))
              .map((a) => (
                <option key={a} value={a}>
                  {allergenEn[a]}
                </option>
              ))}
          </Select>
        </Field>
        <div className="flex flex-col gap-2">
          <span className="text-[15px] font-semibold text-ink-2">What happens</span>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(reactionEn) as ReactionCode[]).map((r) => (
              <Chip
                key={r}
                selected={reactions.includes(r)}
                onClick={() => setReactions((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]))}
              >
                {reactionEn[r]}
              </Chip>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-[15px] font-semibold text-ink-2">How serious</span>
          <Segmented
            label="How serious"
            value={severity}
            onChange={setSeverity}
            options={(Object.keys(severityEn) as SeverityCode[]).map((s) => ({ value: s, label: severityEn[s] }))}
          />
        </div>
        <SecondaryButton onClick={() => add()} disabled={!pending}>
          Add allergy
        </SecondaryButton>
      </AddCard>

      <Footer>
        <PrimaryButton
          onClick={() => {
            add();
            onNext();
          }}
        >
          {empty ? "No known allergies" : "Next"}
        </PrimaryButton>
      </Footer>
    </>
  );
}

// ---------- 3. Medications ----------

export function MedicationsStep({ value, onChange, onNext }: { value: Medication[]; onChange: (v: Medication[]) => void; onNext: () => void }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState<Dose["unit"]>("mg");
  const [frequency, setFrequency] = useState<FrequencyCode>("once_daily");
  const [route, setRoute] = useState<RouteCode>("oral");
  const [purpose, setPurpose] = useState("");

  const doseAmount = num(amount);
  const pending: Medication | null =
    name.trim() && doseAmount
      ? {
          // Drug names stay verbatim. Spanish purpose is filled in by the backend (Claude).
          name: name.trim(),
          dose: { amount: doseAmount, unit },
          frequency,
          route,
          purpose: { en: purpose.trim(), es: "" },
        }
      : null;

  function add() {
    if (!pending) return;
    onChange([...value, pending]);
    setName("");
    setAmount("");
    setUnit("mg");
    setFrequency("once_daily");
    setRoute("oral");
    setPurpose("");
  }

  const empty = value.length === 0 && !pending;

  return (
    <>
      {value.length > 0 ? (
        <ItemList>
          {value.map((m, i) => (
            <ItemCard
              key={`${m.name}-${i}`}
              title={`${m.name} ${m.dose.amount} ${m.dose.unit}`}
              detail={`${frequencyEn[m.frequency]} · ${routeEn[m.route]}`}
              onRemove={() => onChange(value.filter((_, j) => j !== i))}
            />
          ))}
        </ItemList>
      ) : null}

      <AddCard>
        <Field label="Medicine name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. lisinopril" autoCapitalize="none" />
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="text-[15px] font-semibold text-ink-2">Dose</span>
          <div className="grid grid-cols-[1fr_120px] gap-3">
            <TextInput inputMode="decimal" aria-label="Dose amount" placeholder="10" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <Select aria-label="Dose unit" value={unit} onChange={(e) => setUnit(e.target.value as Dose["unit"])}>
              {doseUnits.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <Field label="How often">
          <Select value={frequency} onChange={(e) => setFrequency(e.target.value as FrequencyCode)}>
            {(Object.keys(frequencyEn) as FrequencyCode[]).map((f) => (
              <option key={f} value={f}>
                {frequencyEn[f]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="How you take it">
          <Select value={route} onChange={(e) => setRoute(e.target.value as RouteCode)}>
            {(Object.keys(routeEn) as RouteCode[]).map((r) => (
              <option key={r} value={r}>
                {routeEn[r]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="What it's for (optional)">
          <TextInput value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. blood pressure" />
        </Field>
        <SecondaryButton onClick={add} disabled={!pending}>
          Add medicine
        </SecondaryButton>
      </AddCard>

      <Footer>
        <PrimaryButton
          onClick={() => {
            add();
            onNext();
          }}
        >
          {empty ? "I don't take any" : "Next"}
        </PrimaryButton>
      </Footer>
    </>
  );
}

// ---------- 4. Conditions ----------

export function ConditionsStep({ value, onChange, onNext }: { value: Condition[]; onChange: (v: Condition[]) => void; onNext: () => void }) {
  const [name, setName] = useState("");
  const [since, setSince] = useState("");
  const year = Number(since);
  // A fixed upper bound keeps the clock out of render (Next.js prerenders this page).
  const validYear = since.trim() === "" || (Number.isInteger(year) && year >= 1900 && year <= 2100);

  // Spanish name is filled in by the backend (Claude).
  const pending: Condition | null =
    name.trim() && validYear ? { name: { en: name.trim(), es: "" }, ...(since.trim() ? { since: year } : {}) } : null;

  function add() {
    if (!pending) return;
    onChange([...value, pending]);
    setName("");
    setSince("");
  }

  const empty = value.length === 0 && !pending;

  return (
    <>
      {value.length > 0 ? (
        <ItemList>
          {value.map((c, i) => (
            <ItemCard
              key={`${c.name.en}-${i}`}
              title={c.name.en}
              detail={c.since ? `Since ${c.since}` : undefined}
              onRemove={() => onChange(value.filter((_, j) => j !== i))}
            />
          ))}
        </ItemList>
      ) : null}

      <AddCard>
        <Field label="Condition">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. asthma" />
        </Field>
        <Field label="Since what year (optional)">
          <TextInput inputMode="numeric" value={since} onChange={(e) => setSince(e.target.value)} placeholder="e.g. 2019" />
          {!validYear ? <ErrorText>Enter a year like 2019.</ErrorText> : null}
        </Field>
        <SecondaryButton onClick={add} disabled={!pending}>
          Add condition
        </SecondaryButton>
      </AddCard>

      <Footer>
        <PrimaryButton
          onClick={() => {
            add();
            onNext();
          }}
        >
          {empty ? "No conditions" : "Next"}
        </PrimaryButton>
      </Footer>
    </>
  );
}

// ---------- 5. Emergency contacts ----------

/** "+1 (619) 555-0142" or "619 555 0142" to E.164. Ten digits without a country code are treated as US. */
export function toE164(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (raw.trim().startsWith("+")) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export function ContactsStep({
  value,
  onChange,
  onFinish,
}: {
  value: EmergencyContact[];
  onChange: (v: EmergencyContact[]) => void;
  onFinish: (contacts: EmergencyContact[]) => void;
}) {
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState<RelationshipCode>("spouse");
  const [phone, setPhone] = useState("");
  const e164 = toE164(phone);

  const pending: EmergencyContact | null =
    name.trim() && e164 ? { name: name.trim(), relationship, phone: e164, languages: ["en"] } : null;

  function add(): EmergencyContact[] {
    if (!pending) return value;
    const next = [...value, pending];
    onChange(next);
    setName("");
    setPhone("");
    setRelationship("spouse");
    return next;
  }

  return (
    <>
      {value.length > 0 ? (
        <ItemList>
          {value.map((c, i) => (
            <ItemCard
              key={`${c.phone}-${i}`}
              title={c.name}
              detail={`${relationshipEn[c.relationship]} · ${c.phone}`}
              onRemove={() => onChange(value.filter((_, j) => j !== i))}
            />
          ))}
        </ItemList>
      ) : null}

      <AddCard>
        <Field label="Name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Relationship">
          <Select value={relationship} onChange={(e) => setRelationship(e.target.value as RelationshipCode)}>
            {(Object.keys(relationshipEn) as RelationshipCode[]).map((r) => (
              <option key={r} value={r}>
                {relationshipEn[r]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Phone, with country code">
          <TextInput type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 619 555 0142" />
          {phone.trim() && !e164 ? <ErrorText>Enter a full phone number.</ErrorText> : null}
        </Field>
        <SecondaryButton onClick={() => add()} disabled={!pending}>
          Add contact
        </SecondaryButton>
      </AddCard>

      <Footer>
        <PrimaryButton onClick={() => onFinish(add())}>Save profile</PrimaryButton>
      </Footer>
    </>
  );
}
