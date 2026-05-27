import ProductCard from "../../../components/ProductCard";
type Catalog = {
  town: { id: string; name: string; slug: string };
  categories: Array<{
    id: string | null;
    name: string;
    slug: string | null;
    products: Array<{
      townProductId: string;
      productId?: string;
      slug?: string;
      name: string;
      description: string | null;
      pricingModel: "UNIT" | "WEIGHT" | "VARIANT";
      pricePerUnit?: number | string | null;
      pricePerKg?: number | string | null;
      stockQty?: number | string | null;
      stockWeightGrams?: number | string | null;
      isActive?: boolean;
      images: Array<{
        url: string;
        alt: string | null;
        sortOrder: number;
      }>;
      variants?: Array<{
        id: string;
        name: string;
        price?: number | string | null;
        stockQty?: number | string | null;
        isActive?: boolean;
      }>;
    }>;
  }>;
};

export default async function Page() {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!base) throw new Error("Missing NEXT_PUBLIC_API_BASE_URL");

  const res = await fetch(`${base}/catalog?townSlug=harlow`, {
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Catalog fetch failed: ${res.status}`);

  const data = (await res.json()) as Catalog;

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-medium text-orange-600">KOSTOMA</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Catalog Test — {data.town.name}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Dev preview for Amazon-style marketplace cards using live catalog
            data.
          </p>
        </div>

        <div className="space-y-10">
          {data.categories.map((category) => (
            <section key={category.id ?? "uncat"} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  {category.name}
                </h2>
                <span className="text-sm text-slate-500">
                  {category.products.length} product
                  {category.products.length === 1 ? "" : "s"}
                </span>
              </div>

              {category.products.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
                  {category.products.map((product) => (
                    <ProductCard
                      key={product.townProductId}
                      townSlug={data.town.slug}
                      product={product}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500">
                  No products in this category.
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}