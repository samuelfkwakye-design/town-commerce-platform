import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { CatalogResponse } from "@/lib/types";
import ProductClient from "./product-client";

function sortImages(images: any[] | null | undefined) {
  if (!Array.isArray(images)) return [];

  return images
    .slice()
    .sort((a, b) => {
      const ao = a?.sortOrder ?? 999;
      const bo = b?.sortOrder ?? 999;

      if (ao !== bo) return ao - bo;

      const at = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bt = b?.createdAt ? new Date(b.createdAt).getTime() : 0;

      return bt - at;
    })
    .filter((img) => img?.url);
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ townSlug: string; townProductId: string }>;
}) {
  const { townSlug, townProductId } = await params;

  const data = await apiFetch<CatalogResponse>(
    `/catalog?townSlug=${encodeURIComponent(
      townSlug
    )}&search=&categorySlug=`
  );

  const allCategories = data?.categories ?? [];
  const allProducts = allCategories.flatMap((c: any) => c.products ?? []);

  const product = allProducts.find(
    (p: any) => p.townProductId === townProductId
  );

  if (!product) {
    return (
      <div className="pt-4 sm:pt-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="text-base font-semibold sm:text-lg">
            Product not found
          </div>

          <p className="mt-2 text-sm text-slate-600">
            This item may have been removed or is not available in this market.
          </p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={`/${townSlug}`}
              className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground transition hover:bg-primary/90 active:scale-[0.98] sm:w-auto"
            >
              Back to market →
            </Link>

            <Link
              href={`/${townSlug}/cart`}
              className="inline-flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 transition hover:bg-slate-50 active:scale-[0.98] sm:w-auto"
            >
              View cart
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const parentCategory =
    allCategories.find((c: any) =>
      (c.products ?? []).some((p: any) => p.townProductId === townProductId)
    ) ?? null;

  const fallbackRelatedProducts = (parentCategory?.products ?? [])
    .filter(
      (p: any) =>
        p.townProductId !== townProductId && p?.isActive !== false
    )
    .slice(0, 6);

  let relatedProducts = fallbackRelatedProducts;

  try {
    const alsoBought = await apiFetch<any>(
      `/catalog/also-bought?townSlug=${encodeURIComponent(
        townSlug
      )}&townProductId=${encodeURIComponent(townProductId)}&limit=6`
    );

    if (Array.isArray(alsoBought?.items) && alsoBought.items.length > 0) {
      relatedProducts = alsoBought.items;
    }
  } catch {
    relatedProducts = fallbackRelatedProducts;
  }

  const images = sortImages(product.images);

  const cover = images.length > 0 ? images[0] : null;
  const coverUrl = cover?.url ?? null;
  const coverAlt = cover?.alt ?? product.name ?? "Product";

  return (
    <div className="pt-4 sm:pt-6">
      <ProductClient
        townSlug={townSlug}
        townId={data?.town?.id}
        product={product}
        images={images}
        coverUrl={coverUrl}
        coverAlt={coverAlt}
        relatedProducts={relatedProducts}
        allProducts={allProducts}
      />
    </div>
  );
}