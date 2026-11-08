"use client";

// "Where to go": the suggested level of care and the closest suitable places,
// from the injury record, the profile and the patient's location.
import { useEffect, useState } from "react";
import { AlertIcon } from "@/components/icons";
import type { CareLevel, CareRouteResponse, GeoPoint, SuggestedFacility } from "@/lib/care-routing";
import { formatDistance } from "@/lib/units";
import { Claim, SourceButton } from "./Sources";

type Origin = GeoPoint & { label: string };
type Result = { origin: Origin; data: CareRouteResponse | null };

const HEADLINE: Record<CareLevel, string> = {
  emergency_department: "Go to a hospital emergency department",
  hospital: "Go to a hospital",
  clinic: "A clinic or hospital can see you",
};

const button = "flex min-h-12 flex-1 items-center justify-center rounded-xl px-4 text-[16px] font-semibold";

function FacilityRow({ facility, first }: { facility: SuggestedFacility; first: boolean }) {
  return (
    <li className="border-t border-line py-4 first:border-t-0">
      {first ? <p className="mb-1 text-[13px] font-semibold text-blue">Closest suitable option</p> : null}
      <p className="text-[18px] font-bold leading-[1.3]">{facility.name}</p>
      <p className="mt-0.5 text-[15px] text-ink-2">
        {formatDistance(facility.distanceKm)} in a straight line ·{" "}
        {facility.emergency ? "Emergency department listed" : "Emergency department not confirmed"}
        <SourceButton sources={facility.citations} explanation={facility.why} />
      </p>
      <div className="mt-3 flex gap-2">
        <a
          className={`${button} bg-blue text-white`}
          href={`https://www.google.com/maps/dir/?api=1&destination=${facility.lat},${facility.lng}`}
          target="_blank"
          rel="noreferrer"
        >
          Directions
        </a>
        {facility.phone ? (
          <a className={`${button} bg-blue-soft text-blue`} href={`tel:${facility.phone}`}>
            Call
          </a>
        ) : null}
      </div>
    </li>
  );
}

export function CareRoute({ session, startOrigin }: { session: string; startOrigin: Origin }) {
  const [origin, setOrigin] = useState(startOrigin);
  const [result, setResult] = useState<Result | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(false);

  useEffect(() => {
    let current = true;
    fetch("/api/care-route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session, origin: { lat: origin.lat, lng: origin.lng } }),
    })
      .then((res) => (res.ok ? (res.json() as Promise<CareRouteResponse>) : null))
      .catch(() => null)
      .then((data) => {
        if (current) setResult({ origin, data });
      });
    return () => {
      current = false;
    };
  }, [session, origin]);

  function locateMe() {
    setLocating(true);
    setLocationError(false);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        setOrigin({ lat: coords.latitude, lng: coords.longitude, label: "your current location" });
      },
      () => {
        setLocating(false);
        setLocationError(true);
      },
      { timeout: 10_000, maximumAge: 60_000 },
    );
  }

  const loading = result?.origin !== origin;
  const data = loading ? null : result.data;
  const number = data?.emergencyNumber;
  const lookupFailed = !loading && (!data || data.dataSource === "unavailable");

  return (
    <section className="mt-6" aria-busy={loading}>
      <h2 className="mb-2 text-[17px] font-bold">Where to go</h2>

      {loading ? <p className="rounded-card bg-surface px-4 py-3 text-[17px] text-ink-2">Finding care near {origin.label}…</p> : null}

      {data ? (
        <div className={`rounded-card p-4 ${data.level === "emergency_department" ? "bg-red-soft" : "bg-blue-soft"}`}>
          <p className={`flex gap-2 text-[20px] font-bold leading-[1.25] ${data.level === "emergency_department" ? "text-red" : ""}`}>
            {data.level === "emergency_department" ? <AlertIcon size={24} className="flex-none" /> : null}
            {HEADLINE[data.level]}
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {data.reasons.map((reason, i) => (
              <li key={i} className="text-[17px] leading-[1.45]">
                <Claim statement={reason} />
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[16px] leading-[1.45]">
            If you feel worse or can&apos;t get there safely, call {number ?? "your local emergency number"}.
          </p>
          {number ? (
            <a className="mt-3 flex min-h-14 items-center justify-center rounded-xl bg-red text-[18px] font-bold text-white" href={`tel:${number}`}>
              Call {number}
            </a>
          ) : null}
        </div>
      ) : null}

      {lookupFailed ? (
        <p className="mt-2 rounded-card bg-red-soft p-4 text-[17px] font-semibold leading-[1.45] text-red" role="alert">
          Vital couldn&apos;t look up nearby care right now. Call {number ?? "your local emergency number"} or ask someone nearby.
        </p>
      ) : null}

      {data && data.dataSource !== "unavailable" && data.options.length === 0 ? (
        <p className="mt-2 rounded-card bg-surface p-4 text-[17px] leading-[1.45]">No medical facilities found on the map near {origin.label}.</p>
      ) : null}

      {data && data.options.length > 0 ? (
        <ul className="mt-2 rounded-card bg-surface px-4">
          {data.options.map((facility, i) => (
            <FacilityRow key={facility.id} facility={facility} first={i === 0} />
          ))}
        </ul>
      ) : null}

      <div className="mt-2 flex items-center justify-between gap-3 px-1">
        <p className="text-[14px] text-ink-2">Measured from {origin.label}</p>
        <button type="button" onClick={locateMe} disabled={locating} className="min-h-11 flex-none text-[15px] font-semibold text-blue disabled:text-ink-3">
          {locating ? "Locating…" : "Use my location"}
        </button>
      </div>
      {locationError ? <p className="px-1 text-[14px] text-red">Couldn&apos;t get your location. Still showing {origin.label}.</p> : null}

      <p className="mt-2 px-1 text-[14px] leading-[1.5] text-ink-2">
        This is a suggestion from what was recorded, not medical advice. If medical staff told you where to go, follow them. Map data
        can&apos;t confirm a specific service or that a facility will accept you, so call ahead if you can. Map data ©{" "}
        <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          OpenStreetMap contributors
        </a>
        .
      </p>
    </section>
  );
}
