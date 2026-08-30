"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BoldButton, ColorBlock } from "@/components/system";
import { CategorySelect } from "@/components/creator/CategorySelect";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  instagramUrlFromUsername,
  normalizeInstagramUsername,
  parseInstagramProfileInput,
} from "@/lib/format";
import { resolveCategorySubmitValue } from "@/lib/categories";
import type { Category } from "@/types/database";

type IgFetchResponse = {
  available?: boolean;
  code?: string;
  reason?: string;
  message?: string;
  username?: string;
  url?: string;
  name?: string | null;
  bio?: string | null;
  profileImageUrl?: string | null;
  followers?: number | null;
  averageViews?: number | null;
  missingFields?: string[];
};

export function SubmitForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [igInput, setIgInput] = useState("");
  const [fetchMessage, setFetchMessage] = useState("");
  const [fetchOk, setFetchOk] = useState(false);
  const [error, setError] = useState("");
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const fetchGen = useRef(0);
  const [form, setForm] = useState({
    name: "",
    instagramUsername: "",
    instagramUrl: "",
    categoryId: "",
    category: "",
    categorySlug: "",
    location: "",
    contactEmail: "",
    contactPhone: "",
    bio: "",
    followers: "",
    averageViews: "",
    profileImageUrl: "",
    website: "",
  });

  const username = useMemo(
    () => normalizeInstagramUsername(form.instagramUsername || igInput),
    [form.instagramUsername, igInput],
  );

  function goManual(next: { username?: string; url?: string; message?: string; success?: boolean }) {
    if (next.username) {
      setForm((prev) => ({
        ...prev,
        instagramUsername: next.username || prev.instagramUsername,
        instagramUrl: next.url || instagramUrlFromUsername(next.username || ""),
      }));
    }
    setFetchOk(Boolean(next.success));
    setFetchMessage(next.message ?? "");
    setStep(2);
  }

  async function fetchIg() {
    setError("");
    const parsed = parseInstagramProfileInput(igInput);
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }

    setFetching(true);
    const gen = ++fetchGen.current;
    try {
      const res = await fetch("/api/instagram/fetch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input: igInput }),
      });
      const json = (await res.json()) as IgFetchResponse;
      if (gen !== fetchGen.current) return;
      const nextUsername = json.username || parsed.username;

      if (res.status === 400 || json.code === "empty" || json.code === "invalid_username") {
        setError(json.message || "Enter a valid Instagram username (letters, numbers, periods, underscores).");
        return;
      }

      const exists = await fetch(`/api/creators?username=${encodeURIComponent(nextUsername)}`);
      if (gen !== fetchGen.current) return;
      const existing = (await exists.json()) as { creator?: { instagram_username: string } };
      if (existing.creator) {
        router.push(`/creator/${existing.creator.instagram_username}?intent=bid`);
        return;
      }

      if (json.available) {
        setForm((prev) => ({
          ...prev,
          instagramUsername: nextUsername,
          instagramUrl: json.url || instagramUrlFromUsername(nextUsername),
          name: json.name || prev.name,
          bio: json.bio || prev.bio,
          profileImageUrl: json.profileImageUrl || prev.profileImageUrl,
          followers: json.followers != null ? String(json.followers) : prev.followers,
          averageViews: json.averageViews != null ? String(json.averageViews) : prev.averageViews,
        }));
        const missing = json.missingFields?.length
          ? ` Missing: ${json.missingFields.join(", ")} — add those manually (creator-provided).`
          : "";
        setFetchOk(true);
        setFetchMessage(`Instagram profile fetched successfully ✓${missing}`);
        setStep(2);
        return;
      }

      goManual({
        username: nextUsername,
        url: json.url || instagramUrlFromUsername(nextUsername),
        message: json.message || "We couldn't automatically fetch Instagram details. Please enter them manually.",
      });
    } catch {
      goManual({
        username: parsed.username,
        url: instagramUrlFromUsername(parsed.username),
        message: "We couldn't reach the server. Enter details manually.",
      });
    } finally {
      setFetching(false);
    }
  }

  function skipManual() {
    fetchGen.current += 1;
    setFetching(false);
    setError("");
    const parsed = parseInstagramProfileInput(igInput);
    goManual({
      username: parsed.ok ? parsed.username : undefined,
      url: parsed.ok ? instagramUrlFromUsername(parsed.username) : undefined,
      message: "",
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) {
      setError("Creator name is required.");
      return;
    }
    if (!form.instagramUsername.trim()) {
      setError("Instagram username is required.");
      return;
    }
    if (!form.instagramUrl.trim()) {
      setError("Instagram URL is required.");
      return;
    }
    const categoryValue = resolveCategorySubmitValue(form);
    if (!categoryValue) {
      setError("Please select a category.");
      return;
    }
    if (!form.location.trim()) {
      setError("Location is required.");
      return;
    }
    if (!form.contactEmail.trim()) {
      setError("Contact email is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/creators", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          categoryId: categoryValue,
          category: form.category,
          instagramUsername: username,
          instagramUrl: form.instagramUrl || instagramUrlFromUsername(username),
          followers: form.followers === "" ? undefined : Number(form.followers),
          averageViews: form.averageViews === "" ? undefined : Number(form.averageViews),
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        username?: string;
        code?: string;
        missing?: string[];
      };
      if (res.status === 409 && json.username) {
        router.push(`/creator/${json.username}?intent=bid`);
        return;
      }
      if (res.status === 503 && json.code === "missing_config") {
        const vars = json.missing?.length ? json.missing.join(", ") : "Supabase env vars";
        setError(
          `Creator submissions are not configured. Add ${vars} to .env.local (or hosting env), run the Supabase migration, then restart the dev server.`,
        );
        return;
      }
      if (!res.ok) {
        setError(json.error ?? "Could not save this creator.");
        return;
      }
      if (json.username) {
        router.push(`/creator/${json.username}?intent=bid`);
        return;
      }
      router.push("/creators");
    } catch {
      setError("Could not save this creator. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ColorBlock color="cream" padding="lg" className="overflow-visible">
      {step === 1 ? (
        <div className="grid gap-4">
          <div>
            <Label htmlFor="ig">Instagram @username or URL</Label>
            <Input
              id="ig"
              value={igInput}
              onChange={(e) => setIgInput(e.target.value)}
              placeholder="@creator or https://instagram.com/creator"
            />
          </div>
          {error ? <p className="text-sm font-bold text-rose-700">{error}</p> : null}
          <BoldButton color="yellow" size="lg" disabled={fetching || !igInput.trim()} onClick={fetchIg}>
            {fetching ? "Fetching Instagram..." : "Fetch Instagram"}
          </BoldButton>
          <button type="button" className="text-sm font-bold text-black underline" onClick={skipManual}>
            Skip and enter details manually
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="grid gap-4 overflow-visible">
          {fetchMessage ? (
            <ColorBlock color={fetchOk ? "lime" : "yellow"} padding="md">
              <p className="text-sm font-bold text-black">{fetchMessage}</p>
            </ColorBlock>
          ) : null}
          <div className="grid gap-4 overflow-visible sm:grid-cols-2">
            <Field label="Creator name" id="name" value={form.name} onChange={(v) => setForm((prev) => ({ ...prev, name: v }))} required />
            <Field
              label="Instagram username"
              id="username"
              value={form.instagramUsername}
              onChange={(v) => setForm((prev) => ({ ...prev, instagramUsername: v }))}
              required
            />
            <Field
              label="Instagram URL"
              id="url"
              value={form.instagramUrl}
              onChange={(v) => setForm((prev) => ({ ...prev, instagramUrl: v }))}
              required
            />
            <div className="relative z-10 overflow-visible">
              <Label htmlFor="category">Category</Label>
              <CategorySelect
                categories={categories}
                value={form.categoryId || form.categorySlug}
                onChange={(id, name, slug) => {
                  setForm((prev) => ({
                    ...prev,
                    categoryId: id,
                    category: name,
                    categorySlug: slug,
                  }));
                  setError("");
                }}
                invalid={Boolean(error) && !resolveCategorySubmitValue(form)}
              />
            </div>
            <Field label="Location" id="location" value={form.location} onChange={(v) => setForm((prev) => ({ ...prev, location: v }))} required />
            <Field
              label="Contact email"
              id="email"
              type="email"
              value={form.contactEmail}
              onChange={(v) => setForm((prev) => ({ ...prev, contactEmail: v }))}
              required
            />
            <Field label="Contact phone (optional)" id="phone" value={form.contactPhone} onChange={(v) => setForm((prev) => ({ ...prev, contactPhone: v }))} />
            <Field label="Profile image URL (optional)" id="image" value={form.profileImageUrl} onChange={(v) => setForm((prev) => ({ ...prev, profileImageUrl: v }))} />
            <Field label="Followers (optional)" id="followers" type="number" value={form.followers} onChange={(v) => setForm((prev) => ({ ...prev, followers: v }))} />
            <Field label="Average views (optional)" id="views" type="number" value={form.averageViews} onChange={(v) => setForm((prev) => ({ ...prev, averageViews: v }))} />
          </div>
          <div>
            <Label htmlFor="bio">Bio (optional)</Label>
            <Textarea id="bio" value={form.bio} onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))} />
          </div>
          <p className="text-xs font-bold text-muted-foreground">
            Stats returned by Instagram stay labeled as Instagram data if you leave the numbers unchanged.
            Anything you type is creator-provided — never Instagram-verified. Rank is a paid bid, not an
            Instagram ranking.
          </p>
          <div className="hidden" aria-hidden>
            <Label htmlFor="website">Website</Label>
            <Input id="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))} />
          </div>
          {error ? <p className="text-sm font-bold text-rose-700">{error}</p> : null}
          <BoldButton type="submit" color="pink" size="lg" disabled={saving}>
            {saving ? "Saving..." : "Add creator"}
          </BoldButton>
        </form>
      )}
    </ColorBlock>
  );
}

function Field({
  label,
  id,
  value,
  onChange,
  required,
  type = "text",
}: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
