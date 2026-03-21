"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  getCartItemAddedEventName,
  getCartItemCount,
  getCartSubtotal,
  getCartUpdatedEventName,
  loadCart,
} from "@/lib/cart";
import type { CartItem, MiniCartItemAddedDetail } from "@/lib/types";

type Props = {
  townSlug: string;
};

export default function FloatingMiniCart({ townSlug }: Props) {
  const [open, setOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<MiniCartItemAddedDetail | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    setCart(loadCart());
  }, []);

  useEffect(() => {
    const handleUpdated = () => {
      setCart(loadCart());
    };

    const handleAdded = (event: Event) => {
      const customEvent = event as CustomEvent<MiniCartItemAddedDetail>;
      const detail = customEvent.detail;
      if (!detail) return;
      if (detail.townSlug !== townSlug) return;

      setLastAdded(detail);
      setCart(loadCart());
      setOpen(true);
    };

    const updatedEvent = getCartUpdatedEventName();
    const addedEvent = getCartItemAddedEventName();

    window.addEventListener(updatedEvent, handleUpdated);
    window.addEventListener(addedEvent, handleAdded as EventListener);

    return () => {
      window.removeEventListener(updatedEvent, handleUpdated);
      window.removeEventListener(addedEvent, handleAdded as EventListener);
    };
  }, [townSlug]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => setOpen(false), 3500);
    return () => window.clearTimeout(timer);
  }, [open]);

  const itemCount = useMemo(() => getCartItemCount(cart), [cart]);
  const subtotal = useMemo(() => getCartSubtotal(cart), [cart]);

  if (!open || !lastAdded) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[70] w-[calc(100vw-2rem)] max-w-sm rounded-2xl border bg-white p-4 shadow-2xl">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-green-600">Added to cart ✓</div>
          <div className="mt-1 text-sm font-medium">{lastAdded.name}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {lastAdded.pricingModel === "WEIGHT" && lastAdded.weightGrams
              ? `${lastAdded.weightGrams}g added`
              : lastAdded.variantLabel
              ? `${lastAdded.variantLabel}${lastAdded.quantity ? ` × ${lastAdded.quantity}` : ""}`
              : `${lastAdded.quantity ?? 1} item${(lastAdded.quantity ?? 1) > 1 ? "s" : ""}`}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>

      <div className="mb-4 rounded-xl bg-muted/50 p-3 text-sm">
        <div className="flex items-center justify-between">
          <span>Cart items</span>
          <span className="font-semibold">{itemCount}</span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span>Subtotal</span>
          <span className="font-semibold">GHS {subtotal.toFixed(2)}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button asChild className="flex-1">
          <Link href={`/${townSlug}/cart`}>View cart</Link>
        </Button>
        <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
          Continue shopping
        </Button>
      </div>
    </div>
  );
}
