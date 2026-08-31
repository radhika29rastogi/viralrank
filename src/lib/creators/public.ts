/** Creators visible on public pages, APIs, and search. */
export const PUBLIC_CREATOR_STATUS = "active" as const;
export const PUBLIC_LISTING_PAYMENT_STATUS = "paid" as const;

export function isPublicCreator(row: {
  status?: string | null;
  listing_payment_status?: string | null;
}) {
  return (
    row.status === PUBLIC_CREATOR_STATUS &&
    row.listing_payment_status === PUBLIC_LISTING_PAYMENT_STATUS
  );
}

export const MIN_LISTING_PAYMENT = 199;
