import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-xl border border-line bg-white px-4 h-12 text-base text-ink placeholder:text-muted/70 transition-colors focus:border-forest-600 focus:outline-none focus:ring-4 focus:ring-forest-600/10 aria-[invalid=true]:border-red-500";

export function Field({
  label,
  name,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  name: string;
  error?: string[];
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={name} className="mb-2 block text-sm font-medium text-forest-950">
        {label}
      </label>
      {children}
      {error?.[0] ? (
        <p id={`${name}-error`} className="mt-1.5 text-sm text-red-600">
          {error[0]}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ error, className, ...props }: ComponentProps<"input"> & { error?: string[] }) {
  return (
    <input
      id={props.name}
      aria-invalid={error?.length ? true : undefined}
      aria-describedby={error?.length ? `${props.name}-error` : undefined}
      className={cn(control, className)}
      {...props}
    />
  );
}

export function Select({ error, className, children, ...props }: ComponentProps<"select"> & { error?: string[] }) {
  return (
    <select
      id={props.name}
      aria-invalid={error?.length ? true : undefined}
      aria-describedby={error?.length ? `${props.name}-error` : undefined}
      className={cn(control, "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%235b6b61%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:18px] bg-[right_1rem_center] bg-no-repeat pr-10", className)}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({ error, className, ...props }: ComponentProps<"textarea"> & { error?: string[] }) {
  return (
    <textarea
      id={props.name}
      aria-invalid={error?.length ? true : undefined}
      aria-describedby={error?.length ? `${props.name}-error` : undefined}
      className={cn(control, "h-auto min-h-32 py-3", className)}
      {...props}
    />
  );
}

export function Choice({
  name,
  value,
  title,
  body,
  defaultChecked,
  onChange,
}: {
  name: string;
  value: string;
  title: string;
  body?: string;
  defaultChecked?: boolean;
  onChange?: (v: string) => void;
}) {
  return (
    <label className="relative flex cursor-pointer gap-3 rounded-2xl border border-line bg-white p-4 transition-colors has-[:checked]:border-forest-600 has-[:checked]:bg-forest-50 has-[:checked]:ring-4 has-[:checked]:ring-forest-600/10">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className="mt-1 size-4 accent-forest-600"
      />
      <span>
        <span className="block font-medium text-forest-950">{title}</span>
        {body && <span className="mt-0.5 block text-sm text-muted">{body}</span>}
      </span>
    </label>
  );
}

/** Hidden field that only bots fill in. */
export function Honeypot() {
  return (
    <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
      <label>
        Company website
        <input type="text" name="company_website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}
