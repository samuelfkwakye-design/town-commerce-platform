"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { clearCart, loadCart, saveCart } from "@/lib/cart";
import { apiFetch } from "@/lib/api";
import type { CartItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import CheckoutProgress from "@/components/CheckoutProgress";

type TownSettingsResponse = {
  town?: {
    id: string;
    name: string;
    slug: string;
  };
  settings?: {
    townId?: string;
    deliveryFee?: string;
    serviceFee?: string;
    minimumOrder?: string;
    currency?: string;
  };
};

function money(n: number) {
  return n.toFixed(2);
}

export default function CartPage() {
  const params = useParams<{ townSlug: string }>();
  const townSlug = params?.townSlug;

  const [items, setItems] = useState<CartItem[]>([]);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [serviceFee, setServiceFee] = useState(0);
  const [minimumOrder, setMinimumOrder] = useState(0);
  const [currency, setCurrency] = useState("GHS");

  useEffect(() => {
    setItems(loadCart());
  }, []);

  useEffect(() => {
    if (!townSlug) return;

    async function loadTownSettings() {
      try {
        const json: TownSettingsResponse = await apiFetch(
          `/town-settings/by-slug/${encodeURIComponent(townSlug)}`,
          { cache: "no-store" },
        );

        setDeliveryFee(Number(json?.settings?.deliveryFee ?? 0));
        setServiceFee(Number(json?.settings?.serviceFee ?? 0));
        setMinimumOrder(Number(json?.settings?.minimumOrder ?? 0));
        setCurrency(json?.settings?.currency || "GHS");
      } catch {
        setDeliveryFee(0);
        setServiceFee(0);
        setMinimumOrder(0);
        setCurrency("GHS");
      }
    }

    loadTownSettings();
  }, [townSlug]);

  const totals = useMemo(() => {
    let subtotal = 0;

    for (const it of items) {
      if (it.pricingModel === "UNIT") {
        subtotal += Number(it.unitPrice) * it.quantity;
      } else if (it.pricingModel === "WEIGHT") {
        subtotal += (Number(it.pricePerKg) * it.weightGrams) / 1000;
      } else {
        subtotal += Number(it.unitPrice) * it.quantity;
      }
    }

    const total = subtotal + deliveryFee + serviceFee;
    const belowMinimum = subtotal > 0 && subtotal < minimumOrder;

    return {
      subtotal,
      deliveryFee,
      serviceFee,
      total,
      belowMinimum,
    };
  }, [items, deliveryFee, serviceFee, minimumOrder]);

  function removeAt(i: number) {
    const next = items.filter((_, idx) => idx !== i);
    setItems(next);
    saveCart(next);
  }

  function changeQty(i: number, nextQty: number) {
    const next = [...items];
    const it = next[i];
    if (!it) return;
    if (it.pricingModel === "WEIGHT") return;

    nextQty = Math.max(1, Number(nextQty || 1));
    (it as any).quantity = nextQty;

    setItems(next);
    saveCart(next);
  }

  function changeGrams(i: number, nextGrams: number) {
    const next = [...items];
    const it = next[i];
    if (!it) return;
    if (it.pricingModel !== "WEIGHT") return;

    nextGrams = Math.max(1, Number(nextGrams || 1));
    (it as any).weightGrams = nextGrams;

    setItems(next);
    saveCart(next);
  }

  function wipe() {
    clearCart();
    setItems([]);
  }

  return (
    <div className="pt-6">
      <CheckoutProgress step="cart" />

      <div className="mt-6 flex items-center justify-between gap-3">
        <Link
          href={townSlug ? `/${townSlug}` : "/"}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          ← Back to market
        </Link>

        <Button
          variant="outline"
          onClick={wipe}
          className="transition active:scale-[0.98]"
        >
          Clear cart
        </Button>
      </div>

      <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Cart</h1>

      {items.length === 0 ? (
        <Card className="mt-6 rounded-2xl p-6">
          <div className="text-slate-700">Your cart is empty.</div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={townSlug ? `/${townSlug}` : "/"}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground transition hover:bg-primary/90 active:scale-[0.98]"
            >
              Browse products →
            </Link>

            <Link
              href={townSlug ? `/${townSlug}` : "/"}
              className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm transition hover:bg-slate-50 active:scale-[0.98]"
            >
              Continue shopping
            </Link>
          </div>
        </Card>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {items.map((it, idx) => (
              <Card key={idx} className="rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold">{it.name}</div>

                    {it.pricingModel === "VARIANT" ? (
                      <div className="mt-1 text-sm text-slate-600">
                        Variant: <span className="font-medium">{it.variantLabel}</span>
                      </div>
                    ) : null}

                    <div className="mt-1 text-sm text-slate-500">
                      Pricing: <span className="font-medium">{it.pricingModel}</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => removeAt(idx)}
                    className="transition active:scale-[0.98]"
                  >
                    Remove
                  </Button>
                </div>

                <Separator className="my-4" />

                {it.pricingModel === "WEIGHT" ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm font-medium">Weight (g)</div>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={1}
                        value={it.weightGrams}
                        onChange={(e) => changeGrams(idx, Number(e.target.value))}
                        className="w-40 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                      />
                      <div className="text-sm text-slate-600">
                        {it.pricePerKg} <span className="text-slate-500">{currency}/kg</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm font-medium">Quantity</div>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={1}
                        value={it.quantity}
                        onChange={(e) => changeQty(idx, Number(e.target.value))}
                        className="w-32 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                      />
                      <div className="text-sm text-slate-600">
                        {it.unitPrice} <span className="text-slate-500">{currency} each</span>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-6 rounded-2xl p-5">
              <div className="text-lg font-semibold">Order summary</div>
              <Separator className="my-4" />

              <div className="flex items-center justify-between text-sm text-slate-600">
                <div>Items</div>
                <div>{items.length}</div>
              </div>

              <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                <div>Subtotal</div>
                <div>
                  {money(totals.subtotal)} {currency}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                <div>Service fee</div>
                <div>
                  {money(totals.serviceFee)} {currency}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                <div>Delivery fee</div>
                <div>
                  {money(totals.deliveryFee)} {currency}
                </div>
              </div>

              <Separator className="my-4" />

              <div className="mt-3 flex items-center justify-between text-base">
                <div className="font-medium">Total</div>
                <div className="text-xl font-extrabold">
                  {money(totals.total)} <span className="text-base font-semibold">{currency}</span>
                </div>
              </div>

              {minimumOrder > 0 ? (
                <div className="mt-4 text-xs text-slate-500">
                  Minimum order: {money(minimumOrder)} {currency}
                </div>
              ) : null}

              {totals.belowMinimum ? (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Your subtotal is below the minimum order for this town.
                </div>
              ) : null}

              <div className="mt-5 grid gap-3">
                <Link href={townSlug ? `/${townSlug}/checkout` : "/"}>
                  <Button
                    className="w-full transition hover:bg-primary/90 active:scale-[0.98]"
                    disabled={totals.belowMinimum}
                  >
                    Checkout →
                  </Button>
                </Link>

                <Link href={townSlug ? `/${townSlug}` : "/"}>
                  <Button variant="outline" className="w-full">
                    Continue shopping
                  </Button>
                </Link>
              </div>

              <div className="mt-3 text-xs text-slate-500">
                Fees are based on the selected town.
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}