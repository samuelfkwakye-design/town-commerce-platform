"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CartItem } from "@/lib/types";
import {
  addOrMergeCartItem,
  dispatchCartItemAdded,
  dispatchCartUpdated,
  loadCart,
  saveCart,
} from "@/lib/cart";
import ProductQuickView from "@/components/product/ProductQuickView";

type ProductImage = {
  id?: string;
  url: string;
  alt?: string | null;
  sortOrder?: number;
};

type ProductVariant = {
  id: string;
  name?: string;
  label?: string;
  price?: number | string | null;
  unitPrice?: number | string | null;
  stockQty?: number | string | null;
  isActive?: boolean;
};

export type ProductCardItem = {
  townProductId: string;
  productId?: string;
  slug?: string;
  name: string;
  description?: string | null;
  pricingModel: "UNIT" | "WEIGHT" | "VARIANT";
  pricePerUnit?: number | string | null;
  pricePerKg?: number | string | null;
  stockQty?: number | string | null;
  stockWeightGrams?: number | string | null;
  isActive?: boolean;
  images?: ProductImage[];
  variants?: ProductVariant[];
};

type ProductCardProps = {
  townSlug: string;
  product: ProductCardItem;
  onAddToCart?: (product: ProductCardItem) => void;
  currencySymbol?: string;
};

const FALLBACK_IMAGE =
  "https://placehold.co/600x600/f8fafc/94a3b8?text=No+Image";

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function formatMoney(value: unknown, currencySymbol = "GHS"): string {
  const num = toNumber(value);
  return `${currencySymbol} ${num.toFixed(2)}`;
}

function toDisplayName(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function getPrimaryImage(images?: ProductImage[]): ProductImage | null {
  if (!images?.length) return null;

  const sorted = [...images].sort(
    (a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999)
  );

  return sorted[0] ?? null;
}

function getVariantPrice(v: ProductVariant): number {
  if (v.price != null) return toNumber(v.price);
  if (v.unitPrice != null) return toNumber(v.unitPrice);
  return 0;
}

function getLowestVariantPrice(variants?: ProductVariant[]): number | null {
  if (!variants?.length) return null;

  const prices = variants
    .filter((v) => v.isActive !== false)
    .map((v) => getVariantPrice(v))
    .filter((p) => p > 0);

  if (!prices.length) return null;
  return Math.min(...prices);
}

function getVariantCount(variants?: ProductVariant[]): number {
  if (!variants?.length) return 0;
  return variants.filter((v) => v.isActive !== false).length;
}

function getAvailability(product: ProductCardItem): {
  available: boolean;
  label: string;
  urgency?: string | null;
} {
  if (product.isActive === false) {
    return { available: false, label: "Unavailable", urgency: null };
  }

  if (product.pricingModel === "UNIT") {
    if (product.stockQty == null) {
      return { available: true, label: "Available", urgency: null };
    }

    const qty = toNumber(product.stockQty);
    if (qty <= 0) {
      return { available: false, label: "Unavailable", urgency: null };
    }
    if (qty <= 5) {
      return {
        available: true,
        label: "In stock",
        urgency: `Only ${qty} left`,
      };
    }
    return { available: true, label: "In stock", urgency: null };
  }

  if (product.pricingModel === "WEIGHT") {
    if (product.stockWeightGrams == null) {
      return { available: true, label: "Available", urgency: null };
    }

    const grams = toNumber(product.stockWeightGrams);
    if (grams <= 0) {
      return { available: false, label: "Unavailable", urgency: null };
    }
    if (grams < 2000) {
      return {
        available: true,
        label: "Available",
        urgency: "Low stock",
      };
    }
    return { available: true, label: "Available", urgency: null };
  }

  if (product.pricingModel === "VARIANT") {
    if (!product.variants?.length) {
      return { available: true, label: "See options", urgency: null };
    }

    const variantsWithKnownStock = product.variants.filter(
      (v) => v.stockQty != null && v.isActive !== false
    );

    if (!variantsWithKnownStock.length) {
      return { available: true, label: "Options available", urgency: null };
    }

    const anyInStock = variantsWithKnownStock.some(
      (v) => toNumber(v.stockQty) > 0
    );

    if (!anyInStock) {
      return { available: false, label: "Unavailable", urgency: null };
    }

    return { available: true, label: "Options available", urgency: null };
  }

  return { available: true, label: "Available", urgency: null };
}

function getPriceLabel(
  product: ProductCardItem,
  currencySymbol = "GHS"
): string {
  if (product.pricingModel === "UNIT") {
    if (product.pricePerUnit != null) {
      return formatMoney(product.pricePerUnit, currencySymbol);
    }
    return "See details";
  }

  if (product.pricingModel === "WEIGHT") {
    if (product.pricePerKg != null) {
      return `${formatMoney(product.pricePerKg, currencySymbol)} / kg`;
    }
    return "See details";
  }

  if (product.pricingModel === "VARIANT") {
    const lowest = getLowestVariantPrice(product.variants);
    return lowest !== null
      ? `From ${formatMoney(lowest, currencySymbol)}`
      : "See options";
  }

  return "See details";
}

function getDefaultWeight(productName: string) {
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

  return 500;
}

export default function ProductCard({
  townSlug,
  product,
  onAddToCart,
  currencySymbol = "GHS",
}: ProductCardProps) {
  const [imgError, setImgError] = useState(false);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [quickView, setQuickView] = useState(false);

  const primaryImage = useMemo(
    () => getPrimaryImage(product.images),
    [product.images]
  );

  const imageSrc =
    !imgError && primaryImage?.url ? primaryImage.url : FALLBACK_IMAGE;

  const priceLabel = getPriceLabel(product, currencySymbol);
  const variantCount = getVariantCount(product.variants);
  const availability = getAvailability(product);
  const href = `/${townSlug}/product/${product.townProductId}`;

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 2200);
    return () => clearTimeout(t);
  }, [added]);

  function quickAdd() {
    if (!availability.available) return;

    if (onAddToCart) {
      onAddToCart(product);
      setAdded(true);
      return;
    }

    const cart = loadCart();

    if (product.pricingModel === "UNIT") {
      const quantity = Math.max(1, qty);

      const item = {
        pricingModel: "UNIT",
        townProductId: product.townProductId,
        name: product.name,
        unitPrice: String(toNumber(product.pricePerUnit)),
        quantity,
      } satisfies CartItem;

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
      const weightGrams = getDefaultWeight(product.name);

      const item = {
        pricingModel: "WEIGHT",
        townProductId: product.townProductId,
        name: product.name,
        pricePerKg: String(toNumber(product.pricePerKg)),
        weightGrams,
      } satisfies CartItem;

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

    if (product.pricingModel === "VARIANT") {
      const activeVariant =
        product.variants?.find((v) => v.isActive !== false) ?? null;

      if (!activeVariant) return;

      const variantLabel = activeVariant.label ?? activeVariant.name ?? "Variant";

      const item = {
        pricingModel: "VARIANT",
        townProductId: product.townProductId,
        townProductVariantId: activeVariant.id,
        name: product.name,
        variantLabel,
        unitPrice: String(
          toNumber(activeVariant.unitPrice ?? activeVariant.price)
        ),
        quantity: 1,
      } satisfies CartItem;

      const nextCart = addOrMergeCartItem(cart, item);
      saveCart(nextCart);
      dispatchCartUpdated();
      dispatchCartItemAdded({
        townSlug,
        townProductId: product.townProductId,
        name: product.name,
        pricingModel: "VARIANT",
        quantity: 1,
        variantLabel,
      });
      setAdded(true);
    }
  }

  return (
    <>
      <div className="group relative flex h-full min-h-[100%] flex-col overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
        {added ? (
          <div className="absolute right-2 top-2 z-20 rounded-full bg-green-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow sm:right-3 sm:top-3 sm:px-3">
            Added ✓
          </div>
        ) : null}

        <Link href={href} className="block">
          <div className="p-2 pb-0 sm:p-2.5 sm:pb-0">
            <div className="relative rounded-2xl border border-orange-100 bg-gradient-to-b from-orange-50/80 via-amber-50/30 to-white p-2.5 sm:p-3">
              <div className="relative aspect-square overflow-hidden rounded-xl bg-white">
                <Image
                  src={imageSrc}
                  alt={primaryImage?.alt || product.name}
                  fill
                  className="object-contain p-2 transition duration-300 group-hover:scale-[1.03] sm:p-3"
                  sizes="(max-width: 640px) 45vw, (max-width: 1024px) 33vw, 20vw"
                  onError={() => setImgError(true)}
                />
              </div>

              {!availability.available && (
                <div className="absolute left-2 top-2 rounded-full bg-slate-900 px-2 py-1 text-[10px] font-medium text-white shadow-sm sm:left-3 sm:top-3 sm:px-2.5 sm:text-[11px]">
                  Unavailable
                </div>
              )}

              {product.pricingModel === "VARIANT" && variantCount > 0 && (
                <div className="absolute right-2 top-2 max-w-[65%] truncate rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 shadow-sm sm:right-3 sm:top-3 sm:px-2.5 sm:text-[11px]">
                  {variantCount} option{variantCount > 1 ? "s" : ""}
                </div>
              )}
            </div>
          </div>
        </Link>

        <div className="flex flex-1 flex-col px-3 pb-3 pt-2.5 sm:px-3.5 sm:pb-3.5">
          <div className="flex min-h-[7.75rem] flex-col sm:min-h-[8.25rem]">
            <Link href={href} className="block">
              <h3 className="line-clamp-2 min-h-[2.75rem] text-sm font-semibold leading-5 text-slate-900 transition group-hover:text-orange-600 sm:min-h-[3rem] sm:text-[17px] sm:leading-6">
                {toDisplayName(product.name)}
              </h3>
            </Link>

            {product.description ? (
              <p className="mt-1 line-clamp-2 min-h-[2.25rem] text-xs leading-4 text-slate-500 sm:min-h-[34px] sm:text-[13px] sm:leading-5">
                {product.description}
              </p>
            ) : (
              <div className="mt-1 min-h-[2.25rem] sm:min-h-[34px]" />
            )}

            <div className="mt-2 space-y-1">
              <div className="min-h-[2rem] break-words text-lg font-bold tracking-tight text-slate-900 sm:min-h-[2.25rem] sm:text-[1.35rem]">
                {priceLabel}
              </div>

              <div className="text-xs font-medium text-slate-500 sm:text-[13px]">
                {availability.label}
              </div>

              <div className="min-h-[1rem] text-[11px] font-medium text-orange-600">
                {availability.urgency ?? ""}
              </div>
            </div>
          </div>

          <div className="mt-auto space-y-2 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <Link
                href={href}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 sm:text-[13px]"
              >
                View
              </Link>

              <button
                type="button"
                onClick={() => setQuickView(true)}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 sm:text-[13px]"
              >
                Quick view
              </button>
            </div>

            <div className="h-11">
              {product.pricingModel === "UNIT" ? (
                <div className="flex h-11 w-full items-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <button
                    type="button"
                    aria-label={`Decrease quantity of ${product.name}`}
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="flex h-full w-11 shrink-0 items-center justify-center text-base font-semibold text-slate-700 transition active:bg-slate-100"
                  >
                    −
                  </button>

                  <div className="flex flex-1 items-center justify-center border-x border-slate-200 px-2 text-sm font-semibold text-slate-900">
                    {qty}
                  </div>

                  <button
                    type="button"
                    aria-label={`Increase quantity of ${product.name}`}
                    onClick={() => setQty((q) => q + 1)}
                    className="flex h-full w-11 shrink-0 items-center justify-center text-base font-semibold text-slate-700 transition active:bg-slate-100"
                  >
                    +
                  </button>
                </div>
              ) : product.pricingModel === "WEIGHT" ? (
                <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-500 sm:text-[13px]">
                  Quick add {getDefaultWeight(product.name)}g
                </div>
              ) : (
                <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-500 sm:text-[13px]">
                  Select options
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
              <button
                type="button"
                onClick={quickAdd}
                disabled={!availability.available}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-orange-500 px-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Add
              </button>

              {added ? (
                <Link
                  href={`/${townSlug}/cart`}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 px-3 text-sm font-medium text-orange-700 hover:bg-orange-100"
                >
                  Cart
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {quickView && (
        <ProductQuickView
          townSlug={townSlug}
          product={product}
          onClose={() => setQuickView(false)}
        />
      )}
    </>
  );
}