// Form building blocks for the profile setup. Text is 17px or larger so
// iPhone Safari does not zoom in when a field is focused.
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

const control =
  "h-12 w-full rounded-xl border border-line bg-surface px-4 text-[17px] text-ink placeholder:text-ink-3 focus:border-blue focus:outline-none";

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[15px] font-semibold text-ink-2">{label}</span>
      {children}
      {hint ? <span className="text-[15px] text-ink-2">{hint}</span> : null}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${control} ${props.className ?? ""}`} />;
}

export function Select({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${control} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%228%22><path d=%22M1 1l5 5 5-5%22 stroke=%22%235F6673%22 stroke-width=%222%22 fill=%22none%22/></svg>')] bg-[length:12px_8px] bg-[position:right_16px_center] bg-no-repeat pr-10`}>
      {children}
    </select>
  );
}

/** iOS-style segmented control for short, exclusive choices. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col rounded-xl bg-[#E6E8EC] p-[3px]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-11 rounded-[10px] px-2 text-[15px] font-semibold ${
            value === o.value ? "bg-surface text-ink shadow-[0_1px_3px_rgba(0,0,0,0.12)]" : "text-ink-2"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Toggle chip for multi-select (e.g. allergy reactions) or a chip grid choice. */
export function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-11 rounded-full border px-4 text-[16px] font-semibold ${
        selected ? "border-blue bg-blue text-white" : "border-line bg-surface text-ink"
      }`}
    >
      {children}
    </button>
  );
}

export function PrimaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="flex h-14 w-full items-center justify-center rounded-[14px] bg-blue text-[18px] font-semibold text-white active:bg-[#1849B0] disabled:bg-[#A9BCE6]"
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="flex h-12 w-full items-center justify-center rounded-[14px] border border-line bg-surface text-[17px] font-semibold text-blue active:bg-blue-soft"
    >
      {children}
    </button>
  );
}

/** A saved list item (allergy, medication, ...) with a Remove action. */
export function ItemCard({ title, detail, onRemove }: { title: string; detail?: string; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-card bg-surface px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[17px] font-semibold">{title}</p>
        {detail ? <p className="mt-0.5 text-[15px] text-ink-2">{detail}</p> : null}
      </div>
      <button type="button" onClick={onRemove} className="min-h-11 px-2 text-[16px] font-semibold text-red">
        Remove
      </button>
    </div>
  );
}
