import { unstable_cache } from "next/cache";
import {
  getArenaFeed,
  getCategories,
  getCreators,
  getLiveBattle,
  getRankedCreators,
  getTopTwo,
} from "@/lib/queries";

export const LISTING_REVALIDATE_SECONDS = 30;

export function cachedRankedCreators(options: {
  category?: string;
  range?: "all" | "today";
  limit?: number;
}) {
  return unstable_cache(
    () => getRankedCreators(options),
    [
      "ranked-creators",
      options.category ?? "all",
      options.range ?? "all",
      String(options.limit ?? 40),
    ],
    { revalidate: LISTING_REVALIDATE_SECONDS, tags: ["listings"] },
  )();
}

export function cachedCreators(options: {
  category?: string;
  sort?: "bid" | "hype" | "clicks" | "followers" | "newest" | "trending";
  search?: string;
  limit?: number;
  offset?: number;
}) {
  return unstable_cache(
    () => getCreators(options),
    [
      "creators",
      options.category ?? "",
      options.sort ?? "bid",
      options.search ?? "",
      String(options.limit ?? 24),
      String(options.offset ?? 0),
    ],
    { revalidate: LISTING_REVALIDATE_SECONDS, tags: ["listings"] },
  )();
}

export function cachedCategories() {
  return unstable_cache(() => getCategories(), ["categories"], {
    revalidate: 300,
    tags: ["categories"],
  })();
}

export function cachedArenaFeed(limit = 24) {
  return unstable_cache(() => getArenaFeed(limit), ["arena-feed", String(limit)], {
    revalidate: LISTING_REVALIDATE_SECONDS,
    tags: ["listings"],
  })();
}

export function cachedTopTwo() {
  return unstable_cache(() => getTopTwo(), ["top-two"], {
    revalidate: LISTING_REVALIDATE_SECONDS,
    tags: ["listings"],
  })();
}

export function cachedLiveBattle() {
  return unstable_cache(() => getLiveBattle(), ["live-battle"], {
    revalidate: LISTING_REVALIDATE_SECONDS,
    tags: ["listings"],
  })();
}
