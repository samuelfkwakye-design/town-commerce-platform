"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  addOrMergeCartItem,
  dispatchCartItemAdded,
  dispatchCartUpdated,
  loadCart,
  saveCart,
} from "@/lib/cart";
import type { CartItem } from "@/lib/types";

type ProductImage = {
  id?: string;
  url: string;
  alt?: string | null;
  sortOrder?: number;
};

type ProductVariant = {
  id: string;
  label?: string;
  name?: string;
  unitPrice?: number | string | null;
  price?: number | string | null;
  stockQty?: number | string | null;
  isActive?: boolean;
};

type ProductQuickViewProduct = {
  townProductId: string;
  name: string;
  description?: string | null;
  pricingModel: "UNIT" | "WEIGHT" | "VARIANT";
  pricePerUnit?: number | string | null;
  pricePerKg?: number | string | null;
  images?: ProductImage[];
  variants?: ProductVariant[];
};

type Props = {
  townSlug: string;
  product: ProductQuickViewProduct;
  onClose: () => void;
};

const FALLBACK_IMAGE =
  "https://placehold.co/800x800/f8fafc/94a3b8?text=No+Image";

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function formatMoney(value: unknown, currencySymbol = "GHS") {
  const n = toNumber(value);
  return `${currencySymbol} ${n.toFixed(2)}`;
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

function getSortedImages(images?: ProductImage[]) {
  if (!images?.length) return [];
  return [...images].sort(
    (a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999),
  );
}

export default function ProductQuickView({
  townSlug,
  product,
  onClose,
}: Props) {
  const [mounted, setMounted] = useState(false);

  const activeVariants = useMemo(
    () => (product.variants ?? []).filter((v) => v.isActive !== false),
    [product.variants],
  );

  const sortedImages = useMemo(
    () => getSortedImages(product.images),
    [product.images],
  );

  const [qty, setQty] = useState(1);
  const [grams, setGrams] = useState(getDefaultWeight(product.name));
  const [variantId, setVariantId] = useState(
    product.pricingModel === "VARIANT" && activeVariants.length === 1
      ? activeVariants[0].id
      : "",
  );
  const [added, setAdded] = useState(false);
  const [variantError, setVariantError] = useState("");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imgError, setImgError] = useState(false);

  const activeVariant = useMemo(() => {
    if (product.pricingModel !== "VARIANT") return null;
    return activeVariants.find((v) => v.id === variantId) ?? null;
  }, [product.pricingModel, activeVariants, variantId]);

  const activeImage = sortedImages[selectedImageIndex] ?? null;
  const imageSrc =
    !imgError && activeImage?.url ? activeImage.url : FALLBACK_IMAGE;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setImgError(false);
    setSelectedImageIndex(0);
    setQty(1);
    setGrams(getDefaultWeight(product.name));
    setAdded(false);
    setVariantError("");

    if (product.pricingModel === "VARIANT" && activeVariants.length === 1) {
      setVariantId(activeVariants[0].id);
    } else if (product.pricingModel !== "VARIANT") {
      setVariantId("");
    }
  }, [product.townProductId, product.name, product.pricingModel, activeVariants]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    if (!added) return;
    const t = window.setTimeout(() => setAdded(false), 1800);
    return () => window.clearTimeout(t);
  }, [added]);

  const priceLabel = useMemo(() => {
    if (product.pricingModel === "UNIT") {
      return product.pricePerUnit != null
        ? formatMoney(product.pricePerUnit)
        : "See details";
    }

    if (product.pricingModel === "WEIGHT") {
      return product.pricePerKg != null
        ? `${formatMoney(product.pricePerKg)} / kg`
        : "See details";
    }

    if (product.pricingModel === "VARIANT") {
      if (activeVariant?.unitPrice != null || activeVariant?.price != null) {
        return formatMoney(activeVariant?.unitPrice ?? activeVariant?.price);
      }

      const prices = activeVariants
        .map((v) => toNumber(v.unitPrice ?? v.price))
        .filter((n) => n > 0);

      if (prices.length > 0) {
        return `From ${formatMoney(Math.min(...prices))}`;
      }

      return "See options";
    }

    return "See details";
  }, [product, activeVariant, activeVariants]);

  function addToCart() {
    const cart = loadCart();

    if (product.pricingModel === "UNIT") {
      const quantity = Math.max(1, qty);

      const item: CartItem = {
        pricingModel: "UNIT",
        townProductId: product.townProductId,
        name: product.name,
        unitPrice: String(toNumber(product.pricePerUnit)),
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
      const weightGrams = Math.max(1, grams);

      const item: CartItem = {
        pricingModel: "WEIGHT",
        townProductId: product.townProductId,
        name: product.name,
        pricePerKg: String(toNumber(product.pricePerKg)),
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

    if (product.pricingModel === "VARIANT") {
      if (!variantId) {
        setVariantError("Please select an option before adding to cart.");
        return;
      }

      const variantLabel =
        activeVariant?.label ?? activeVariant?.name ?? "Variant";
      const quantity = Math.max(1, qty);

      const item: CartItem = {
        pricingModel: "VARIANT",
        townProductId: product.townProductId,
        townProductVariantId: variantId,
        name: product.name,
        variantLabel,
        unitPrice: String(
          toNumber(activeVariant?.unitPrice ?? activeVariant?.price),
        ),
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
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/70">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl"
          role="dialog"
          aria-modal="true"
        >
          <div className="grid max-h-[90vh] overflow-hidden md:grid-cols-2">
            <div className="border-b bg-slate-50 p-4 md:border-b-0 md:border-r">
              <div className="relative aspect-square overflow-hidden rounded-xl border bg-white">
                <Image
                  src={imageSrc}
                  alt={activeImage?.alt || product.name}
                  fill
                  className="object-contain p-4"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  onError={() => setImgError(true)}
                  priority
                />
              </div>

              {sortedImages.length > 1 ? (
                <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
                  {sortedImages.map((img, index) => {
                    const thumbSrc = img.url || FALLBACK_IMAGE;
                    const isActive = index === selectedImageIndex;

                    return (
                      <button
                        key={img.id || `${thumbSrc}-${index}`}
                        type="button"
                        onClick={() => {
                          setSelectedImageIndex(index);
                          setImgError(false);
                        }}
                        className={`relative aspect-square overflow-hidden rounded-lg border bg-white ${
                          isActive
                            ? "border-orange-400 ring-2 ring-orange-100"
                            : "border-slate-200"
                        }`}
                      >
                        <Image
                          src={thumbSrc}
                          alt={img.alt || `${product.name} ${index + 1}`}
                          fill
                          className="object-contain p-1"
                          sizes="120px"
                        />
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="max-h-[90vh] overflow-y-auto p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">
                    {product.name}
                  </h2>
                  {product.description ? (
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {product.description}
                    </p>
                  ) : null}
                </div>

                <button
                  onClick={onClose}
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-black"
                  type="button"
                  aria-label="Close quick view"
                >
                  ✕
                </button>
              </div>

              <div className="mb-5 text-2xl font-bold text-slate-900">
                {priceLabel}
              </div>

              {product.pricingModel === "VARIANT" ? (
                <div className="mb-5 space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Variant
                  </label>

                  <select
                    value={variantId}
                    onChange={(e) => {
                      setVariantId(e.target.value);
                      if (e.target.value) setVariantError("");
                    }}
                    className={[
                      "w-full rounded-xl border bg-white px-3 py-3 text-sm outline-none",
                      variantError
                        ? "border-red-400 ring-1 ring-red-200"
                        : "border-slate-200",
                    ].join(" ")}
                  >
                    <option value="">Select an option</option>

                    {activeVariants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label ?? v.name ?? "Variant"} —{" "}
                        {formatMoney(v.unitPrice ?? v.price)}
                      </option>
                    ))}
                  </select>

                  {variantError ? (
                    <div className="text-sm font-medium text-red-600">
                      {variantError}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {product.pricingModel === "WEIGHT" ? (
                <div className="mb-5 flex items-center gap-3">
                  <span className="text-sm text-slate-700">Weight (grams)</span>
                  <input
                    type="number"
                    min={1}
                    value={grams}
                    onChange={(e) =>
                      setGrams(Math.max(1, Number(e.target.value) || 1))
                    }
                    className="w-32 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              ) : (
                <div className="mb-5 flex items-center gap-3">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="rounded-lg border px-3 py-1.5"
                    type="button"
                  >
                    −
                  </button>

                  <span className="min-w-[2rem] text-center font-medium">
                    {qty}
                  </span>

                  <button
                    onClick={() => setQty((q) => q + 1)}
                    className="rounded-lg border px-3 py-1.5"
                    type="button"
                  >
                    +
                  </button>
                </div>
              )}

              <Button className="w-full" onClick={addToCart}>
                {added ? "Added ✓" : "Add to cart"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}