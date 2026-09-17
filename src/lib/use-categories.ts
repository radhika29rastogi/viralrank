"use client";

import { useCallback, useEffect, useState } from "react";
import { CATEGORY_CATALOG, categoryIcon } from "@/lib/categories";
import type { Category } from "@/types/database";

function catalogFallback(): Category[] {
  return CATEGORY_CATALOG.map((row) => ({
    id: row.slug,
    name: row.name,
    slug: row.slug,
    icon: row.icon,
  }));
}

export function useCategories(initial: Category[] = []) {
  const [categories, setCategories] = useState<Category[]>(
    initial.length > 0 ? initial : catalogFallback(),
  );
  const [loading, setLoading] = useState(initial.length === 0);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (initial.length > 0) {
      setCategories(initial);
      setLoading(false);
      setError("");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/categories");
      const json = (await res.json()) as { categories?: Category[]; error?: string };
      if (!res.ok || !json.categories?.length) {
        setError(json.error ?? "Could not load categories from the database.");
        setCategories(catalogFallback());
        return;
      }
      setCategories(
        json.categories.map((row) => ({
          ...row,
          icon: categoryIcon(row.slug, row.icon),
        })),
      );
      setError("");
    } catch {
      setError("Could not load categories. Check your connection and try again.");
      setCategories(catalogFallback());
    } finally {
      setLoading(false);
    }
  }, [initial]);

  useEffect(() => {
    void load();
  }, [load]);

  return { categories, loading, error, reload: load };
}
