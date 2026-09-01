"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BoldButton, ColorBlock } from "@/components/system";
import { CategorySelect } from "@/components/creator/CategorySelect";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MIN_LISTING_PAYMENT } from "@/lib/creators/public";
import { instagramUrlFromUsername, normalizeInstagramUsername } from "@/lib/format";
import type { Category } from "@/types/database";

type PaymentUiState = "idle" | "preparing" | "checkout" | "verifying" | "success" | "failed" | "cancelled";

function loadRazorpay() {
  return new Promise<void>((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("checkout"));
    document.body.appendChild(script);
  });
}

export function SubmitForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [paymentUi, setPaymentUi] = useState<PaymentUiState>("idle");

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState("");

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
    () => normalizeInstagramUsername(form.instagramUsername),
    [form.instagramUsername],
  );

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    setCategoriesError("");
    try {
      const res = await fetch("/api/categories");
      const json = (await res.json()) as { categories?: Category[]; error?: string };
      if (!res.ok || !json.categories?.length) {
        setCategories([]);
        setCategoriesError(json.error ?? "Could not load categories from the database.");
        return;
      }
      setCategories(json.categories);
    } catch {
      setCategories([]);
      setCategoriesError("Could not load categories. Check your connection and try again.");
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  function onUsernameChange(value: string) {
    const normalized = normalizeInstagramUsername(value);
    setForm((prev) => ({
      ...prev,
      instagramUsername: value.replace(/^@/, ""),
      instagramUrl: normalized ? instagramUrlFromUsername(normalized) : prev.instagramUrl,
    }));
  }

  async function pollListingPaymentStatus(pendingId: string, usernameHint?: string) {
    const started = Date.now();
    while (Date.now() - started < 45000) {
      const statusRes = await fetch(
        `/api/payments/status?pendingId=${pendingId}&kind=listing_payment`,
      );
      const body = (await statusRes.json()) as {
        status?: string;
        username?: string;
        published?: boolean;
      };
      if (body.status === "verified" && body.published) {
        setPaymentUi("success");
        router.push(`/creator/${body.username ?? usernameHint}?listing=success`);
        return true;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    return false;
  }

  async function startListingPayment(creatorId: string, payerName: string, payerEmail: string) {
    setPaymentUi("preparing");
    setError("");
    try {
      const orderRes = await fetch("/api/payments/listing-order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ creatorId, payerName, payerEmail }),
      });
      const orderJson = (await orderRes.json()) as {
        error?: string;
        orderId?: string;
        key?: string;
        amount?: number;
        pendingId?: string;
        username?: string;
      };
      if (!orderRes.ok || !orderJson.orderId || !orderJson.key || !orderJson.pendingId) {
        setPaymentUi("failed");
        setError(orderJson.error ?? "Could not start listing payment.");
        return;
      }

      const { orderId, key, amount, pendingId, username: orderUsername } = orderJson;

      await loadRazorpay();
      setPaymentUi("checkout");

      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key,
          amount: amount ?? MIN_LISTING_PAYMENT * 100,
          currency: "INR",
          name: "ViralRank.buzz",
          description: `List @${orderUsername ?? username} on ViralRank`,
          order_id: orderId,
          prefill: { name: payerName, email: payerEmail },
          theme: { color: "#F5C518" },
          handler: async (response) => {
            setPaymentUi("verifying");
            try {
              const verifyRes = await fetch("/api/payments/verify-listing", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  creatorId,
                  pendingId,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                }),
              });
              const verifyJson = (await verifyRes.json()) as {
                ok?: boolean;
                username?: string;
                published?: boolean;
                error?: string;
              };
              if (!verifyRes.ok || !verifyJson.ok) {
                const polled = await pollListingPaymentStatus(pendingId, verifyJson.username ?? orderUsername);
                if (polled) {
                  resolve();
                  return;
                }
                setPaymentUi("failed");
                setError(verifyJson.error ?? "Payment verification failed.");
                reject(new Error("verify failed"));
                return;
              }
              setPaymentUi("success");
              router.push(
                `/creator/${verifyJson.username ?? orderUsername}?listing=success`,
              );
              resolve();
            } catch {
              const polled = await pollListingPaymentStatus(pendingId, orderUsername);
              if (polled) {
                resolve();
                return;
              }
              setPaymentUi("failed");
              setError("Payment verification failed.");
              reject(new Error("verify failed"));
            }
          },
          modal: {
            ondismiss: async () => {
              setPaymentUi("cancelled");
              const confirmed = await pollListingPaymentStatus(pendingId, orderUsername);
              if (!confirmed) {
                setError(
                  `Payment cancelled or still processing. Pay ₹${MIN_LISTING_PAYMENT} to publish this creator on ViralRank.`,
                );
              }
              resolve();
            },
          },
        });
        rzp.open();
      });
    } catch {
      if (paymentUi !== "cancelled") {
        setPaymentUi("failed");
        setError("Payment could not be completed.");
      }
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) {
      setError("Creator name is required.");
      return;
    }
    if (!username) {
      setError("Instagram username is required.");
      return;
    }
    if (!form.instagramUrl.trim()) {
      setError("Instagram URL is required.");
      return;
    }
    if (!form.categoryId.trim()) {
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
    if (categoriesLoading) {
      setError("Categories are still loading.");
      return;
    }
    if (categoriesError || categories.length === 0) {
      setError("Categories must load from the database before you can submit.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/creators", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          categoryId: form.categoryId,
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
        creatorId?: string;
        requiresPayment?: boolean;
        code?: string;
        missing?: string[];
        migration?: string;
        table?: string;
        failedColumn?: string;
        missingColumns?: string[];
        supabase?: { code?: string; message?: string; details?: string; hint?: string };
      };
      if (!res.ok) {
        console.error("[SubmitForm] POST /api/creators failed", {
          status: res.status,
          statusText: res.statusText,
          body: json,
          supabaseCode: json.supabase?.code,
          supabaseMessage: json.supabase?.message,
          supabaseDetails: json.supabase?.details,
          supabaseHint: json.supabase?.hint,
          table: json.table,
          failedColumn: json.failedColumn ?? json.missingColumns,
        });
      }
      if (res.status === 401 && json.code === "auth_required") {
        router.push("/login?redirect=/submit");
        return;
      }
      if (res.status === 409 && json.error === "exists" && json.username) {
        router.push(`/creator/${json.username}?intent=bid`);
        return;
      }
      if (res.status === 409 && json.error === "pending_payment" && json.creatorId) {
        await startListingPayment(json.creatorId, form.name.trim(), form.contactEmail.trim());
        return;
      }
      if (res.status === 503 && json.code === "missing_config") {
        const vars = json.missing?.length ? json.missing.join(", ") : "Supabase env vars";
        setError(`Creator submissions are not configured. Add ${vars} to the server environment.`);
        return;
      }
      if (res.status === 503 && json.code === "missing_migration") {
        setError(json.error ?? `Run ${json.migration ?? "supabase/migrations/0003_listing_payment.sql"} in Supabase.`);
        return;
      }
      if (!res.ok) {
        setError(json.error ?? "Could not save this creator.");
        return;
      }
      if (json.creatorId && json.requiresPayment) {
        await startListingPayment(json.creatorId, form.name.trim(), form.contactEmail.trim());
        return;
      }
      if (json.username) {
        router.push(`/creator/${json.username}?intent=bid`);
      }
    } catch (err) {
      console.error("[SubmitForm] POST /api/creators network error", err);
      setError("Could not save this creator. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  const submitLabel =
    paymentUi === "preparing"
      ? "Preparing payment..."
      : paymentUi === "checkout"
        ? "Payment in progress..."
        : paymentUi === "verifying"
          ? "Verifying payment..."
          : saving
            ? "Saving..."
            : `Add creator & pay ₹${MIN_LISTING_PAYMENT}`;

  return (
    <ColorBlock color="cream" padding="lg" className="overflow-visible">
      <form onSubmit={submit} className="grid gap-4 overflow-visible">
        {paymentUi === "success" ? (
          <ColorBlock color="lime" padding="md">
            <p className="text-sm font-bold text-black">Payment successful — publishing creator...</p>
          </ColorBlock>
        ) : null}
        {paymentUi === "cancelled" ? (
          <ColorBlock color="yellow" padding="md">
            <p className="text-sm font-bold text-black">
              Payment cancelled. This creator is saved but hidden until you pay ₹{MIN_LISTING_PAYMENT}.
            </p>
          </ColorBlock>
        ) : null}
        <div className="grid gap-4 overflow-visible sm:grid-cols-2">
          <Field
            label="Creator name"
            id="name"
            value={form.name}
            onChange={(v) => setForm((prev) => ({ ...prev, name: v }))}
            required
          />
          <Field
            label="Instagram username"
            id="username"
            value={form.instagramUsername}
            onChange={onUsernameChange}
            placeholder="souravjoshivlogs"
            required
          />
          <Field
            label="Instagram URL"
            id="url"
            value={form.instagramUrl}
            onChange={(v) => setForm((prev) => ({ ...prev, instagramUrl: v }))}
            placeholder="https://www.instagram.com/username/"
            required
          />
          <div className="relative z-10 overflow-visible">
            <Label htmlFor="category">Category</Label>
            <CategorySelect
              categories={categories}
              loading={categoriesLoading}
              error={categoriesError}
              onRetry={loadCategories}
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
              invalid={Boolean(error) && !form.categoryId}
            />
          </div>
          <Field
            label="Location"
            id="location"
            value={form.location}
            onChange={(v) => setForm((prev) => ({ ...prev, location: v }))}
            required
          />
          <Field
            label="Contact email"
            id="email"
            type="email"
            value={form.contactEmail}
            onChange={(v) => setForm((prev) => ({ ...prev, contactEmail: v }))}
            required
          />
          <Field
            label="Contact phone (optional)"
            id="phone"
            value={form.contactPhone}
            onChange={(v) => setForm((prev) => ({ ...prev, contactPhone: v }))}
          />
          <Field
            label="Profile image URL (optional)"
            id="image"
            value={form.profileImageUrl}
            onChange={(v) => setForm((prev) => ({ ...prev, profileImageUrl: v }))}
          />
          <Field
            label="Followers (optional)"
            id="followers"
            type="number"
            value={form.followers}
            onChange={(v) => setForm((prev) => ({ ...prev, followers: v }))}
          />
          <Field
            label="Average views (optional)"
            id="views"
            type="number"
            value={form.averageViews}
            onChange={(v) => setForm((prev) => ({ ...prev, averageViews: v }))}
          />
        </div>
        <div>
          <Label htmlFor="bio">Bio (optional)</Label>
          <Textarea id="bio" value={form.bio} onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))} />
        </div>
        <p className="text-xs font-bold text-muted-foreground">
          Listing requires a one-time ₹{MIN_LISTING_PAYMENT} payment. Creators stay hidden until payment is verified
          on the server. Rank bids are separate from listing.
        </p>
        <div className="hidden" aria-hidden>
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
          />
        </div>
        {error ? <p className="text-sm font-bold text-rose-700">{error}</p> : null}
        <BoldButton
          type="submit"
          color="pink"
          size="lg"
          disabled={
            saving ||
            categoriesLoading ||
            Boolean(categoriesError) ||
            paymentUi === "preparing" ||
            paymentUi === "checkout" ||
            paymentUi === "verifying"
          }
        >
          {submitLabel}
        </BoldButton>
      </form>
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
  placeholder,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
