"use client";

import { useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import CartDrawer from "@/components/CartDrawer";
import FloatingMiniCart from "@/components/FloatingMiniCart";
import TownHeader from "@/components/TownHeader";
import type { SearchableCategory, SearchableProduct } from "@/lib/types";

function buildWhatsappLink(number?: string | null, townName?: string) {
  if (!number) return null;

  const cleaned = number.replace(/[^\d]/g, "");
  if (!cleaned) return null;

  const message = encodeURIComponent(
    `Hello KOSTOMA, I need help shopping in ${townName || "my town"}.`
  );

  return `https://wa.me/${cleaned}?text=${message}`;
}

export default function TownShell({
  townSlug,
  townName,
  whatsappNumber,
  categories,
  products,
  children,
}: {
  townSlug: string;
  townName?: string | null;
  whatsappNumber?: string | null;
  categories: SearchableCategory[];
  products: SearchableProduct[];
  children: React.ReactNode;
}) {
  const [cartOpen, setCartOpen] = useState(false);

  const whatsappLink = useMemo(
    () => buildWhatsappLink(whatsappNumber, townName || townSlug),
    [whatsappNumber, townName, townSlug]
  );

  return (
    <div className="min-h-screen bg-[linear-gradient(to_bottom,_#fff7ed_0%,_#ffffff_220px,_#ffffff_100%)] text-foreground">
      <TownHeader
        townSlug={townSlug}
        categories={categories}
        products={products}
        onCartClick={() => setCartOpen(true)}
      />

      <main className="mx-auto max-w-7xl px-6 pb-10">{children}</main>

      {whatsappLink ? (
        <a
          href={whatsappLink}
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-24 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-green-600 px-4 py-3 text-sm font-black text-white shadow-2xl ring-4 ring-white/80 hover:bg-green-700 sm:bottom-8 sm:right-6"
          aria-label={`Contact ${townName || townSlug} support on WhatsApp`}
        >
          <MessageCircle className="h-5 w-5" />
          <span className="hidden sm:inline">Need Help?</span>
          <span className="sm:hidden">Help</span>
        </a>
      ) : null}

      <FloatingMiniCart townSlug={townSlug} />

      <CartDrawer
        townSlug={townSlug}
        open={cartOpen}
        onClose={() => setCartOpen(false)}
      />
    </div>
  );
}