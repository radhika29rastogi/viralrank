"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BoldButton, ColorBlock } from "@/components/system";
import { SmartImage } from "@/components/media/SmartImage";
import { CategorySelect } from "@/components/creator/CategorySelect";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MIN_LISTING_PAYMENT } from "@/lib/creators/public";
import { DISCOUNTED_LISTING_PAYMENT } from "@/lib/coupons/listing";
import { instagramUrlFromUsername, normalizeInstagramUsername } from "@/lib/format";
import { openRazorpayCheckout } from "@/lib/razorpay/checkout-client";
import type { Category } from "@/types/database";

type PaymentUiState = "idle" | "preparing" | "checkout" | "verifying" | "success" | "failed" | "cancelled";

type CouponState =
  | { status: "idle" }
  | { status: "validating" }
  | { status: "valid"; code: string; discountInr: number; finalAmountInr: number; message: string }
  | { status: "invalid"; message: string };

export function SubmitForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [paymentUi, setPaymentUi] = useState<PaymentUiState>("idle");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [couponState, setCouponState] = useState<CouponState>({ status: "idle" });
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);

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

  async function startListingPayment(
    creatorId: string,
    payerName: string,
    payerEmail: string,
    couponCode?: string | null,
  ) {
    setPaymentUi("preparing");
    setError("");
    try {
      const orderRes = await fetch("/api/create-order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ creatorId, payerName, payerEmail, couponCode: couponCode ?? undefined }),
      });
      const orderJson = (await orderRes.json()) as {
        success?: boolean;
        error?: string;
        details?: string;
        code?: string;
        order_id?: string;
        key_id?: string;
        amount?: number;
        pending_id?: string;
        username?: string;
      };
      if (
        !orderRes.ok ||
        !orderJson.success ||
        !orderJson.order_id ||
        !orderJson.key_id ||
        !orderJson.pending_id
      ) {
        console.error("[SubmitForm] POST /api/create-order failed", {
          status: orderRes.status,
          statusText: orderRes.statusText,
          body: orderJson,
        });
        setPaymentUi("failed");
        const message = orderJson.details
          ? `${orderJson.error ?? "Could not create a payment order."} ${orderJson.details}`
          : (orderJson.error ?? "Could not create a payment order.");
        setError(message);
        return;
      }

      const {
        order_id: orderId,
        key_id: keyId,
        amount,
        pending_id: pendingId,
        username: orderUsername,
      } = orderJson;

      setPaymentUi("checkout");

      await openRazorpayCheckout({
        key: keyId,
        amount: amount ?? MIN_LISTING_PAYMENT * 100,
        currency: "INR",
        name: "ViralRank.buzz",
        description: `List @${orderUsername ?? username} on ViralRank`,
        order_id: orderId,
        prefill: { name: payerName, email: payerEmail },
        theme: { color: "#F5C518" },
        onSuccess: async (response) => {
          setPaymentUi("verifying");
          const verifyRes = await fetch("/api/verify-payment", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              creator_id: creatorId,
              pending_id: pendingId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          const verifyJson = (await verifyRes.json()) as {
            success?: boolean;
            verified?: boolean;
            ok?: boolean;
            username?: string;
            published?: boolean;
            error?: string;
          };
          if (!verifyRes.ok || !verifyJson.success || !verifyJson.verified) {
            const polled = await pollListingPaymentStatus(pendingId, verifyJson.username ?? orderUsername);
            if (!polled) {
              setPaymentUi("failed");
              setError(verifyJson.error ?? "Payment verification failed.");
            }
            return;
          }
          setPaymentUi("success");
          router.push(`/creator/${verifyJson.username ?? orderUsername}?listing=success`);
        },
        onDismiss: async () => {
          setPaymentUi("cancelled");
          const confirmed = await pollListingPaymentStatus(pendingId, orderUsername);
          if (!confirmed) {
            setError(
              `Payment cancelled or still processing. Pay ₹${MIN_LISTING_PAYMENT} to publish this creator on ViralRank.`,
            );
          }
        },
        onFailed: (message) => {
          setPaymentUi("failed");
          setError(message || "Payment failed.");
        },
      });
    } catch {
      if (paymentUi !== "cancelled") {
        setPaymentUi("failed");
        setError("Payment could not be completed.");
      }
    }
  }

  async function applyCoupon() {
    const code = couponInput.trim();
    if (!code) {
      setCouponState({ status: "idle" });
      setAppliedCouponCode(null);
      return;
    }
    setCouponState({ status: "validating" });
    setError("");
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = (await res.json()) as {
        valid?: boolean;
        message?: string;
        error?: string;
        code?: string;
        discountInr?: number;
        finalAmountInr?: number;
      };
      if (!res.ok || !json.valid) {
        setCouponState({ status: "invalid", message: json.error ?? "Invalid or expired coupon code." });
        setAppliedCouponCode(null);
        return;
      }
      setCouponState({
        status: "valid",
        code: json.code ?? code.toUpperCase(),
        discountInr: json.discountInr ?? 0,
        finalAmountInr: json.finalAmountInr ?? MIN_LISTING_PAYMENT,
        message: json.message ?? "Coupon applied.",
      });
      setAppliedCouponCode(json.code ?? code.toUpperCase());
    } catch {
      setCouponState({ status: "invalid", message: "Could not validate coupon." });
      setAppliedCouponCode(null);
    }
  }

  async function uploadSelectedImage(): Promise<string | null> {
    if (uploadedImageUrl) return uploadedImageUrl;
    if (!imageFile) return form.profileImageUrl.trim() || null;

    setImageUploading(true);
    try {
      const body = new FormData();
      body.append("file", imageFile);
      const res = await fetch("/api/creators/upload-image", { method: "POST", body });
      const json = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !json.url) {
        setError(json.error ?? "Image upload failed. Please try again.");
        return null;
      }
      setUploadedImageUrl(json.url);
      setForm((prev) => ({ ...prev, profileImageUrl: json.url ?? "" }));
      return json.url;
    } catch {
      setError("Image upload failed. Please try again.");
      return null;
    } finally {
      setImageUploading(false);
    }
  }

  function onImageSelected(file: File | null) {
    if (!file) {
      setImageFile(null);
      setImagePreview("");
      setUploadedImageUrl("");
      return;
    }
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError("Use JPG, PNG, or WebP images only.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be 5 MB or smaller.");
      return;
    }
    setImageFile(file);
    setUploadedImageUrl("");
    setImagePreview(URL.createObjectURL(file));
    setError("");
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
      const imageUrl = await uploadSelectedImage();
      if (imageFile && !imageUrl) {
        return;
      }

      const res = await fetch("/api/creators", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          profileImageUrl: imageUrl ?? form.profileImageUrl,
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
      if (res.status === 401 && json.code === "auth_required") {
        router.push("/login?redirect=/submit");
        return;
      }
      if (res.status === 409 && json.error === "exists" && json.username) {
        router.push(`/creator/${json.username}?intent=bid`);
        return;
      }
      if (res.status === 409 && json.error === "pending_payment" && json.creatorId) {
        await startListingPayment(
          json.creatorId,
          form.name.trim(),
          form.contactEmail.trim(),
          appliedCouponCode,
        );
        return;
      }
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
        await startListingPayment(
          json.creatorId,
          form.name.trim(),
          form.contactEmail.trim(),
          appliedCouponCode,
        );
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

  const payAmount =
    couponState.status === "valid" ? couponState.finalAmountInr : MIN_LISTING_PAYMENT;

  const submitLabel =
    paymentUi === "preparing"
      ? "Preparing payment..."
      : paymentUi === "checkout"
        ? "Payment in progress..."
        : paymentUi === "verifying"
          ? "Verifying payment..."
          : imageUploading
            ? "Uploading image..."
            : saving
              ? "Saving..."
              : `Add creator & pay ₹${payAmount}`;

  return (
    <ColorBlock color="cream" padding="lg" className="overflow-visible">
      <form onSubmit={submit} className="grid gap-4 overflow-visible">
        {paymentUi === "success" ? (
          <ColorBlock color="lime" padding="md">
            <p className="text-sm font-bold text-on-accent">Payment successful — publishing creator...</p>
          </ColorBlock>
        ) : null}
        {paymentUi === "cancelled" ? (
          <ColorBlock color="yellow" padding="md">
            <p className="text-sm font-bold text-on-accent">
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
          <div className="sm:col-span-2">
            <Label htmlFor="creator-image">Creator photo</Label>
            <Input
              id="creator-image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => onImageSelected(e.target.files?.[0] ?? null)}
            />
            {imagePreview ? (
              <SmartImage
                src={imagePreview}
                alt="Preview"
                size="lg"
                className="mt-2 size-24 rounded-2xl border-[3px] border-border"
              />
            ) : null}
            {imageUploading ? (
              <p className="mt-1 text-xs font-bold text-muted-foreground">Uploading image...</p>
            ) : null}
          </div>
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
        <ColorBlock color="yellow" padding="md" className="space-y-3">
          <p className="text-sm font-extrabold text-on-accent">Listing fee: ₹{MIN_LISTING_PAYMENT}</p>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <div>
              <Label htmlFor="coupon">Coupon</Label>
              <Input
                id="coupon"
                value={couponInput}
                placeholder="Enter coupon code"
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
              />
            </div>
            <div className="flex items-end">
              <BoldButton
                type="button"
                color="pink"
                disabled={couponState.status === "validating"}
                onClick={() => void applyCoupon()}
              >
                {couponState.status === "validating" ? "Applying..." : "Apply"}
              </BoldButton>
            </div>
          </div>
          {couponState.status === "valid" ? (
            <div className="text-sm font-bold text-on-accent">
              <p>₹{MIN_LISTING_PAYMENT}</p>
              <p>- ₹{couponState.discountInr} discount</p>
              <p className="mt-1 border-t border-border/20 pt-1">You pay ₹{couponState.finalAmountInr}</p>
              <p className="mt-1 text-xs text-on-accent/80">{couponState.message}</p>
            </div>
          ) : couponState.status === "invalid" ? (
            <p className="text-sm font-bold text-rose-700">{couponState.message}</p>
          ) : (
            <p className="text-sm font-bold text-on-accent">You pay ₹{MIN_LISTING_PAYMENT}</p>
          )}
        </ColorBlock>
        <p className="text-xs font-bold text-muted-foreground">
          Listing requires a one-time payment (₹{MIN_LISTING_PAYMENT}, or ₹{DISCOUNTED_LISTING_PAYMENT} with FIRST50).
          Creators stay hidden until Razorpay payment is verified on the server. Rank bids are separate from listing.
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
            imageUploading ||
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
