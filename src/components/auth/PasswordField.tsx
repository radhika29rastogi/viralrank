"use client";

import { useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function PasswordField({
  id = "password",
  label = "Password",
  value,
  onChange,
  autoComplete,
  required,
  minLength,
  hint,
  error,
}: {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  hint?: string;
  error?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={hint || error ? `${id}-hint` : undefined}
          className="pr-12"
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-foreground hover:bg-foreground/5"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          {visible ? <EyeSlashIcon className="size-5" /> : <EyeIcon className="size-5" />}
        </button>
      </div>
      {hint ? (
        <p id={`${id}-hint`} className={cn("mt-1 text-xs font-bold text-muted-foreground", error && "sr-only")}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-sm font-bold text-rose-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
