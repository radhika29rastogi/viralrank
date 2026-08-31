import { z } from "zod";
import { isValidInstagramUsername } from "@/lib/instagram/username";
import { MIN_HYPE, MIN_RANKING_BID } from "@/lib/ranking";

const email = z.email("Enter a valid email");

export const submitCreatorSchema = z.object({
  name: z.string().trim().min(1, "Creator name is required").max(80),
  instagramUsername: z
    .string()
    .trim()
    .min(1)
    .max(30)
    .refine(isValidInstagramUsername, "Enter a valid Instagram username"),
  instagramUrl: z.url("Enter a valid Instagram URL"),
  categoryId: z.uuid("Please select a category."),
  category: z.string().trim().max(40).optional(),
  location: z.string().trim().min(1, "Location is required").max(80),
  contactEmail: email,
  contactPhone: z.string().trim().max(20).optional(),
  bio: z.string().trim().max(500).optional(),
  followers: z.coerce.number().int().nonnegative().optional(),
  averageViews: z.coerce.number().int().nonnegative().optional(),
  profileImageUrl: z.union([z.url(), z.literal("")]).optional(),
  website: z.string().max(0).optional(),
  turnstileToken: z.string().optional(),
});

export const paymentOrderSchema = z.object({
  kind: z.enum(["ranking_bid", "hype"]),
  creatorId: z.uuid(),
  amount: z.coerce.number().positive(),
  supporterName: z.string().trim().min(1).max(80),
  supporterEmail: email,
});

export const rankingAmountSchema = z.coerce.number().min(MIN_RANKING_BID);
export const hypeAmountSchema = z.coerce.number().min(MIN_HYPE);

export const adminCreatorUpdateSchema = z.object({
  id: z.uuid(),
  status: z.enum(["pending", "pending_payment", "active", "approved", "rejected", "featured"]).optional(),
  listingPaymentStatus: z.enum(["pending", "paid", "failed", "refunded"]).optional(),
  categoryId: z.uuid().optional(),
  name: z.string().trim().min(1).max(80).optional(),
});
