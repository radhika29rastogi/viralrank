export type InstagramDataSource = "instagram" | "creator_provided" | "unavailable";

export type CreatorStatus =
  | "pending"
  | "pending_payment"
  | "active"
  | "approved"
  | "rejected"
  | "featured";

export type ListingPaymentStatus = "pending" | "paid" | "failed" | "refunded";

export type PaymentStatus = "created" | "pending" | "captured" | "failed";

export type Category = {
  id: string;
  name: string;
  slug: string;
};

export type Creator = {
  id: string;
  user_id: string | null;
  instagram_username: string;
  instagram_url: string;
  name: string;
  bio: string | null;
  profile_image_url: string | null;
  category_id: string | null;
  location: string;
  contact_email: string;
  contact_phone: string | null;
  followers: number | null;
  average_views: number | null;
  instagram_data_source: InstagramDataSource;
  current_highest_bid: number;
  current_rank: number | null;
  rank_set_at: string | null;
  profile_clicks: number;
  hype_count: number;
  total_hype_amount: number;
  status: CreatorStatus;
  listing_payment_status: ListingPaymentStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  categories?: Category | null;
};

export type RankingBid = {
  id: string;
  creator_id: string;
  supporter_user_id: string | null;
  supporter_name: string;
  supporter_email: string;
  amount: number;
  currency: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  payment_status: PaymentStatus;
  is_verified: boolean;
  applied_to_rank: boolean;
  created_at: string;
};

export type Hype = {
  id: string;
  creator_id: string;
  supporter_user_id: string | null;
  supporter_name: string;
  supporter_email: string;
  amount: number;
  currency: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  payment_status: PaymentStatus;
  is_verified: boolean;
  created_at: string;
};

export type Battle = {
  id: string;
  creator_one_id: string;
  creator_two_id: string;
  creator_one_bid: number;
  creator_two_bid: number;
  winner_id: string | null;
  status: "live" | "completed";
  started_at: string;
  ended_at: string | null;
  created_at: string;
  creator_one?: Creator | null;
  creator_two?: Creator | null;
};

export type PaymentKind = "ranking_bid" | "hype" | "listing_payment";

export type CreatorListingPayment = {
  id: string;
  creator_id: string;
  payer_name: string;
  payer_email: string;
  amount: number;
  currency: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  payment_status: "pending" | "captured" | "failed";
  is_verified: boolean;
  created_at: string;
};
