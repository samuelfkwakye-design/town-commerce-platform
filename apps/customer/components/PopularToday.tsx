import Link from "next/link";

function getRatingMeta(count: number) {
  if (count >= 30) return { rating: "4.9", ordersLabel: `${count} orders` };
  if (count >= 20) return { rating: "4.8", ordersLabel: `${count} orders` };
  if (count >= 10) return { rating: "4.7", ordersLabel: `${count} orders` };
  if (count >= 5) return { rating: "4.6", ordersLabel: `${count} orders` };
  if (count >= 2) return { rating: "4.5", ordersLabel: `${count} orders` };
  if (count === 1) return { rating: "4.5", ordersLabel: `1 order` };

  return { rating: "New", ordersLabel: "Be the first to order" };
}

function getPriceLabel(product: any) {
  if (product.pricingModel === "WEIGHT") {
    return product.pricePerKg
      ? `GHS ${Number(product.pricePerKg).toFixed(2)} / kg`
      : "Price on request";
  }

  if (product.pricingModel === "VARIANT") {
    const numericPrices = (product.variants ?? [])
      .map((variant: any) => Number(variant.unitPrice))
      .filter((value: number) => Number.isFinite(value));

    const minPrice =
      numericPrices.length > 0 ? Math.min(...numericPrices) : null;

    return minPrice !== null
      ? `From GHS ${minPrice.toFixed(2)}`
      : "See options";
  }

  return product.pricePerUnit
    ? `GHS ${Number(product.pricePerUnit).toFixed(2)}`
    : "Price on request";
}

function getImageUrl(product: any) {
  const first = Array.isArray(product.images) ? product.images[0] : null;
  return first?.url ?? null;
}

export default function PopularToday({
  townSlug,
  townLabel,
  items,
}: {
  townSlug: string;
  townLabel: string;
  items: any[];
}) {
  if (!items?.length) return null;

  return (
    <section className="mt-8 space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Popular in {townLabel} today
        </h2>
        <p className="text-sm text-slate-500">
          Top items customers are ordering right now.
        </p>
      </div>

      <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
          {items.map((product) => {
            const meta = getRatingMeta(Number(product.popularityCount ?? 0));
            const imageUrl = getImageUrl(product);

            return (
              <Link
                key={product.townProductId}
                href={`/${townSlug}/product/${product.townProductId}`}
                className="group rounded-2xl border border-slate-200 bg-white p-3 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="aspect-square overflow-hidden rounded-xl bg-slate-100">
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl}
                      alt={product.name ?? "Product"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                      No image
                    </div>
                  )}
                </div>

                <div className="mt-3">
                  <div className="line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-orange-600">
                    {product.name}
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    {meta.rating === "New" ? (
  <span className="text-xs text-green-600 font-medium">
    New product
  </span>
) : (
  <span className="text-xs text-slate-500">
    ⭐ {meta.rating} · {meta.ordersLabel}
  </span>
)}
                  </div>

                  <div className="mt-2 text-sm font-medium text-slate-900">
                    {getPriceLabel(product)}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
