"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { demoProfile, type Allergy, type Condition, type EmergencyContact, type Medication, type PatientProfile } from "@/data";
import { Screen, StepDots } from "@/components/Screen";
import { ChevronLeftIcon } from "@/components/icons";
import {
  AboutYouStep,
  AllergiesStep,
  ConditionsStep,
  ContactsStep,
  MedicationsStep,
  aboutFromProfile,
  emptyAbout,
  heightFromDraft,
  weightFromDraft,
  type AboutDraft,
} from "@/components/profile-steps";
import { saveProfile } from "@/lib/profile-store";

const pages = [
  { title: "About you", sub: "This helps the doctor treat you safely." },
  { title: "Allergies", sub: "Add any medicines or other things you're allergic to." },
  { title: "Medications", sub: "Add the medicines you take regularly, with the dose." },
  { title: "Conditions", sub: "Add ongoing health conditions, like asthma or diabetes." },
  { title: "Emergency contacts", sub: "People to reach if something happens to you." },
];

export default function ProfileSetupPage() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [about, setAbout] = useState<AboutDraft>(emptyAbout);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  // Set when the pages were pre-filled from insurance (demo: the sample profile).
  // Fields the form doesn't edit are kept so saving doesn't drop them.
  const [prefill, setPrefill] = useState<PatientProfile | null>(null);

  // Read ?from=insurance after mount (Next.js prerenders this page).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("from") !== "insurance") return;
    /* eslint-disable react-hooks/set-state-in-effect -- the address is only readable after mount */
    setPrefill(demoProfile);
    setAbout(aboutFromProfile(demoProfile));
    setAllergies(demoProfile.allergies);
    setMedications(demoProfile.medications);
    setConditions(demoProfile.conditions);
    setContacts(demoProfile.emergencyContacts);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  const next = () => setPage((p) => Math.min(p + 1, pages.length - 1));

  function finish(finalContacts: EmergencyContact[]) {
    const height = heightFromDraft(about);
    const weight = weightFromDraft(about);
    if (!height || !weight) {
      setPage(0);
      return;
    }
    const profile: PatientProfile = {
      id: prefill?.id ?? `local-${crypto.randomUUID()}`,
      fullName: about.fullName.trim(),
      dateOfBirth: about.dateOfBirth,
      sex: about.sex,
      preferredLanguage: "en",
      bloodType: about.bloodType,
      weight,
      height,
      allergies,
      medications,
      conditions,
      pastProcedures: prefill?.pastProcedures ?? [],
      immunizations: prefill?.immunizations ?? [],
      emergencyContacts: finalContacts,
      ...(prefill?.additionalNotes ? { additionalNotes: prefill.additionalNotes } : {}),
    };
    saveProfile(profile);
    router.push("/intake"); // guided flow: profile -> what happened -> care -> translation
  }

  function chooseDemo() {
    saveProfile(demoProfile);
    router.push("/intake"); // guided flow: profile -> what happened -> care -> translation
  }

  const { title, sub } = pages[page];

  return (
    <Screen>
      <header className="flex h-11 items-center justify-between">
        {page === 0 ? (
          <Link href="/welcome/setup" className="-ml-2 flex h-11 items-center gap-1 px-2 text-[17px] text-blue">
            <ChevronLeftIcon />
            Back
          </Link>
        ) : (
          <button type="button" onClick={() => setPage(page - 1)} className="-ml-2 flex h-11 items-center gap-1 px-2 text-[17px] text-blue">
            <ChevronLeftIcon />
            Back
          </button>
        )}
        <StepDots step={3} total={3} />
      </header>

      <div className="mt-4 flex gap-1" role="img" aria-label={`Page ${page + 1} of ${pages.length}`}>
        {pages.map((p, i) => (
          <span key={p.title} className={`h-1 flex-1 rounded-full ${i <= page ? "bg-blue" : "bg-line"}`} />
        ))}
      </div>

      <h1 className="mt-6 text-[30px] font-bold leading-[1.12] tracking-[-0.01em]">{title}</h1>
      <p className="mt-2 mb-6 text-[17px] leading-[1.45] text-ink-2">{sub}</p>

      {prefill ? (
        <p className="mb-6 rounded-card bg-blue-soft p-4 text-[16px] leading-[1.45]" role="status">
          <span className="font-semibold">Filled in from your insurance.</span> Check this page and fix anything that&apos;s wrong.
          <span className="mt-1 block text-[14px] text-ink-2">Demo: sample profile data.</span>
        </p>
      ) : null}

      <div className="flex flex-1 flex-col">
        {page === 0 && <AboutYouStep value={about} onChange={setAbout} onNext={next} onUseDemo={chooseDemo} />}
        {page === 1 && <AllergiesStep value={allergies} onChange={setAllergies} onNext={next} />}
        {page === 2 && <MedicationsStep value={medications} onChange={setMedications} onNext={next} />}
        {page === 3 && <ConditionsStep value={conditions} onChange={setConditions} onNext={next} />}
        {page === 4 && <ContactsStep value={contacts} onChange={setContacts} onFinish={finish} />}
      </div>
    </Screen>
  );
}
