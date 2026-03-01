import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { CatalogResponse } from "@/lib/types";

function pickCoverImage(images: any[] | null | undefined) {
  const list = images ?? [];
  if (!list.length) return null;

  // Choose by lowest sortOrder, then newest createdAt as tie-breaker
  return (
    list
      .slice()
      .sort((a, b) => {
        const ao = a?.sortOrder ?? 0;
        const bo = b?.sortOrder ?? 0;
        if (ao !== bo) return ao - bo;

        const at = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bt - at; // newest first
      })[0] ?? null
  );
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

  const search = sp.search ?? "";
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

  try {
    data = await apiFetch<CatalogResponse>(
      `/catalog?townSlug=${encodeURIComponent(
        townSlug
      )}&search=${encodeURIComponent(search)}&categorySlug=${encodeURIComponent(
        categorySlug
      )}`
    );
  } catch (e: any) {
    fetchError = String(e?.message ?? e);
  }

  if (fetchError) {
    return (
      <div className="py-10 space-y-4">
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
        <p className="text-slate-600">
          Check your customer <span className="font-mono">.env.local</span>{" "}
          API base URL and confirm the API server is running.
        </p>
      </div>
    );
  }

  if (!data?.town || !Array.isArray(data?.categories)) {
    return (
      <div className="py-10 space-y-4">
        <h1 className="text-3xl font-bold">Market</h1>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="font-semibold">Unexpected catalog response shape</div>
          <div className="mt-1">
            The API responded, but it didn’t match the expected structure.
          </div>
        </div>
        <pre className="rounded-lg border bg-slate-50 p-4 text-xs overflow-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className="pt-6">
      {/* Home Header / Hero */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-extrabold tracking-tight">
          {(data?.town?.name ?? townSlug) + " Market"}
        </h1>
        <p className="mt-1 text-slate-600">
          Browse groceries and everyday items. Quick delivery, simple checkout.
        </p>

        {search ? (
          <p className="mt-3 text-sm text-slate-500">
            Showing results for:{" "}
            <span className="font-semibold text-slate-800">{search}</span>
          </p>
        ) : null}
      </section>

      {/* Categories */}
      <div className="mt-6 flex flex-wrap gap-3 text-sm font-medium">
        <Link
          href={`/${townSlug}`}
          className="rounded-full bg-slate-100 px-4 py-2 hover:bg-slate-200"
        >
          All
        </Link>

        {data.categories
          .filter((c: any) => c.slug)
          .map((c: any) => (
            <Link
              key={c.id ?? c.name}
              href={`/${townSlug}?categorySlug=${encodeURIComponent(c.slug!)}`}
              className="rounded-full bg-slate-100 px-4 py-2 hover:bg-slate-200"
            >
              {c.name}
            </Link>
          ))}
      </div>

      {/* Products Grid */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data.categories.flatMap((cat: any) =>
          (cat.products ?? []).map((p: any) => {
            const cover = pickCoverImage(p.images);
            const coverUrl = cover?.url ?? null;
            const coverAlt = cover?.alt ?? p.name;

            return (
              <div
                key={p.townProductId}
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                {/* ✅ Product image */}
                <div className="mb-4 h-40 w-full overflow-hidden rounded-xl bg-muted">
                  {coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coverUrl}
                      alt={coverAlt}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-full w-full bg-gray-100" />
                  )}
                </div>

                <h2 className="text-xl font-semibold">{p.name}</h2>

                {p.description ? (
                  <p className="mt-1 text-sm text-slate-600">{p.description}</p>
                ) : null}

                <div className="mt-3 text-sm text-slate-500">
                  Pricing:{" "}
                  <span className="font-semibold text-slate-800">
                    {p.pricingModel}
                  </span>
                </div>

                <div className="mt-5">
                  <Link
                    href={`/${townSlug}/product/${p.townProductId}`}
                    className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground transition hover:bg-primary/90 active:scale-[0.98]"
                  >
                    View &amp; add to cart →
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}