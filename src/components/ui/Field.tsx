"use client";

import { useId, useState, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/*
 * Figma "Form / Input" (57:92) and "Form / Select · Dropdown" (57:150).
 * Label 15 Regular text/secondary · field 48px, radius 12, 1.5px border/default, px 16, text 17 Regular.
 * Focus: 2px action/primary + 4px ring @10% · Error: 2px state/error + message 14 Regular state/error.
 * Disabled: bg/disabled, text/disabled.
 */
const fieldBase =
  "w-full rounded-12 border-[1.5px] border-border-default bg-bg-surface px-4 type-body text-text-primary placeholder:text-text-muted outline-none transition-[border-color,box-shadow] focus:border-2 focus:border-action-primary focus:px-[15.5px] focus:shadow-[0_0_0_4px_rgba(91,60,196,0.10)] disabled:bg-bg-disabled disabled:text-text-disabled disabled:placeholder:text-text-disabled";
const fieldError = "border-2 border-state-error px-[15.5px] focus:border-state-error";

type FieldShellProps = {
  id: string;
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
};

export function FieldShell({ id, label, hint, error, required, disabled, children, className }: FieldShellProps) {
  return (
    <div className={`flex w-full flex-col gap-2 ${className ?? ""}`}>
      {label && (
        <label htmlFor={id} className={`type-small ${disabled ? "text-text-disabled" : "text-text-secondary"}`}>
          {label}
          {required && <span className="sr-only"> (مطلوب)</span>}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="type-caption text-state-error">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="type-caption text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type InputProps = Omit<ComponentPropsWithoutRef<"input">, "className"> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  className?: string;
  /** Element shown at the inline end of the field (e.g. a unit). */
  trailing?: ReactNode;
};

export function Input({ label, hint, error, className, trailing, id, required, disabled, ...rest }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldShell id={inputId} label={label} hint={hint} error={error} required={required} disabled={disabled} className={className}>
      <div className="relative flex items-center">
        <input
          id={inputId}
          required={required}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={`h-12 ${fieldBase} ${error ? fieldError : ""} ${trailing ? "pe-16" : ""}`}
          {...rest}
        />
        {trailing && <span className="absolute end-4 type-caption text-text-muted">{trailing}</span>}
      </div>
    </FieldShell>
  );
}

/** Password field with the "إظهار / إخفاء" text toggle from PUB-AUT-02. */
export function PasswordInput({ label, hint, error, className, id, required, disabled, ...rest }: Omit<InputProps, "trailing" | "type">) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [visible, setVisible] = useState(false);
  return (
    <FieldShell id={inputId} label={label} hint={hint} error={error} required={required} disabled={disabled} className={className}>
      <div className="relative flex items-center">
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          required={required}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={`h-12 ${fieldBase} ${error ? fieldError : ""} pe-20`}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-controls={inputId}
          className="absolute end-4 cursor-pointer rounded-8 type-caption text-text-brand focus-ring"
        >
          {visible ? "إخفاء" : "إظهار"}
        </button>
      </div>
    </FieldShell>
  );
}

type TextareaProps = Omit<ComponentPropsWithoutRef<"textarea">, "className"> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  className?: string;
};

export function Textarea({ label, hint, error, className, id, required, disabled, rows = 3, ...rest }: TextareaProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldShell id={inputId} label={label} hint={hint} error={error} required={required} disabled={disabled} className={className}>
      <textarea
        id={inputId}
        rows={rows}
        required={required}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={`min-h-24 py-3.5 ${fieldBase} ${error ? fieldError : ""} resize-y`}
        {...rest}
      />
    </FieldShell>
  );
}

type SelectProps = Omit<ComponentPropsWithoutRef<"select">, "className"> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  className?: string;
  placeholder?: string;
  options: { value: string; label: string }[];
};

/** Native select styled as the Figma trigger (keeps keyboard + screen-reader behaviour for free). */
export function Select({ label, hint, error, className, id, required, disabled, placeholder, options, ...rest }: SelectProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldShell id={inputId} label={label} hint={hint} error={error} required={required} disabled={disabled} className={className}>
      <div className="relative flex items-center">
        <select
          id={inputId}
          required={required}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          className={`h-12 cursor-pointer appearance-none ${fieldBase} ${error ? fieldError : ""} pe-11`}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden size={16} strokeWidth={1.25} absoluteStrokeWidth className="pointer-events-none absolute end-4 text-text-secondary" />
      </div>
    </FieldShell>
  );
}
