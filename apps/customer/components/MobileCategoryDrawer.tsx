"use client";

import Link from "next/link";
import { useEffect } from "react";
import { X, Menu } from "lucide-react";

type CategoryItem = {
  id: string;
  name: string;
  slug?: string;
  productCount?: number;
};

type Props = {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  townSlug: string;
  search?: string;
  currentCategorySlug?: string;
  categories: CategoryItem[];
};

function getCategoryEmoji(name: string) {
  const n = name.toLowerCase();

  if (n.includes("vegetable")) return "🥬";
  if (n.includes("fruit")) return "🍎";
  if (n.includes("rice")) return "🍚";
  if (n.includes("grain")) return "🌾";
  if (n.includes("drink")) return "🥤";
  if (n.includes("beverage")) return "🥤";
  if (n.includes("snack")) return "🍪";
  if (n.includes("meat")) return "🥩";
  if (n.includes("fish")) return "🐟";
  if (n.includes("bread")) return "🍞";
  if (n.includes("food")) return "🍽️";
  if (n.includes("cloth")) return "👕";
  if (n.includes("electrical")) return "🔌";
  if (n.includes("appliance")) return "🔌";
  if (n.includes("provision")) return "📦";
  if (n.includes("art")) return "🎨";
  return "🛒";
}

export default function MobileCategoryDrawer({
  open,
  onOpen,
  onClose,
  townSlug,
  search = "",
  currentCategorySlug = "",
  categories,
}: Props) {
  useEffect(() => {
    if (!open) return;

    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  const allHref = `/${townSlug}${search ? `?search=${encodeURIComponent(search)}` : ""}`;

  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm hover:bg-orange-50 md:hidden"
      >
        <Menu className="h-4 w-4" />
        Browse categories
      </button>

      {open ? (
        <div className="fixed inset-0 z-[70] md:hidden">
          <button
            type="button"
            aria-label="Close category drawer"
            onClick={onClose}
            className="absolute inset-0 bg-black/45"
          />

          <div className="absolute left-0 top-0 h-full w-[88vw] max-w-sm overflow-y-auto bg-white shadow-2xl">
            <div className="sticky top-0 z-10 border-b border-orange-100 bg-white px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-500">
                    KOSTOMA
                  </div>
                  <div className="mt-1 text-lg font-bold text-slate-900">
                    All categories
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-4">
              <div className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                Shop by section
              </div>

              <div className="grid gap-2">
                <Link
                  href={allHref}
                  onClick={onClose}
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3 transition ${
                    !currentCategorySlug
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-orange-100 bg-white text-slate-900 hover:bg-orange-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🛍️</span>
                    <span className="font-medium">All products</span>
                  </div>
                </Link>

                {categories.map((category) => {
                  const hrefParams = new URLSearchParams();
                  if (search) hrefParams.set("search", search);
                  if (category.slug) hrefParams.set("categorySlug", category.slug);

                  const href = `/${townSlug}?${hrefParams.toString()}`;
                  const active = currentCategorySlug === category.slug;

                  return (
                    <Link
                      key={category.id}
                      href={href}
                      onClick={onClose}
                      className={`flex items-center justify-between rounded-2xl border px-4 py-3 transition ${
                        active
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-orange-100 bg-white text-slate-900 hover:bg-orange-50"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="text-lg">{getCategoryEmoji(category.name)}</span>
                        <span className="truncate font-medium">{category.name}</span>
                      </div>

                      {typeof category.productCount === "number" ? (
                        <span
                          className={`ml-3 shrink-0 rounded-full px-2 py-0.5 text-xs ${
                            active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {category.productCount}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
