"use client";

import Link from "next/link";
import type { SearchableCategory, SearchableProduct } from "@/lib/types";

type Props = {
  townSlug: string;
  query: string;
  products: SearchableProduct[];
  categories: SearchableCategory[];
  onSelect?: () => void;
};

function scoreProduct(product: SearchableProduct, q: string) {
  const name = product.name?.toLowerCase() ?? "";
  const category = product.categoryName?.toLowerCase() ?? "";

  let score = 0;

  if (name.startsWith(q)) score += 5;
  if (name.includes(q)) score += 3;
  if (category.includes(q)) score += 1;

  return score;
}

export default function InstantSearchResults({
  townSlug,
  query,
  products,
  categories,
  onSelect,
}: Props) {
  const q = query.trim().toLowerCase();

  if (!q) return null;

  // Rank products
  const matchedProducts = products
    .map((p) => ({
      product: p,
      score: scoreProduct(p, q),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.product)
    .slice(0, 6);

  // Match categories
  const matchedCategories = categories
    .filter((c) => c.name?.toLowerCase().includes(q))
    .slice(0, 6);

  const hasResults =
    matchedProducts.length > 0 || matchedCategories.length > 0;

  return (
    <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border bg-white shadow-2xl">
      {!hasResults ? (
        <div className="p-4 text-sm text-slate-500">
          No results found
        </div>
      ) : (
        <div className="max-h-[420px] overflow-y-auto">

          {/* PRODUCTS */}
          {matchedProducts.length > 0 && (
            <div className="border-b">
              <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Products
              </div>

              {matchedProducts.map((product) => (
                <Link
                  key={product.id}
                  href={`/${townSlug}/product/${product.id}`}
                  onClick={onSelect}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">
                      {product.name}
                    </div>

                    <div className="truncate text-xs text-slate-500">
                      {product.categoryName ?? "Product"}
                    </div>
                  </div>

                  <div className="text-xs font-medium text-slate-500">
                    {product.priceLabel}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* CATEGORIES */}
          {matchedCategories.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Categories
              </div>

              {matchedCategories.map((category) => (
                <Link
                  key={category.id}
                  href={`/${townSlug}?categorySlug=${category.slug}`}
                  onClick={onSelect}
                  className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}