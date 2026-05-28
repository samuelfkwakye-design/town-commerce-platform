import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import StickyCategoryNav from "@/components/StickyCategoryNav";
import PopularToday from "@/components/PopularToday";
import { apiFetch } from "@/lib/api";
import type { CatalogResponse } from "@/lib/types";
import TrustSignals from "@/components/TrustSignals";
import DeliveryBar from "@/components/DeliveryBar";
import MobileCategoryDrawerWrapper from "./page.mobile-drawer";

function chipClass(active: boolean) {
  return active
    ? "inline-flex items-center rounded-full border border-[#0f172a] bg-[#0f172a] px-3 py-2 text-sm font-medium text-white sm:px-4"
    : "inline-flex items-center rounded-full border border-orange-100 bg-orange-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-orange-100 sm:px-4";
}

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
  return "🛒";
}
function getCategoryDescription(name: string, town: string) {
  const n = name.toLowerCase();

  if (n.includes("food")) {
    return `Fresh produce, grains and local meals from trusted sellers in ${town}.`;
  }

  if (n.includes("cloth")) {
    return `Local fashion, fabrics and everyday wear from ${town} traders.`;
  }

  if (n.includes("beverage") || n.includes("drink")) {
    return `Sobolo, soft drinks, water and refreshing local beverages in ${town}.`;
  }

  if (n.includes("elect")) {
    return `Household electricals and everyday appliances from ${town} vendors.`;
  }

  if (n.includes("provision")) {
    return `Everyday essentials and pantry items from nearby local shops.`;
  }

  if (n.includes("art") || n.includes("craft")) {
    return `Creative items, handmade goods and local craft products from ${town}.`;
  }

  return `Trusted local products and essentials available in ${town}.`;
}

export default async function TownCatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ townSlug: string }>;
  searchParams: Promise<{ search?: string; categorySlug?: string }>;
}) {
  const { townSlug } = await params;
  const sp = await searchParams;

  const search = (sp.search ?? "").trim();
  const categorySlug = sp.categorySlug ?? "";

  if (!townSlug) {
    return (
      <div className="py-8 sm:py-10">
        <h1 className="text-2xl font-bold sm:text-3xl">Market</h1>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          Missing town in URL. Try /harlow
        </p>
      </div>
    );
  }

  let data: CatalogResponse | any = null;
  let fetchError: string | null = null;
  let popularItems: any[] = [];

  try {
    data = await apiFetch<CatalogResponse>(
      `/catalog?townSlug=${encodeURIComponent(
        townSlug
      )}&search=${encodeURIComponent(search)}&categorySlug=${encodeURIComponent(
        categorySlug
      )}`
    );

    try {
      const popular = await apiFetch<any>(
        `/catalog/popular?townSlug=${encodeURIComponent(townSlug)}&limit=6`
      );
      popularItems = Array.isArray(popular?.items) ? popular.items : [];
    } catch {
      popularItems = [];
    }
  } catch (e: any) {
    fetchError = String(e?.message ?? e);
  }

  if (fetchError) {
    return (
      <div className="space-y-4 py-8 sm:py-10">
        <h1 className="text-2xl font-bold sm:text-3xl">Market</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <div className="font-semibold">Failed to load catalog</div>
          <div className="mt-1 break-words">{fetchError}</div>
          <div className="mt-3 text-xs text-red-800">
            Town: <span className="font-mono break-all">{townSlug}</span>
          </div>
          <div className="mt-1 text-xs text-red-800">
            Query:{" "}
            <span className="font-mono break-all">
              search={search || "''"} categorySlug={categorySlug || "''"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (!data?.town || !Array.isArray(data?.categories)) {
    return (
      <div className="space-y-4 py-8 sm:py-10">
        <h1 className="text-2xl font-bold sm:text-3xl">Market</h1>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="font-semibold">Unexpected catalog response shape</div>
          <div className="mt-1">
            The API responded, but it didn’t match the expected structure.
          </div>
        </div>
        <pre className="overflow-auto rounded-lg border bg-slate-50 p-4 text-xs">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  }

  const allCategories = (data.categories ?? [])
    .map((cat: any) => ({
      ...cat,
      products: (cat.products ?? []).filter((p: any) => p?.isActive !== false),
    }))
    .filter((cat: any) => cat.products.length > 0);

  const validSelectedCategory = categorySlug
    ? allCategories.find((cat: any) => cat.slug === categorySlug) ?? null
    : null;

  const visibleCategories = categorySlug
    ? validSelectedCategory
      ? [validSelectedCategory]
      : []
    : allCategories;

  const totalProducts = allCategories.reduce(
    (sum: number, cat: any) => sum + cat.products.length,
    0
  );

  const featuredCategories = allCategories.slice(0, 8);

  const searchResults = visibleCategories.flatMap((cat: any) =>
    (cat.products ?? []).map((p: any) => ({
      ...p,
      _categoryName: cat.name,
      _categorySlug: cat.slug,
    }))
  );

  const stickyNavCategories = allCategories
    .filter((cat: any) => cat.slug)
    .map((cat: any) => ({
      id: String(cat.id ?? cat.name),
      name: String(cat.name),
      slug: String(cat.slug),
    }));

  const drawerCategories = allCategories
    .filter((cat: any) => cat.slug)
    .map((cat: any) => ({
      id: String(cat.id ?? cat.name),
      name: String(cat.name),
      slug: String(cat.slug),
      productCount: Number(cat.products?.length ?? 0),
    }));

  const isSearchMode = !!search;

  return (
    <div className="min-h-screen space-y-5 bg-[#fffaf5] pt-3 sm:space-y-6 sm:pt-4">
      {/* <DeliveryBar /> */}

      <section className="-mx-4 hidden border-y border-orange-100 bg-[#fffaf5]/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 md:block">
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Link
            href={`/${townSlug}${search ? `?search=${encodeURIComponent(search)}` : ""}`}
            className={chipClass(!categorySlug)}
          >
            All
          </Link>

          {allCategories
            .filter((c: any) => c.slug)
            .map((c: any) => {
              const href = new URLSearchParams();
              if (search) href.set("search", search);
              href.set("categorySlug", c.slug);

              return (
                <Link
                  key={c.id ?? c.name}
                  href={`/${townSlug}?${href.toString()}`}
                  className={chipClass(categorySlug === c.slug)}
                >
                  <span className="max-w-[140px] truncate sm:max-w-none">
                    {c.name}
                  </span>
                  <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-xs">
                    {c.products.length}
                  </span>
                </Link>
              );
            })}
        </div>
      </section>

      {isSearchMode ? (
        <section className="space-y-4">
          <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
            <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 sm:text-sm">
                  Search Results
                </p>
                <h1 className="mt-1 break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Results for “{search}”
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  {searchResults.length} product
                  {searchResults.length === 1 ? "" : "s"} found
                  {categorySlug && validSelectedCategory
                    ? ` in ${validSelectedCategory.name}`
                    : ""}
                  .
                </p>
              </div>

              <div className="flex w-full sm:w-auto">
                <Link
                  href={`/${townSlug}`}
                  className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
                >
                  Back to market
                </Link>
              </div>
            </div>
          </div>

          {searchResults.length > 0 ? (
            <section className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 xl:grid-cols-6">
                {searchResults.map((p: any) => (
                  <ProductCard
                    key={`search-${p.townProductId}`}
                    townSlug={townSlug}
                    product={p}
                  />
                ))}
              </div>
            </section>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 sm:p-10 sm:text-base">
              No products matched your search.
            </div>
          )}
        </section>
      ) : (
        <>
          {validSelectedCategory ? (
            <section className="rounded-2xl border border-orange-100 bg-gradient-to-r from-orange-50 to-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex items-start gap-3 sm:items-center">
                    <span className="text-3xl">
                      {getCategoryEmoji(validSelectedCategory.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 sm:text-sm">
                        Category
                      </p>
                      <h1 className="break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                        {validSelectedCategory.name}
                      </h1>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-slate-600">
                    {validSelectedCategory.products.length} product
                    {validSelectedCategory.products.length === 1 ? "" : "s"}{" "}
                    available in this section.
                  </p>
                </div>

                <Link
                  href={`/${townSlug}`}
                  className="inline-flex w-full items-center justify-center rounded-xl border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-orange-50 sm:w-auto"
                >
                  Back to all categories
                </Link>
              </div>
            </section>
          ) : (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-[#0f172a] text-white shadow-sm sm:rounded-3xl">
              <div className="grid gap-6 bg-gradient-to-r from-[#0f172a] to-[#1e293b] p-4 sm:p-6 lg:grid-cols-[1.25fr_0.75fr] lg:p-8">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-200 sm:text-sm">
                    KOSTOMA
                  </p>

                  <h1 className="mt-2 break-words text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
                    {(data?.town?.name ?? townSlug) + " Market"}
                  </h1>

                  <p className="mt-4 max-w-2xl text-sm text-slate-200 sm:text-base md:text-lg">
                    Fresh groceries and essentials from local sellers, delivered
                    fast in your town.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2 sm:gap-3">
                    <div className="rounded-full bg-white/10 px-3 py-2 text-xs font-medium text-white sm:px-4 sm:text-sm">
                      {totalProducts} products
                    </div>
                    <div className="rounded-full bg-white/10 px-3 py-2 text-xs font-medium text-white sm:px-4 sm:text-sm">
                      {allCategories.length} categories
                    </div>
                    <div className="rounded-full bg-white/10 px-3 py-2 text-xs font-medium text-white sm:px-4 sm:text-sm">
                      Fast local delivery
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <Link
                      href={`/${townSlug}`}
                      className="inline-flex w-full items-center justify-center rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-600 sm:w-auto"
                    >
                      Shop all
                    </Link>

                    <div className="md:hidden">
                      <MobileCategoryDrawerWrapper
                        townSlug={townSlug}
                        search={search}
                        currentCategorySlug={categorySlug}
                        categories={drawerCategories}
                      />
                    </div>

                    {featuredCategories[0]?.slug ? (
                      <Link
                        href={`/${townSlug}?categorySlug=${encodeURIComponent(
                          featuredCategories[0].slug
                        )}`}
                        className="hidden rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100 md:inline-flex md:items-center md:justify-center"
                      >
                        Browse {featuredCategories[0].name}
                      </Link>
                    ) : null}

                    <Link
                      href={`/auth/login?redirect=${encodeURIComponent("/account/addresses")}`}
                      className="inline-flex w-full items-center justify-center rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15 sm:w-auto"
                    >
                      My Account
                    </Link>
                  </div>
                </div>

                <div className="hidden gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-2">
                  {featuredCategories.slice(0, 4).map((cat: any) => (
                    <Link
                      key={cat.id ?? cat.name}
                      href={`/${townSlug}?categorySlug=${encodeURIComponent(cat.slug ?? "")}`}
                      className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur transition hover:bg-white/15"
                    >
                      <div className="text-3xl">{getCategoryEmoji(cat.name)}</div>
                      <div className="mt-3 break-words text-base font-semibold text-white sm:text-lg">
                        {cat.name}
                      </div>
                      <div className="mt-1 text-sm text-slate-200">
                        {cat.products.length} items
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          {!categorySlug && popularItems.length > 0 ? (
            <PopularToday
              townSlug={townSlug}
              townLabel={data?.town?.name ?? townSlug}
              items={popularItems}
            />
          ) : null}

          {!validSelectedCategory ? (
            <section className="space-y-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  Browse categories
                </h2>
                <p className="text-sm text-slate-500">
                  Start with the section that matches what you need.
                </p>
              </div>

              <div className="hidden grid-cols-1 gap-4 sm:grid sm:grid-cols-2 xl:grid-cols-4">
                {featuredCategories.map((cat: any) => (
                  <Link
                    key={cat.id ?? cat.name}
                    href={`/${townSlug}?categorySlug=${encodeURIComponent(cat.slug ?? "")}`}
                    className="group rounded-2xl border border-orange-100 bg-gradient-to-b from-white to-orange-50/60 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:rounded-3xl sm:p-5"
                  >
                    <div className="flex items-start justify-between gap-3 sm:gap-4">
                      <div className="rounded-2xl bg-white p-3 text-3xl shadow-sm sm:text-4xl">
                        {getCategoryEmoji(cat.name)}
                      </div>
                      <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
                        {cat.products.length} items
                      </span>
                    </div>

                    <h3 className="mt-5 break-words text-lg font-semibold text-slate-900 group-hover:text-orange-600">
                      {cat.name}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {getCategoryDescription(cat.name, data?.town?.name ?? townSlug)}
                    </p>

                    <div className="mt-4 text-sm font-medium text-orange-600 group-hover:underline">
                      View products →
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}

      {categorySlug && !validSelectedCategory ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Category not found. Please choose another category.
        </div>
      ) : null}

      {!isSearchMode && !validSelectedCategory && stickyNavCategories.length > 0 ? (
        <StickyCategoryNav
          categories={stickyNavCategories}
          topClassName="top-[72px] sm:top-[76px]"
        />
      ) : null}

      {!isSearchMode && (
        <section className="space-y-5 sm:space-y-6">
          {visibleCategories.length > 0 ? (
            visibleCategories.map((cat: any) => (
              <section
                id={cat.slug ? `category-${cat.slug}` : undefined}
                key={cat.id ?? cat.name}
                className="scroll-mt-32 space-y-4 rounded-2xl border border-orange-100 bg-white p-4 shadow-sm sm:scroll-mt-36 sm:space-y-5 sm:rounded-3xl sm:p-5 md:p-6"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {getCategoryEmoji(cat.name)}
                      </span>
                      <h2 className="break-words text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                        {cat.name}
                      </h2>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {cat.products.length} product
                      {cat.products.length === 1 ? "" : "s"} available
                    </p>
                  </div>

                  {!categorySlug && cat.slug ? (
                    <Link
                      href={`/${townSlug}?categorySlug=${encodeURIComponent(cat.slug)}`}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      View only {cat.name} →
                    </Link>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 xl:grid-cols-6">
                  {cat.products.map((p: any) => (
                    <ProductCard
                      key={p.townProductId}
                      townSlug={townSlug}
                      product={p}
                    />
                  ))}
                </div>
              </section>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 sm:p-10 sm:text-base">
              No products found for this town or filter.
            </div>
          )}
        </section>
      )}

      <TrustSignals town={townSlug} />
    </div>
  );
}