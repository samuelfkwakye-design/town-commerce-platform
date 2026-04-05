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

function QtyStepper({
  value,
  onDecrease,
  onIncrease,
}: {
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <div className="flex h-12 w-full items-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:w-auto">
      <button
        type="button"
        onClick={onDecrease}
        className="flex h-full w-12 shrink-0 items-center justify-center text-xl font-semibold text-slate-700 transition active:bg-slate-100"
        aria-label="Decrease quantity"
      >
        −
      </button>

      <div className="flex flex-1 items-center justify-center border-x border-slate-200 px-4 text-base font-semibold text-slate-900 sm:min-w-[4rem] sm:flex-none">
        {value}
      </div>

      <button
        type="button"
        onClick={onIncrease}
        className="flex h-full w-12 shrink-0 items-center justify-center text-xl font-semibold text-slate-700 transition active:bg-slate-100"
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}

type WeightStepperProps = {
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
  onChange: (next: number) => void;
};

function WeightStepper({
  value,
  onDecrease,
  onIncrease,
  onChange,
}: WeightStepperProps) {
  return (
    <div className="flex w-full items-center gap-2 sm:w-auto">
      <button
        type="button"
        onClick={onDecrease}
        className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-xl font-semibold text-slate-700 transition active:bg-slate-100"
        aria-label="Decrease weight"
      >
        −
      </button>

      <input
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-center text-base outline-none focus:border-[#f97316] sm:w-32"
      />

      <button
        type="button"
        onClick={onIncrease}
        className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-xl font-semibold text-slate-700 transition active:bg-slate-100"
        aria-label="Increase weight"
      >
        +
      </button>
    </div>
  );
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
          { cache: "no-store" }
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
    <div className="pt-4 sm:pt-6">
      <CheckoutProgress step="cart" />

      <div className="mt-5 flex flex-col gap-3 sm:mt-6 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={townSlug ? `/${townSlug}` : "/"}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          ← Back to market
        </Link>

        <Button
          variant="outline"
          onClick={wipe}
          className="w-full rounded-2xl border-slate-200 transition active:scale-[0.98] sm:w-auto"
        >
          Clear cart
        </Button>
      </div>

      <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
        Cart
      </h1>

      {items.length === 0 ? (
        <Card className="mt-6 rounded-3xl border-orange-100 p-5 shadow-sm sm:p-6">
          <div className="text-slate-700">Your cart is empty.</div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={townSlug ? `/${townSlug}` : "/"}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-[#f97316] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#ea580c] active:scale-[0.98] sm:w-auto"
            >
              Browse products →
            </Link>

            <Link
              href={townSlug ? `/${townSlug}` : "/"}
              className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] sm:w-auto"
            >
              Continue shopping
            </Link>
          </div>
        </Card>
      ) : (
        <div className="mt-6 grid gap-5 sm:gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {items.map((it, idx) => {
              const lineTotal =
                it.pricingModel === "WEIGHT"
                  ? (Number(it.pricePerKg) * Number(it.weightGrams)) / 1000
                  : Number(it.unitPrice) * Number(it.quantity);

              return (
                <Card
                  key={idx}
                  className="rounded-3xl border-orange-100 p-4 shadow-sm sm:p-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                      <div className="break-words text-base font-semibold text-slate-900 sm:text-lg">
                        {it.name}
                      </div>

                      {it.pricingModel === "VARIANT" ? (
                        <div className="mt-1 text-sm text-slate-600">
                          Variant:{" "}
                          <span className="font-medium">{it.variantLabel}</span>
                        </div>
                      ) : null}

                      <div className="mt-1 text-sm text-slate-500">
                        Pricing:{" "}
                        <span className="font-medium">{it.pricingModel}</span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => removeAt(idx)}
                      className="w-full rounded-2xl border-slate-200 transition active:scale-[0.98] sm:w-auto"
                    >
                      Remove
                    </Button>
                  </div>

                  <Separator className="my-4" />

                  {it.pricingModel === "WEIGHT" ? (
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-slate-900">
                        Weight (g)
                      </div>

                      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                        <WeightStepper
                          value={Number(it.weightGrams)}
                          onDecrease={() =>
                            changeGrams(
                              idx,
                              Math.max(1, Number(it.weightGrams) - 100)
                            )
                          }
                          onIncrease={() =>
                            changeGrams(idx, Number(it.weightGrams) + 100)
                          }
                          onChange={(next) => changeGrams(idx, next)}
                        />

                        <div className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                          {money(Number(it.pricePerKg))} {currency}/kg
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-slate-900">
                        Quantity
                      </div>

                      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                        <QtyStepper
                          value={Number(it.quantity)}
                          onDecrease={() =>
                            changeQty(idx, Math.max(1, Number(it.quantity) - 1))
                          }
                          onIncrease={() =>
                            changeQty(idx, Number(it.quantity) + 1)
                          }
                        />

                        <div className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                          {money(Number(it.unitPrice))} {currency} each
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#fffaf5] px-3 py-3">
                    <div className="text-sm text-slate-600">Item total</div>
                    <div className="text-base font-bold text-slate-900">
                      {money(lineTotal)} {currency}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="lg:col-span-1">
            <Card className="rounded-3xl border-orange-100 p-4 shadow-sm sm:p-5 lg:sticky lg:top-6">
              <div className="text-lg font-semibold text-slate-900">
                Order summary
              </div>

              <Separator className="my-4" />

              <div className="flex items-center justify-between text-sm text-slate-600">
                <div>Items</div>
                <div>{items.length}</div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 text-sm text-slate-600">
                <div>Subtotal</div>
                <div className="text-right">
                  {money(totals.subtotal)} {currency}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 text-sm text-slate-600">
                <div>Service fee</div>
                <div className="text-right">
                  {money(totals.serviceFee)} {currency}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 text-sm text-slate-600">
                <div>Delivery fee</div>
                <div className="text-right">
                  {money(totals.deliveryFee)} {currency}
                </div>
              </div>

              <Separator className="my-4" />

              <div className="flex items-center justify-between gap-3 text-base">
                <div className="font-medium text-slate-900">Total</div>
                <div className="text-right text-xl font-extrabold text-slate-900">
                  {money(totals.total)}{" "}
                  <span className="text-base font-semibold">{currency}</span>
                </div>
              </div>

              {minimumOrder > 0 ? (
                <div className="mt-4 text-xs text-slate-500">
                  Minimum order: {money(minimumOrder)} {currency}
                </div>
              ) : null}

              {totals.belowMinimum ? (
                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Your subtotal is below the minimum order for this town.
                </div>
              ) : null}

              <div className="mt-5 grid gap-3">
                {totals.belowMinimum ? (
                  <Button
                    disabled
                    className="h-12 w-full rounded-2xl bg-slate-300 text-sm font-semibold text-white"
                  >
                    Checkout →
                  </Button>
                ) : (
                  <Link href={townSlug ? `/${townSlug}/checkout` : "/"}>
                    <Button className="h-12 w-full rounded-2xl bg-[#f97316] text-sm font-semibold text-white transition hover:bg-[#ea580c] active:scale-[0.98]">
                      Checkout →
                    </Button>
                  </Link>
                )}

                <Link href={townSlug ? `/${townSlug}` : "/"}>
                  <Button
                    variant="outline"
                    className="h-12 w-full rounded-2xl border-slate-200"
                  >
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