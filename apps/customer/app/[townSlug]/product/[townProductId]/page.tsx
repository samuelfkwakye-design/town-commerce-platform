import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { CatalogResponse } from "@/lib/types";
import ProductClient from "./product-client";

function sortImages(images: any[] | null | undefined) {
  const list = images ?? [];
  if (!list.length) return [];

  return list.slice().sort((a, b) => {
    const ao = a?.sortOrder ?? 0;
    const bo = b?.sortOrder ?? 0;
    if (ao !== bo) return ao - bo;

    // tie-breaker: newest createdAt first
    const at = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bt = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bt - at;
  });
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ townSlug: string; townProductId: string }>;
}) {
  const { townSlug, townProductId } = await params;

  const data = await apiFetch<CatalogResponse>(
    `/catalog?townSlug=${encodeURIComponent(townSlug)}&search=&categorySlug=`
  );

  const all = data.categories.flatMap((c: any) => c.products ?? []);
  const product = all.find((p: any) => p.townProductId === townProductId);

  if (!product) {
    return (
      <div className="pt-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold">Product not found</div>
          <p className="mt-2 text-sm text-slate-600">
            This item may have been removed or is not available in this market.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={`/${townSlug}`}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground transition hover:bg-primary/90 active:scale-[0.98]"
            >
              Back to market →
            </Link>

            <Link
              href={`/${townSlug}/cart`}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 transition hover:bg-slate-50 active:scale-[0.98]"
            >
              View cart
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const images = sortImages(product.images);
  const cover = images[0] ?? null;

  const coverUrl = cover?.url ?? null;
  const coverAlt = cover?.alt ?? product.name;

  return (
    <div className="pt-6">
      <ProductClient
        townSlug={townSlug}
        townId={data.town.id}
        product={product}
        images={images}
        coverUrl={coverUrl}
        coverAlt={coverAlt}
      />
    </div>
  );
}