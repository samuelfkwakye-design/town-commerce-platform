"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  getCartSubtotal,
  getCartUpdatedEventName,
  loadCart,
  saveCart,
} from "@/lib/cart";
import type { CartItem } from "@/lib/types";

function formatMoney(value: number) {
  return value.toFixed(2);
}

function getLineLabel(item: CartItem) {
  const quantity = Number((item as any).quantity ?? 0);
  const weightGrams = Number((item as any).weightGrams ?? 0);

  if (item.pricingModel === "WEIGHT" && weightGrams > 0) {
    return `${weightGrams}g`;
  }

  if (quantity > 0) {
    return `Qty ${quantity}`;
  }

  return "";
}
function getVariantLabel(item: CartItem) {
  return (item as any).variantLabel ?? "";
}

function getLineTotal(item: CartItem) {
  const quantity = Number((item as any).quantity ?? 0);
  const weightGrams = Number((item as any).weightGrams ?? 0);
  const unitPrice = Number((item as any).unitPrice ?? 0);
  const pricePerKg = Number((item as any).pricePerKg ?? 0);

  if (item.pricingModel === "WEIGHT") {
    return (pricePerKg * weightGrams) / 1000;
  }

  return unitPrice * quantity;
}
export default function CartDrawer({
  townSlug,
  open,
  onClose,
}: {
  townSlug: string;
  open: boolean;
  onClose: () => void;
}) {
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    if (!open) return;
    setCart(loadCart());
  }, [open]);

  useEffect(() => {
    const sync = () => setCart(loadCart());
    const eventName = getCartUpdatedEventName();

    window.addEventListener(eventName, sync as EventListener);
    return () => window.removeEventListener(eventName, sync as EventListener);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const subtotal = useMemo(() => getCartSubtotal(cart), [cart]);

  function removeItem(index: number) {
  const next = cart.filter((_, i) => i !== index);
  setCart(next);
  saveCart(next);
}
  if (!open) return null;

  return (
    <>
      <button
        aria-label="Close cart drawer overlay"
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />

      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-4 py-4">
          <div>
            <h2 className="text-lg font-semibold">Your cart</h2>
            <p className="text-sm text-gray-500">
              {cart.length} {cart.length === 1 ? "item" : "items"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {cart.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-6 text-center">
              <p className="text-base font-medium">Your cart is empty</p>
              <p className="mt-2 text-sm text-gray-500">
                Add a few items to get started.
              </p>

              <Link
                href={`/${townSlug}`}
                onClick={onClose}
                className="mt-4 inline-flex rounded-xl border px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Continue shopping
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item, index) => (
                <div
                  key={`${item.townProductId}-${index}`}
                  className="rounded-2xl border p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">
                        {item.name}
                      </div>

                      {getVariantLabel(item) ? (
                        <div className="mt-1 text-xs text-gray-500">
                          {getVariantLabel(item)}
                        </div>
                      ) : null}

                      <div className="mt-1 text-xs text-gray-500">
                        {getLineLabel(item)}
                      </div>

                      <div className="mt-2 text-sm font-medium">
                        GHS {formatMoney(getLineTotal(item))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="shrink-0 rounded-lg border px-2 py-1 text-xs font-medium hover:bg-gray-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t px-4 py-4">
          <div className="mb-4 flex items-center justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-semibold">GHS {formatMoney(subtotal)}</span>
          </div>

          <div className="grid gap-2">
            <Link
              href={`/${townSlug}/cart`}
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white hover:opacity-90"
            >
              View cart
            </Link>

            <Link
              href={`/${townSlug}`}
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-xl border px-4 py-3 text-sm font-medium hover:bg-gray-50"
            >
              Continue shopping
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}