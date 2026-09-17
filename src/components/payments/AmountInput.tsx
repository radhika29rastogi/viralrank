"use client";

import { Input } from "@/components/ui/input";

export function AmountInput({
  minAmount,
  suggestedAmount,
  value,
  onChange,
  id = "amount",
  disabled = false,
}: {
  minAmount: number;
  suggestedAmount: number;
  value: number | "";
  onChange: (next: number | "") => void;
  id?: string;
  disabled?: boolean;
}) {
  const numeric = typeof value === "number" && Number.isFinite(value) ? value : null;
  const belowMin = numeric != null && numeric < minAmount;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-extrabold">
        Amount (₹)
      </label>
      <Input
        id={id}
        inputMode="numeric"
        type="text"
        disabled={disabled}
        placeholder={String(suggestedAmount)}
        value={value === "" ? "" : String(value)}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d]/g, "");
          if (raw === "") {
            onChange("");
            return;
          }
          onChange(Number(raw));
        }}
        className="border-[3px] border-border bg-input-bg text-input-text"
        aria-invalid={belowMin}
        aria-describedby={belowMin ? `${id}-help` : undefined}
      />
      {belowMin ? (
        <p id={`${id}-help`} className="text-sm font-bold text-destructive">
          Minimum is ₹{minAmount.toLocaleString("en-IN")}.
        </p>
      ) : null}
    </div>
  );
}

export function amountIsValid(value: number | "", minAmount: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= minAmount;
}
