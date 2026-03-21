
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import StickyCategoryNav from "@/components/StickyCategoryNav";
import PopularToday from "@/components/PopularToday";
import { apiFetch } from "@/lib/api";
import type { CatalogResponse } from "@/lib/types";
import TrustSignals from "@/components/TrustSignals";
import DeliveryBar from "@/components/DeliveryBar";
function chipClass(active: boolean) {
  return active
    ? "inline-flex items-center rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-medium text-white"
    : "inline-flex items-center rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-orange-50";
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
      <div className="py-10">
        <h1 className="text-3xl font-bold">Market</h1>
        <p className="mt-2 text-slate-600">Missing town in URL. Try /harlow</p>
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
      <div className="space-y-4 py-10">
        <h1 className="text-3xl font-bold">Market</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <div className="font-semibold">Failed to load catalog</div>
          <div className="mt-1">{fetchError}</div>
          <div className="mt-3 text-xs text-red-800">
            Town: <span className="font-mono">{townSlug}</span>
          </div>
          <div className="mt-1 text-xs text-red-800">
            Query:{" "}
            <span className="font-mono">
              search={search || "''"} categorySlug={categorySlug || "''"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (!data?.town || !Array.isArray(data?.categories)) {
    return (
      <div className="space-y-4 py-10">
        <h1 className="text-3xl font-bold">Market</h1>
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

  const isSearchMode = !!search;

  return (
    <div className="space-y-6 pt-4">
      <DeliveryBar />
      <section className="-mx-6 border-y border-orange-100 bg-[#fffaf5]/95 px-6 py-3 backdrop-blur">
        <div className="flex flex-wrap gap-3">
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
                  <span>{c.name}</span>
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
          <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
                  Search Results
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                  Results for “{search}”
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  {searchResults.length} product{searchResults.length === 1 ? "" : "s"} found
                  {categorySlug && validSelectedCategory
                    ? ` in ${validSelectedCategory.name}`
                    : ""}
                  .
                </p>
              </div>

              <div className="flex gap-2">
                <Link
                  href={`/${townSlug}`}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Back to market
                </Link>
              </div>
            </div>
          </div>

          {searchResults.length > 0 ? (
            <section className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
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
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
              No products matched your search.
            </div>
          )}
        </section>
      ) : (
        <>
          {validSelectedCategory ? (
            <section className="rounded-3xl border border-orange-100 bg-gradient-to-r from-orange-50 to-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{getCategoryEmoji(validSelectedCategory.name)}</span>
                    <div>
                      <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
                        Category
                      </p>
                      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                        {validSelectedCategory.name}
                      </h1>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-slate-600">
                    {validSelectedCategory.products.length} product
                    {validSelectedCategory.products.length === 1 ? "" : "s"} available in this section.
                  </p>
                </div>

                <Link
                  href={`/${townSlug}`}
                  className="inline-flex items-center justify-center rounded-xl border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-orange-50"
                >
                  Back to all categories
                </Link>
              </div>
            </section>
          ) : (
            <section className="overflow-hidden rounded-3xl border border-orange-200 bg-gradient-to-r from-orange-500 via-orange-400 to-amber-300 text-white shadow-sm">
              <div className="grid gap-6 p-6 lg:grid-cols-[1.25fr_0.75fr] lg:p-8">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">
                    Town Commerce
                  </p>

                  <h1 className="mt-2 text-4xl font-extrabold tracking-tight md:text-5xl">
                    {(data?.town?.name ?? townSlug) + " Market"}
                  </h1>

                  <p className="mt-4 max-w-2xl text-base text-white/90 md:text-lg">
                    Fresh groceries and essentials from local sellers, delivered fast
                    in your town.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <div className="rounded-full bg-white/20 px-4 py-2 text-sm font-medium">
                      {totalProducts} products
                    </div>
                    <div className="rounded-full bg-white/20 px-4 py-2 text-sm font-medium">
                      {allCategories.length} categories
                    </div>
                    <div className="rounded-full bg-white/20 px-4 py-2 text-sm font-medium">
                      Fast local delivery
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
  <Link
    href={`/${townSlug}`}
    className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-black"
  >
    Shop all
  </Link>

  {featuredCategories[0]?.slug ? (
    <Link
      href={`/${townSlug}?categorySlug=${encodeURIComponent(
        featuredCategories[0].slug
      )}`}
      className="rounded-full border border-white/40 bg-white/15 px-5 py-3 text-sm font-semibold text-white hover:bg-white/20"
    >
      Browse {featuredCategories[0].name}
    </Link>
  ) : null}

  <Link
  href={`/auth/login?redirect=${encodeURIComponent("/account/addresses")}`}
  className="rounded-full border border-white/40 bg-white/15 px-5 py-3 text-sm font-semibold text-white hover:bg-white/20"
>
  My Account
</Link>
</div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-2">
                  {featuredCategories.slice(0, 4).map((cat: any) => (
                    <Link
                      key={cat.id ?? cat.name}
                      href={`/${townSlug}?categorySlug=${encodeURIComponent(cat.slug ?? "")}`}
                      className="rounded-2xl border border-white/20 bg-white/15 p-4 backdrop-blur transition hover:bg-white/20"
                    >
                      <div className="text-3xl">{getCategoryEmoji(cat.name)}</div>
                      <div className="mt-3 text-lg font-semibold text-white">
                        {cat.name}
                      </div>
                      <div className="mt-1 text-sm text-white/80">
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
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Browse categories
                </h2>
                <p className="text-sm text-slate-500">
                  Start with the section that matches what you need.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {featuredCategories.map((cat: any) => (
                  <Link
                    key={cat.id ?? cat.name}
                    href={`/${townSlug}?categorySlug=${encodeURIComponent(cat.slug ?? "")}`}
                    className="group rounded-3xl border border-orange-100 bg-gradient-to-b from-white to-orange-50/60 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="rounded-2xl bg-white p-3 text-4xl shadow-sm">
                        {getCategoryEmoji(cat.name)}
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
                        {cat.products.length} items
                      </span>
                    </div>

                    <h3 className="mt-5 text-lg font-semibold text-slate-900 group-hover:text-orange-600">
                      {cat.name}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Explore {cat.name.toLowerCase()} available in{" "}
                      {data?.town?.name ?? townSlug}.
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
        <StickyCategoryNav categories={stickyNavCategories} topClassName="top-[76px]" />
      ) : null}

      {!isSearchMode && (
        <section className="space-y-6">
          {visibleCategories.length > 0 ? (
            visibleCategories.map((cat: any) => (
              <section
                id={cat.slug ? `category-${cat.slug}` : undefined}
                key={cat.id ?? cat.name}
                className="scroll-mt-36 space-y-5 rounded-3xl border border-orange-100 bg-white p-5 shadow-sm md:p-6"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getCategoryEmoji(cat.name)}</span>
                      <h2 className="text-2xl font-bold tracking-tight text-slate-900">
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

                <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
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
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
              No products found for this town or filter.
            </div>
          )}
        </section>
      )}

      <TrustSignals town={townSlug} />
    </div>
  );
}