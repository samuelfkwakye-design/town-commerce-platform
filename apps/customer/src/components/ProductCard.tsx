"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

type ProductImage = {
  id?: string;
  url: string;
  alt?: string | null;
  sortOrder?: number;
};

type ProductVariant = {
  id: string;
  name: string;
  price?: number | string | null;
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

const FALLBACK_IMAGE = "https://placehold.co/600x600?text=No+Image";

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function formatMoney(value: unknown, currencySymbol = "£"): string {
  const num = toNumber(value);
  return `${currencySymbol}${num.toFixed(2)}`;
}

function getPrimaryImage(images?: ProductImage[]): ProductImage | null {
  if (!images?.length) return null;
  const sorted = [...images].sort(
    (a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999)
  );
  return sorted[0] ?? null;
}

function getLowestVariantPrice(variants?: ProductVariant[]): number | null {
  if (!variants?.length) return null;

  const activeVariants = variants.filter((v) => v.isActive !== false);
  if (!activeVariants.length) return null;

  const prices = activeVariants
    .map((v) => toNumber(v.price))
    .filter((p) => p > 0);

  if (!prices.length) return null;
  return Math.min(...prices);
}

function getVariantCount(variants?: ProductVariant[]): number {
  if (!variants?.length) return 0;
  return variants.filter((v) => v.isActive !== false).length;
}

function hasStock(product: ProductCardItem): boolean {
  if (product.pricingModel === "UNIT") {
    return toNumber(product.stockQty) > 0;
  }

  if (product.pricingModel === "WEIGHT") {
    return toNumber(product.stockWeightGrams) > 0;
  }

  if (product.pricingModel === "VARIANT") {
    return (
      product.variants?.some(
        (v) => v.isActive !== false && toNumber(v.stockQty) > 0
      ) ?? false
    );
  }

  return false;
}

function getPriceLabel(
  product: ProductCardItem,
  currencySymbol = "£"
): string {
  if (product.pricingModel === "UNIT") {
    return formatMoney(product.pricePerUnit, currencySymbol);
  }

  if (product.pricingModel === "WEIGHT") {
    return `${formatMoney(product.pricePerKg, currencySymbol)} / kg`;
  }

  if (product.pricingModel === "VARIANT") {
    const lowest = getLowestVariantPrice(product.variants);
    return lowest !== null
      ? `From ${formatMoney(lowest, currencySymbol)}`
      : "See options";
  }

  return "See details";
}

function getStockLabel(product: ProductCardItem): string {
  if (product.pricingModel === "UNIT") {
    const qty = toNumber(product.stockQty);
    if (qty <= 0) return "Currently unavailable";
    if (qty <= 5) return `Only ${qty} left`;
    return "In stock";
  }

  if (product.pricingModel === "WEIGHT") {
    const grams = toNumber(product.stockWeightGrams);
    if (grams <= 0) return "Currently unavailable";
    if (grams < 2000) return "Low stock";
    return "In stock";
  }

  if (product.pricingModel === "VARIANT") {
    const anyInStock =
      product.variants?.some(
        (v) => v.isActive !== false && toNumber(v.stockQty) > 0
      ) ?? false;

    if (!anyInStock) return "Currently unavailable";
    return "Options available";
  }

  return "";
}

export default function ProductCard({
  townSlug,
  product,
  onAddToCart,
  currencySymbol = "£",
}: ProductCardProps) {
  const [imgError, setImgError] = useState(false);

  const primaryImage = useMemo(
    () => getPrimaryImage(product.images),
    [product.images]
  );

  const imageSrc =
    !imgError && primaryImage?.url ? primaryImage.url : FALLBACK_IMAGE;

  const priceLabel = getPriceLabel(product, currencySymbol);
  const stockLabel = getStockLabel(product);
  const available = product.isActive !== false && hasStock(product);
  const variantCount = getVariantCount(product.variants);

  const href = `/${townSlug}/product/${product.townProductId}`;

  return (
    <div className="group h-full rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <Link href={href} className="block">
        <div className="relative aspect-square overflow-hidden rounded-t-2xl bg-slate-50">
          <Image
            src={imageSrc}
            alt={primaryImage?.alt || product.name}
            fill
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            onError={() => setImgError(true)}
          />

          {!available && (
            <div className="absolute left-3 top-3 rounded-full bg-slate-900/85 px-3 py-1 text-xs font-medium text-white">
              Unavailable
            </div>
          )}

          {product.pricingModel === "VARIANT" && variantCount > 0 && (
            <div className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-slate-800 shadow">
              {variantCount} option{variantCount > 1 ? "s" : ""}
            </div>
          )}
        </div>
      </Link>

      <div className="flex h-[230px] flex-col p-4">
        <Link href={href} className="block">
          <h3 className="line-clamp-2 min-h-[3.5rem] text-[15px] font-semibold leading-6 text-slate-900 transition group-hover:text-orange-700">
            {product.name}
          </h3>
        </Link>

        {product.description ? (
          <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-slate-500">
            {product.description}
          </p>
        ) : (
          <div className="mt-1 min-h-[2.5rem]" />
        )}

        <div className="mt-3">
          <div className="text-2xl font-bold tracking-tight text-slate-900">
            {priceLabel}
          </div>

          {product.pricingModel === "WEIGHT" && (
            <div className="mt-1 text-xs text-slate-500">
              Fresh produce sold by weight
            </div>
          )}

          {product.pricingModel === "VARIANT" && (
            <div className="mt-1 text-xs text-slate-500">
              Choose size or pack on product page
            </div>
          )}
        </div>

        <div className="mt-3 text-sm">
          <span
            className={
              available
                ? "font-medium text-emerald-700"
                : "font-medium text-slate-500"
            }
          >
            {stockLabel}
          </span>
        </div>

        <div className="mt-auto flex gap-2 pt-4">
          <Link
            href={href}
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            View product
          </Link>

          <button
            type="button"
            onClick={() => onAddToCart?.(product)}
            disabled={!available}
            className="inline-flex flex-1 items-center justify-center rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Add to cart
          </button>
        </div>
      </div>
    </div>
  );
}
