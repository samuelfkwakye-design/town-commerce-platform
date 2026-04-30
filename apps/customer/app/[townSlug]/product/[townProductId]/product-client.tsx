"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CatalogResponse, CartItem } from "@/lib/types";
import {
  addOrMergeCartItem,
  dispatchCartItemAdded,
  dispatchCartUpdated,
  loadCart,
  saveCart,
} from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import ProductCard from "@/components/ProductCard";
import { trackProductView } from "@/lib/recentlyViewed";
import RecentlyViewed from "@/components/RecentlyViewed";

type Product = CatalogResponse["categories"][number]["products"][number];

type ProductImage = {
  id?: string;
  url: string;
  alt?: string | null;
  sortOrder?: number | null;
  createdAt?: string | Date | null;
};

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function formatMoney(value: unknown, currency = "GHS") {
  const n = toNumber(value);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return `${n} ${currency}`;
}

function toDisplayName(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function QtyStepper({
  value,
  onChange,
  min = 1,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
}) {
  return (
    <div className="flex w-full items-center overflow-hidden rounded-xl border border-slate-200 bg-white sm:w-auto">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex h-10 w-10 items-center justify-center text-lg text-slate-700 hover:bg-slate-100"
        aria-label="Decrease quantity"
      >
        −
      </button>

      <div className="flex-1 px-3 text-center text-sm font-semibold text-slate-900 sm:min-w-[3rem] sm:flex-none">
        {value}
      </div>

      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="flex h-10 w-10 items-center justify-center text-lg text-slate-700 hover:bg-slate-100"
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}

function getSuggestedWeight(productName: string) {
  const name = productName.toLowerCase();

  if (
    name.includes("rice") ||
    name.includes("flour") ||
    name.includes("sugar") ||
    name.includes("gari") ||
    name.includes("beans")
  ) {
    return 1000;
  }

  if (
    name.includes("pepper") ||
    name.includes("tomato") ||
    name.includes("onion") ||
    name.includes("ginger")
  ) {
    return 500;
  }

  return 500;
}

export default function ProductClient({
  townSlug,
  townId,
  product,
  images,
  coverUrl,
  coverAlt,
  relatedProducts,
  allProducts,
}: {
  townSlug: string;
  townId: string;
  product: Product;
  images: ProductImage[];
  coverUrl: string | null;
  coverAlt: string;
  relatedProducts: Product[];
  allProducts: Product[];
}) {
  useEffect(() => {
    if (townSlug && product?.townProductId) {
      trackProductView(townSlug, product.townProductId);
    }
  }, [townSlug, product]);

  const [qty, setQty] = useState(1);
  const [grams, setGrams] = useState(getSuggestedWeight(product.name));
  const [variantId, setVariantId] = useState(product.variants?.[0]?.id ?? "");
  const [added, setAdded] = useState(false);

  const hasImages = Array.isArray(images) && images.length > 0;
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const isDraggingRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0, ox: 50, oy: 50 });

  useEffect(() => {
    setSelectedIndex(0);
    setZoomed(false);
    setOrigin({ x: 50, y: 50 });
    setVariantId(product.variants?.[0]?.id ?? "");
    setAdded(false);
    setQty(1);
    setGrams(getSuggestedWeight(product.name));
  }, [product?.townProductId, images?.[0]?.url, product?.variants, product?.name]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setZoomed(false);
        setOrigin({ x: 50, y: 50 });
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 2200);
    return () => clearTimeout(t);
  }, [added]);

  const selected = hasImages ? images[selectedIndex] : null;

  const variant = useMemo(
    () =>
      product.pricingModel === "VARIANT"
        ? product.variants.find((v) => v.id === variantId) ?? null
        : null,
    [product, variantId]
  );

  const variantCount = product.variants?.length ?? 0;

  const priceLabel = useMemo(() => {
    if (product.pricingModel === "UNIT") {
      return `${formatMoney(product.pricePerUnit)}`;
    }

    if (product.pricingModel === "WEIGHT") {
      return `${formatMoney(product.pricePerKg)} / kg`;
    }

    if (product.pricingModel === "VARIANT") {
      if (variant?.unitPrice != null) {
        return formatMoney(variant.unitPrice);
      }

      const prices = (product.variants ?? [])
        .map((v) => toNumber(v.unitPrice))
        .filter((n) => n > 0);

      if (prices.length > 0) {
        return `From ${Math.min(...prices)} GHS`;
      }

      return "See options";
    }

    return "—";
  }, [product, variant]);

  const pricingNote = useMemo(() => {
    if (product.pricingModel === "UNIT") {
      return "Sold per unit";
    }
    if (product.pricingModel === "WEIGHT") {
      return "Sold by weight";
    }
    if (product.pricingModel === "VARIANT") {
      return variantCount > 0
        ? `${variantCount} option${variantCount === 1 ? "" : "s"} available`
        : "Options will appear here when added";
    }
    return "";
  }, [product, variantCount]);

  function addToCart() {
    setAdded(false);
    const cart = loadCart();

    let item: CartItem;

    if (product.pricingModel === "UNIT") {
      const quantity = Math.max(1, Number(qty || 1));

      item = {
        pricingModel: "UNIT",
        townProductId: product.townProductId,
        name: product.name,
        unitPrice: String(product.pricePerUnit ?? "0"),
        quantity,
      };

      const nextCart = addOrMergeCartItem(cart, item);
      saveCart(nextCart);
      dispatchCartUpdated();
      dispatchCartItemAdded({
        townSlug,
        townProductId: product.townProductId,
        name: product.name,
        pricingModel: "UNIT",
        quantity,
      });
      setAdded(true);
      return;
    }

    if (product.pricingModel === "WEIGHT") {
      const weightGrams = Math.max(1, Number(grams || 1));

      item = {
        pricingModel: "WEIGHT",
        townProductId: product.townProductId,
        name: product.name,
        pricePerKg: String(product.pricePerKg ?? "0"),
        weightGrams,
      };

      const nextCart = addOrMergeCartItem(cart, item);
      saveCart(nextCart);
      dispatchCartUpdated();
      dispatchCartItemAdded({
        townSlug,
        townProductId: product.townProductId,
        name: product.name,
        pricingModel: "WEIGHT",
        weightGrams,
      });
      setAdded(true);
      return;
    }

    if (!variantId) {
      window.alert("Please select a variant");
      return;
    }

    const quantity = Math.max(1, Number(qty || 1));
    const variantLabel = variant?.label ?? "Variant";

    item = {
      pricingModel: "VARIANT",
      townProductId: product.townProductId,
      townProductVariantId: variantId,
      name: product.name,
      variantLabel,
      unitPrice: String(variant?.unitPrice ?? "0"),
      quantity,
    };

    const nextCart = addOrMergeCartItem(cart, item);
    saveCart(nextCart);
    dispatchCartUpdated();
    dispatchCartItemAdded({
      townSlug,
      townProductId: product.townProductId,
      name: product.name,
      pricingModel: "VARIANT",
      quantity,
      variantLabel,
    });
    setAdded(true);
  }

  const mainSrc = selected?.url || coverUrl || null;
  const mainAlt = selected?.alt ?? coverAlt;

  return (
    <div className="pb-28 pt-4 sm:pt-6 lg:pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/${townSlug}`}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          ← Back to market
        </Link>

        <Link
          href={`/${townSlug}/cart`}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          Cart
        </Link>
      </div>

      <div className="mt-4 grid gap-5 sm:mt-5 sm:gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm sm:rounded-3xl">
            <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-b from-orange-50/60 to-white sm:aspect-[4/3]">
              {mainSrc ? (
                <div
                  className={[
                    "h-full w-full",
                    zoomed ? "cursor-zoom-out" : "cursor-zoom-in",
                  ].join(" ")}
                  onClick={() => setZoomed((z) => !z)}
                  onPointerDown={(e) => {
                    if (!zoomed) return;
                    isDraggingRef.current = true;
                    (e.currentTarget as HTMLDivElement).setPointerCapture(
                      e.pointerId
                    );
                    startRef.current = {
                      x: e.clientX,
                      y: e.clientY,
                      ox: origin.x,
                      oy: origin.y,
                    };
                  }}
                  onPointerMove={(e) => {
                    if (!zoomed || !isDraggingRef.current) return;

                    const dx = e.clientX - startRef.current.x;
                    const dy = e.clientY - startRef.current.y;

                    const nextX = Math.max(
                      0,
                      Math.min(100, startRef.current.ox - dx * 0.08)
                    );
                    const nextY = Math.max(
                      0,
                      Math.min(100, startRef.current.oy - dy * 0.08)
                    );

                    setOrigin({ x: nextX, y: nextY });
                  }}
                  onPointerUp={() => {
                    isDraggingRef.current = false;
                  }}
                  onPointerCancel={() => {
                    isDraggingRef.current = false;
                  }}
                >
                  <img
                    src={mainSrc}
                    alt={mainAlt}
                    className={[
                      "h-full w-full select-none object-contain bg-white/80 p-3 transition-transform duration-200 sm:p-4",
                      zoomed ? "scale-150" : "scale-100",
                    ].join(" ")}
                    style={{ transformOrigin: `${origin.x}% ${origin.y}%` }}
                    draggable={false}
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-100 px-4 text-center text-sm text-slate-500">
                  No image available
                </div>
              )}

              {mainSrc ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomed((z) => !z);
                  }}
                  className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-800 shadow-sm hover:bg-white"
                  aria-label={zoomed ? "Zoom out" : "Zoom in"}
                >
                  {zoomed ? "Zoom out" : "Zoom"}
                </button>
              ) : null}

              {zoomed ? (
                <div className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-[11px] text-white sm:text-xs">
                  Drag to pan • Esc to reset
                </div>
              ) : null}
            </div>
          </div>

          {hasImages && images.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto pb-1 sm:gap-3">
              {images.map((img, idx) => {
                const active = idx === selectedIndex;

                return (
                  <button
                    key={img.id ?? img.url ?? idx}
                    type="button"
                    onClick={() => {
                      setSelectedIndex(idx);
                      setZoomed(false);
                      setOrigin({ x: 50, y: 50 });
                    }}
                    className={[
                      "h-14 w-14 shrink-0 overflow-hidden rounded-xl border bg-white transition sm:h-16 sm:w-16 sm:rounded-2xl",
                      active
                        ? "border-primary ring-2 ring-primary"
                        : "border-slate-200 opacity-80 hover:border-slate-300 hover:opacity-100",
                    ].join(" ")}
                    aria-label={`Select image ${idx + 1}`}
                  >
                    <img
                      src={img.url}
                      alt={img.alt ?? `Thumbnail ${idx + 1}`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl border-orange-100 p-4 shadow-sm sm:rounded-3xl sm:p-5">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                  {product.pricingModel}
                </span>
                {pricingNote ? (
                  <span className="rounded-full bg-orange-50 px-3 py-1 text-orange-700">
                    {pricingNote}
                  </span>
                ) : null}
              </div>

              <h1 className="break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {toDisplayName(product.name)}
              </h1>

              {product.description ? (
                <p className="text-sm leading-6 text-slate-600">
                  {product.description}
                </p>
              ) : null}
            </div>
          </Card>

          <Card className="rounded-2xl border-orange-100 p-4 shadow-sm sm:rounded-3xl sm:p-5 lg:sticky lg:top-6">
            <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
              <div className="min-w-0">
                <div className="text-sm font-medium uppercase tracking-wide text-slate-500">
                  Price
                </div>
                <div className="mt-1 break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  {priceLabel}
                </div>
              </div>

              {added ? (
                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                  Added
                </span>
              ) : null}
            </div>

            <Separator className="my-4" />

            {product.pricingModel === "VARIANT" ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Variant
                  </label>

                  {product.variants.length > 0 ? (
                    <select
                      value={variantId}
                      onChange={(e) => setVariantId(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                    >
                      {product.variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.label} — {v.unitPrice} GHS
                          {v.packWeightGrams ? ` (${v.packWeightGrams}g)` : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="mt-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-500">
                      No variants have been added yet.
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <label className="text-sm font-medium text-slate-700">
                    Quantity
                  </label>
                  <QtyStepper value={qty} onChange={setQty} />
                </div>
              </div>
            ) : null}

            {product.pricingModel === "UNIT" ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <label className="text-sm font-medium text-slate-700">
                    Quantity
                  </label>
                  <QtyStepper value={qty} onChange={setQty} />
                </div>
              </div>
            ) : null}

            {product.pricingModel === "WEIGHT" ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <label className="text-sm font-medium text-slate-700">
                    Weight (grams)
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={grams}
                    onChange={(e) => setGrams(Number(e.target.value))}
                    className="w-full sm:w-32"
                  />
                </div>

                <div className="text-xs text-slate-500">Tip: 1000g = 1kg</div>
              </div>
            ) : null}

            <Separator className="my-4" />

            <div className="flex flex-col gap-2.5">
              <Button
                onClick={addToCart}
                disabled={
                  product.pricingModel === "VARIANT" &&
                  product.variants.length === 0
                }
                className="w-full transition hover:bg-primary/90 active:scale-[0.98]"
              >
                Add to cart
              </Button>

              <Link href={`/${townSlug}/cart`} className="w-full">
                <Button
                  variant="outline"
                  className="w-full transition active:scale-[0.98]"
                >
                  Go to cart
                </Button>
              </Link>
            </div>

            <div className="mt-3 text-xs text-slate-500">
              Saved in your browser cart.
            </div>
          </Card>
        </div>
      </div>

      {relatedProducts.length > 0 ? (
        <section className="mt-8 space-y-4 sm:mt-10">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">
              Customers also buy
            </h2>
            <p className="text-sm text-slate-500">
              More items from this category.
            </p>
          </div>

          <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 xl:grid-cols-6">
              {relatedProducts.map((p) => (
                <ProductCard
                  key={p.townProductId}
                  townSlug={townSlug}
                  product={p as any}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <RecentlyViewed townSlug={townSlug} products={allProducts as any} />

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-orange-100 bg-white/95 p-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900">
              {toDisplayName(product.name)}
            </div>
            <div className="text-sm text-slate-600">{priceLabel}</div>
          </div>

          <Button
            onClick={addToCart}
            disabled={
              product.pricingModel === "VARIANT" && product.variants.length === 0
            }
            className="shrink-0"
          >
            Add to cart
          </Button>
        </div>
      </div>
    </div>
  );
}