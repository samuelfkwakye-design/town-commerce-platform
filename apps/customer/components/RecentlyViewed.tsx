"use client";

import { useEffect, useState } from "react";
import { loadRecentlyViewed } from "@/lib/recentlyViewed";
import ProductCard from "@/components/ProductCard";

export default function RecentlyViewed({
  products,
  townSlug,
}: {
  products: any[];
  townSlug: string;
}) {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const ids = loadRecentlyViewed(townSlug);

    const matches = products.filter((p) => {
      const productId = String(p?.townProductId ?? p?.id ?? "");
      return ids.includes(productId);
    });

    const ordered = ids
      .map((id) =>
        matches.find((p) => String(p?.townProductId ?? p?.id ?? "") === id)
      )
      .filter(Boolean);

    setItems(ordered.slice(0, 6));
  }, [products]);

  if (!items.length) return null;

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-xl font-bold">Recently viewed</h2>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {items.map((p) => (
          <ProductCard
            key={p.townProductId ?? p.id}
            townSlug={townSlug}
            product={p as any}
          />
        ))}
      </div>
    </section>
  );
}