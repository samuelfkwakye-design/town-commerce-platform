"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { clearCart, loadCart } from "@/lib/cart";
import type { CartItem, CatalogResponse, CreateOrderPayload } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

function money(n: number) {
  return n.toFixed(2);
}

export default function CheckoutPage() {
  const params = useParams<{ townSlug: string }>();
  const townSlug = params?.townSlug;

  const [townId, setTownId] = useState<string>("");
  const [items, setItems] = useState<CartItem[]>([]);
  const [phone, setPhone] = useState("0240000000");
  const [method, setMethod] = useState<"COD" | "MOMO">("COD");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setItems(loadCart());
  }, []);

  useEffect(() => {
    if (!townSlug) return;

    (async () => {
      try {
        setErr(null);
        const data = await apiFetch<CatalogResponse>(
          `/catalog?townSlug=${encodeURIComponent(townSlug)}&search=&categorySlug=`
        );
        setTownId(data.town.id);
      } catch (e: any) {
        setTownId("");
        setErr(e?.message ?? "Failed to load town");
      }
    })();
  }, [townSlug]);

  const totals = useMemo(() => {
    let total = 0;

    for (const it of items) {
      if (it.pricingModel === "UNIT") total += Number(it.unitPrice) * it.quantity;
      else if (it.pricingModel === "WEIGHT")
        total += (Number(it.pricePerKg) * it.weightGrams) / 1000;
      else total += Number(it.unitPrice) * it.quantity;
    }

    return { total };
  }, [items]);

  async function placeOrder() {
    setErr(null);

    if (!townSlug) {
      setErr("Missing town slug in URL. Go back to the market and retry.");
      return;
    }

    if (!townId) {
      setErr("TownId not loaded yet. Refresh and try again.");
      return;
    }

    if (!phone.trim()) {
      setErr("Phone number is required");
      return;
    }

    if (items.length === 0) {
      setErr("Cart is empty");
      return;
    }

    const payload: CreateOrderPayload = {
      townId,
      customerPhone: phone.trim(),
      goodsPaymentMethod: method,
      items: items.map((it) => {
        if (it.pricingModel === "UNIT") {
          return { townProductId: it.townProductId, quantity: it.quantity };
        }
        if (it.pricingModel === "WEIGHT") {
          return { townProductId: it.townProductId, weightGrams: it.weightGrams };
        }
        return {
          townProductId: it.townProductId,
          townProductVariantId: it.townProductVariantId,
          quantity: it.quantity,
        };
      }),
    };

    setLoading(true);
    try {
      const order = await apiFetch<any>(`/orders`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      clearCart();
      window.location.href = `/${townSlug}/order/${order.id}`;
    } catch (e: any) {
      setErr(e?.message ?? "Failed to create order");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pt-6">
      {/* Top row links */}
      <div className="flex items-center justify-between">
        <Link
          href={townSlug ? `/${townSlug}/cart` : "/"}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          ← Back to cart
        </Link>

        <Link
          href={townSlug ? `/${townSlug}` : "/"}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          Market
        </Link>
      </div>

      <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Checkout</h1>

      {err ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {err}
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Contact */}
          <Card className="rounded-2xl p-5">
            <div className="text-lg font-semibold">Contact</div>
            <Separator className="my-4" />
            <label className="text-sm font-medium text-slate-700">Phone</label>
            <div className="mt-2 max-w-sm">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Use a number the rider can reach you on.
            </div>
          </Card>

          {/* Payment */}
          <Card className="rounded-2xl p-5">
            <div className="text-lg font-semibold">Payment method (goods)</div>
            <Separator className="my-4" />

            <label className="text-sm font-medium text-slate-700">
              Choose payment method
            </label>

            <div className="mt-2 max-w-sm">
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
              >
                <option value="COD">COD (pay on delivery)</option>
                <option value="MOMO">MOMO (pay on delivery)</option>
              </select>
            </div>

            <div className="mt-3 text-xs text-slate-500">
              Current ops model: driver delivers first, then collects payment.
            </div>
          </Card>
        </div>

        {/* Right summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6 rounded-2xl p-5">
            <div className="text-lg font-semibold">Summary</div>
            <Separator className="my-4" />

            <div className="flex items-center justify-between text-sm text-slate-600">
              <div>Items</div>
              <div>{items.length}</div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="text-sm font-medium text-slate-700">Total</div>
              <div className="text-xl font-extrabold">
                {money(totals.total)}{" "}
                <span className="text-base font-semibold">GHS</span>
              </div>
            </div>

            <Button
              onClick={placeOrder}
              disabled={loading}
              className="mt-5 w-full transition hover:bg-primary/90 active:scale-[0.98]"
            >
              {loading ? "Placing order…" : "Place order"}
            </Button>

            <div className="mt-3 text-xs text-slate-500">
              You’ll see your order confirmation immediately after placing the order.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}