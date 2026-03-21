"use client";

import { useState } from "react";
import CartDrawer from "@/components/CartDrawer";
import FloatingMiniCart from "@/components/FloatingMiniCart";
import TownHeader from "@/components/TownHeader";
import type { SearchableCategory, SearchableProduct } from "@/lib/types";

export default function TownShell({
  townSlug,
  categories,
  products,
  children,
}: {
  townSlug: string;
  categories: SearchableCategory[];
  products: SearchableProduct[];
  children: React.ReactNode;
}) {
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[linear-gradient(to_bottom,_#fff7ed_0%,_#ffffff_220px,_#ffffff_100%)] text-foreground">
      <TownHeader
        townSlug={townSlug}
        categories={categories}
        products={products}
        onCartClick={() => setCartOpen(true)}
      />

      <main className="mx-auto max-w-7xl px-6 pb-10">{children}</main>

      <FloatingMiniCart townSlug={townSlug} />

      <CartDrawer
        townSlug={townSlug}
        open={cartOpen}
        onClose={() => setCartOpen(false)}
      />
    </div>
  );
}
