import TownShell from "@/components/TownShell";
import { apiFetch } from "@/lib/api";
import type {
  CatalogResponse,
  SearchableCategory,
  SearchableProduct,
} from "@/lib/types";

export default async function TownLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ townSlug: string }>;
}) {
  const { townSlug } = await params;

  let searchableCategories: SearchableCategory[] = [];
  let searchableProducts: SearchableProduct[] = [];

  try {
    const data = await apiFetch<CatalogResponse>(
      `/catalog?townSlug=${encodeURIComponent(townSlug)}&search=&categorySlug=`
    );

    const categories = Array.isArray(data?.categories) ? data.categories : [];

    searchableCategories = categories
      .filter((category) => category?.slug)
      .map((category) => ({
        id: String(category.id ?? category.name),
        name: String(category.name ?? ""),
        slug: String(category.slug ?? ""),
      }));

    searchableProducts = categories.flatMap((category) =>
      (category.products ?? []).map((product) => {
        let priceLabel = "";

        if (product.pricingModel === "WEIGHT") {
          priceLabel = product.pricePerKg
            ? `GHS ${Number(product.pricePerKg).toFixed(2)} / kg`
            : "Price on request";
        } else if (product.pricingModel === "VARIANT") {
          const numericPrices = (product.variants ?? [])
            .map((variant) => Number(variant.unitPrice))
            .filter((value) => Number.isFinite(value));

          const minPrice =
            numericPrices.length > 0 ? Math.min(...numericPrices) : null;

          priceLabel =
            minPrice !== null
              ? `From GHS ${minPrice.toFixed(2)}`
              : "See options";
        } else {
          priceLabel = product.pricePerUnit
            ? `GHS ${Number(product.pricePerUnit).toFixed(2)}`
            : "Price on request";
        }

        return {
          id: product.townProductId,
          name: product.name,
          categorySlug: category.slug,
          categoryName: category.name,
          imageUrl: null,
          pricingModel: product.pricingModel,
          priceLabel,
        };
      })
    );
  } catch {
    searchableCategories = [];
    searchableProducts = [];
  }

  return (
    <TownShell
      townSlug={townSlug}
      categories={searchableCategories}
      products={searchableProducts}
    >
      {children}
    </TownShell>
  );
}