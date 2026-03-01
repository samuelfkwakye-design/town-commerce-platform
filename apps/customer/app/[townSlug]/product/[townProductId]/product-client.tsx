"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CatalogResponse, CartItem } from "@/lib/types";
import { loadCart, saveCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

type Product = CatalogResponse["categories"][number]["products"][number];

type ProductImage = {
  id?: string;
  url: string;
  alt?: string | null;
  sortOrder?: number | null;
  createdAt?: string | Date | null;
};

export default function ProductClient({
  townSlug,
  townId,
  product,
  images,
  coverUrl,
  coverAlt,
}: {
  townSlug: string;
  townId: string;
  product: Product;
  images: ProductImage[];
  coverUrl: string | null;
  coverAlt: string;
}) {
  const [qty, setQty] = useState(1);
  const [grams, setGrams] = useState(500);
  const [variantId, setVariantId] = useState(product.variants?.[0]?.id ?? "");
  const [added, setAdded] = useState(false);

  // Gallery
  const hasImages = Array.isArray(images) && images.length > 0;
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Zoom + pan
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 }); // percent
  const isDraggingRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0, ox: 50, oy: 50 });

  useEffect(() => {
    // reset selection & zoom on navigation/product change
    setSelectedIndex(0);
    setZoomed(false);
    setOrigin({ x: 50, y: 50 });
  }, [product?.townProductId, images?.[0]?.url]);

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

  const selected = hasImages ? images[selectedIndex] : null;

  const variant = useMemo(
    () =>
      product.pricingModel === "VARIANT"
        ? product.variants.find((v) => v.id === variantId) ?? null
        : null,
    [product, variantId]
  );

  const priceLabel = useMemo(() => {
    if (product.pricingModel === "UNIT") {
      return `${product.pricePerUnit ?? "—"} GHS / unit`;
    }
    if (product.pricingModel === "WEIGHT") {
      return `${product.pricePerKg ?? "—"} GHS / kg`;
    }
    if (product.pricingModel === "VARIANT") {
      return `${variant?.unitPrice ?? "—"} GHS`;
    }
    return "—";
  }, [product, variant]);

  function addToCart() {
    setAdded(false);
    const cart = loadCart();

    let item: CartItem;

    if (product.pricingModel === "UNIT") {
      item = {
        pricingModel: "UNIT",
        townProductId: product.townProductId,
        name: product.name,
        unitPrice: product.pricePerUnit ?? "0",
        quantity: Math.max(1, Number(qty || 1)),
      };
    } else if (product.pricingModel === "WEIGHT") {
      item = {
        pricingModel: "WEIGHT",
        townProductId: product.townProductId,
        name: product.name,
        pricePerKg: product.pricePerKg ?? "0",
        weightGrams: Math.max(1, Number(grams || 1)),
      };
    } else {
      if (!variantId) {
        window.alert("Please select a variant");
        return;
      }
      item = {
        pricingModel: "VARIANT",
        townProductId: product.townProductId,
        townProductVariantId: variantId,
        name: product.name,
        variantLabel: variant?.label ?? "Variant",
        unitPrice: variant?.unitPrice ?? "0",
        quantity: Math.max(1, Number(qty || 1)),
      };
    }

    cart.push(item);
    saveCart(cart);
    setAdded(true);
  }

  const mainSrc = selected?.url ?? coverUrl ?? null;
  const mainAlt = selected?.alt ?? coverAlt;

  return (
    <div className="pt-6">
      {/* Top links */}
      <div className="flex items-center justify-between">
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

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        {/* Left: gallery + description */}
        <div className="space-y-4">
          {/* Main image (aspect-square) with zoom/pan */}
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-muted">
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

                  // translate drag pixels into % shift (tuned for feel)
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mainSrc}
                  alt={mainAlt}
                  className={[
                    "h-full w-full object-cover transition-transform duration-200 select-none",
                    zoomed ? "scale-150" : "scale-100",
                  ].join(" ")}
                  style={{ transformOrigin: `${origin.x}% ${origin.y}%` }}
                  draggable={false}
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gray-100 text-sm text-slate-500">
                No image available
              </div>
            )}

            {/* Zoom button */}
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

            {/* Helper text */}
            {zoomed ? (
              <div className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                Drag to pan • Esc to reset
              </div>
            ) : null}
          </div>

          {/* Thumbnails */}
          {hasImages && images.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
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
                      "h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-white transition",
                      active
                        ? "border-primary ring-2 ring-primary"
                        : "border-slate-200 opacity-80 hover:opacity-100 hover:border-slate-300",
                    ].join(" ")}
                    aria-label={`Select image ${idx + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
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

          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              {product.name}
            </h1>
            {product.description ? (
              <p className="mt-2 text-sm text-slate-600">{product.description}</p>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                No description available.
              </p>
            )}
          </div>

          <div className="text-sm text-slate-500">
            Pricing model:{" "}
            <span className="font-semibold text-slate-800">
              {product.pricingModel}
            </span>
          </div>
        </div>

        {/* Right: purchase panel */}
        <div>
          <Card className="rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold">Buy</div>
                <div className="mt-1 text-sm text-slate-600">{priceLabel}</div>
              </div>

              {added ? (
                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                  Added to cart
                </span>
              ) : null}
            </div>

            <Separator className="my-4" />

            {/* Controls by pricing model */}
            {product.pricingModel === "VARIANT" ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Variant
                  </label>
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
                </div>

                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium text-slate-700">
                    Quantity
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value))}
                    className="w-32"
                  />
                </div>
              </div>
            ) : null}

            {product.pricingModel === "UNIT" ? (
              <div className="space-y-4">
                <div className="text-sm text-slate-600">
                  Price per unit:{" "}
                  <span className="font-semibold text-slate-900">
                    {product.pricePerUnit ?? "—"} GHS
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium text-slate-700">
                    Quantity
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value))}
                    className="w-32"
                  />
                </div>
              </div>
            ) : null}

            {product.pricingModel === "WEIGHT" ? (
              <div className="space-y-4">
                <div className="text-sm text-slate-600">
                  Price per kg:{" "}
                  <span className="font-semibold text-slate-900">
                    {product.pricePerKg ?? "—"} GHS
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium text-slate-700">
                    Weight (grams)
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={grams}
                    onChange={(e) => setGrams(Number(e.target.value))}
                    className="w-40"
                  />
                </div>

                <div className="text-xs text-slate-500">Tip: 1000g = 1kg</div>
              </div>
            ) : null}

            <Separator className="my-5" />

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={addToCart}
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
              Your items are saved locally in your browser cart.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}