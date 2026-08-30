"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CREATOR_CATEGORY_OPTIONS } from "@/lib/categories";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/database";

type Option = { id: string; name: string; slug: string };

function resolveOptions(categories: Category[]): Option[] {
  if (categories.length > 0) {
    const bySlug = new Map(categories.map((c) => [c.slug, c]));
    return CREATOR_CATEGORY_OPTIONS.flatMap((opt) => {
      const found = bySlug.get(opt.slug);
      if (!found) return [];
      return [{ id: found.id, name: found.name, slug: found.slug }];
    });
  }

  return CREATOR_CATEGORY_OPTIONS.map((opt) => ({
    id: opt.slug,
    name: opt.name,
    slug: opt.slug,
  }));
}

export function CategorySelect({
  categories,
  value,
  onChange,
  invalid,
}: {
  categories: Category[];
  value: string;
  onChange: (id: string, name: string, slug: string) => void;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [menuBox, setMenuBox] = useState({ top: 0, left: 0, width: 0, maxHeight: 256, placeAbove: false });
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const options = resolveOptions(categories);
  const selected = options.find((c) => c.id === value || c.slug === value);
  const selectedIndex = Math.max(
    0,
    options.findIndex((c) => c.id === value || c.slug === value),
  );

  function placeMenu() {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const gap = 8;
    const spaceBelow = window.innerHeight - rect.bottom - gap - 12;
    const spaceAbove = rect.top - gap - 12;
    const placeAbove = spaceBelow < 180 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(120, Math.min(320, placeAbove ? spaceAbove : spaceBelow));
    setMenuBox({
      top: placeAbove ? rect.top - gap : rect.bottom + gap,
      left: rect.left,
      width: rect.width,
      maxHeight,
      placeAbove,
    });
  }

  useLayoutEffect(() => {
    if (!open) return;
    setActive(selectedIndex);
    placeMenu();
    const onReposition = () => placeMenu();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, selectedIndex, options.length]);

  useEffect(() => {
    if (open) menuRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function pick(option: Option) {
    onChange(option.id, option.name, option.slug);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function onTriggerKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!open) {
        placeMenu();
        setOpen(true);
      } else if (e.key === "Enter" || e.key === " ") {
        setOpen(false);
      }
    }
    if (e.key === "Escape") setOpen(false);
  }

  function onMenuKeyDown(e: React.KeyboardEvent<HTMLUListElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % options.length);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + options.length) % options.length);
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const option = options[active];
      if (option) pick(option);
    }
  }

  const menu =
    open && typeof document !== "undefined"
      ? createPortal(
          <ul
            ref={menuRef}
            id={listId}
            role="listbox"
            tabIndex={-1}
            onKeyDown={onMenuKeyDown}
            style={{
              position: "fixed",
              top: menuBox.placeAbove ? undefined : menuBox.top,
              bottom: menuBox.placeAbove ? window.innerHeight - menuBox.top : undefined,
              left: menuBox.left,
              width: menuBox.width,
              maxHeight: menuBox.maxHeight,
            }}
            className="z-[80] overflow-auto rounded-xl border-[3px] border-black bg-cream p-1 shadow-[4px_4px_0_#000]"
          >
            {options.map((c, i) => (
              <li key={c.slug}>
                <button
                  type="button"
                  role="option"
                  aria-selected={c.id === value || c.slug === value}
                  className={cn(
                    "flex w-full rounded-lg px-3 py-2 text-left text-sm font-bold text-black hover:bg-lemon focus:bg-lemon focus:outline-none",
                    (c.id === value || c.slug === value || i === active) && "bg-lemon",
                  )}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(c);
                  }}
                >
                  {c.name}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={cn("relative", open && "z-20")}>
      <button
        ref={buttonRef}
        type="button"
        id="category"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-invalid={invalid || undefined}
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-xl border-[3px] border-black bg-cream px-3 text-left text-sm font-medium text-black outline-none focus-visible:border-hot-pink focus-visible:ring-3 focus-visible:ring-hot-pink/40",
          open && "border-hot-pink",
          invalid && "border-rose-600",
          !selected && "text-neutral-500",
        )}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!open) placeMenu();
          setOpen((v) => !v);
        }}
        onKeyDown={onTriggerKeyDown}
      >
        <span>{selected?.name ?? "Pick a category"}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
          className={cn("size-5 text-hot-pink transition-transform", open && "rotate-180")}
        >
          <path
            fillRule="evenodd"
            d="M12.53 16.28a.75.75 0 0 1-1.06 0l-7.5-7.5a.75.75 0 0 1 1.06-1.06L12 14.69l6.97-6.97a.75.75 0 0 1 1.06 1.06l-7.5 7.5Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {menu}
    </div>
  );
}
