import Link from "next/link";
import { apiFetch } from "@/lib/api";

export const dynamic = "force-dynamic";

type SearchParams = {
  townId?: string;
  search?: string;
  missingImages?: string;
  categoryId?: string;
  cursor?: string;
};

type TownOption = { id: string; name: string; slug: string };
type TownsResp = { rows: TownOption[] };

type CategoryOption = {
  id: string;
  name: string;
  slug: string;
  productCount?: number;
};

type CategoriesResp = {
  rows: CategoryOption[];
};

type Row = {
  id: string;
  townId: string;
  townName: string | null;
  townSlug: string | null;
  productName: string | null;
  pricingModel: string;
  stockQty: number | null;
  stockWeightGrams: number | null;
  imagesCount: number;
  primaryImageUrl: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
};

type Resp = {
  filters: {
    townId: string | null;
    search: string | null;
    missingImages: boolean;
    categoryId?: string | null;
  };
  rows: Row[];
  pageInfo: { limit: number; hasNextPage: boolean; nextCursor: string | null };
};

export default async function TownProductsPage(props: {
  searchParams?: Promise<SearchParams>;
}) {
  const sp = (await props.searchParams) ?? {};
  const townId = sp.townId ?? "";
  const search = sp.search ?? "";
  const missingImages = sp.missingImages === "true";
  const categoryId = sp.categoryId ?? "";
  const cursor = sp.cursor ?? "";

  const [townsResp, categoriesResp, data] = await Promise.all([
    apiFetch<TownsResp>(`/admin/reports/towns`, { method: "GET" }),
    apiFetch<CategoriesResp>(`/admin/town-products/meta/categories`, { method: "GET" }),
    (async () => {
      const qs = new URLSearchParams();
      if (townId) qs.set("townId", townId);
      if (search) qs.set("search", search);
      if (missingImages) qs.set("missingImages", "true");
      if (categoryId) qs.set("categoryId", categoryId);
      if (cursor) qs.set("cursor", cursor);
      return apiFetch<Resp>(`/admin/town-products?${qs.toString()}`, { method: "GET" });
    })(),
  ]);

  const towns = townsResp?.rows ?? [];
  const categories = categoriesResp?.rows ?? [];

  const nextHref =
    data.pageInfo?.hasNextPage && data.pageInfo?.nextCursor
      ? `/ops/town-products?${new URLSearchParams({
          ...(townId ? { townId } : {}),
          ...(search ? { search } : {}),
          ...(missingImages ? { missingImages: "true" } : {}),
          ...(categoryId ? { categoryId } : {}),
          cursor: data.pageInfo.nextCursor,
        }).toString()}`
      : null;

  const missingCount = (data.rows ?? []).filter((r) => (r.imagesCount ?? 0) === 0).length;

  const categoryLabel =
    categoryId === "uncategorized"
      ? "Uncategorized"
      : categories.find((c) => c.id === categoryId)?.name ?? "";

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Town Products</h1>
          <p className="text-sm text-gray-500">
            Browse products and manage images, categories, and catalog entries.
          </p>

          {missingImages ? (
            <p className="mt-1 text-sm text-amber-700">Showing missing images only.</p>
          ) : missingCount > 0 ? (
            <p className="mt-1 text-sm text-amber-700">
              ⚠ {missingCount} product(s) on this page have no images. Use the filter to fix them
              quickly.
            </p>
          ) : null}

          {categoryId ? (
            <p className="mt-1 text-sm text-blue-700">
              Category filter: <span className="font-medium">{categoryLabel || categoryId}</span>
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/ops/town-products/new"
            className="inline-flex items-center justify-center rounded-md border bg-white px-4 py-2 text-sm hover:bg-gray-50"
          >
            + New product
          </Link>

          <Link className="text-sm text-blue-600 hover:underline" href="/ops/dashboard">
            Back to dashboard
          </Link>
        </div>
      </div>

      <form className="flex flex-col gap-3 rounded-lg border bg-white p-4 shadow-sm md:flex-row md:items-end">
        <div className="flex-1">
          <label className="block text-sm text-gray-600">Town</label>
          <select
            name="townId"
            defaultValue={townId}
            className="mt-1 w-full rounded-md border bg-white px-3 py-2"
          >
            <option value="">All towns</option>
            {towns.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.slug})
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label className="block text-sm text-gray-600">Search (product name)</label>
          <input
            name="search"
            defaultValue={search}
            className="mt-1 w-full rounded-md border px-3 py-2"
            placeholder="e.g. rice"
          />
        </div>

        <div className="flex-1">
          <label className="block text-sm text-gray-600">Category</label>
          <select
            name="categoryId"
            defaultValue={categoryId}
            className="mt-1 w-full rounded-md border bg-white px-3 py-2"
          >
            <option value="">All categories</option>
            <option value="uncategorized">Uncategorized</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {typeof c.productCount === "number" ? ` (${c.productCount})` : ""}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="missingImages" value="true" defaultChecked={missingImages} />
          Missing images only
        </label>

        <button className="rounded-md border bg-white px-4 py-2 hover:bg-gray-50" type="submit">
          Apply
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border bg-white p-4 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2 text-left font-semibold">Product</th>
              <th className="py-2 text-left font-semibold">Category</th>
              <th className="py-2 text-left font-semibold">Town</th>
              <th className="py-2 text-left font-semibold">Images</th>
              <th className="py-2 text-left font-semibold">Primary</th>
              <th className="py-2 text-left font-semibold">Actions</th>
            </tr>
          </thead>

          <tbody>
            {(data.rows ?? []).map((r) => (
              <tr key={r.id} className="border-b last:border-b-0">
                <td className="py-2">{r.productName ?? r.id}</td>

                <td className="py-2">
                  {r.categoryName ? (
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                      {r.categoryName}
                    </span>
                  ) : (
                    <span className="text-gray-500">Uncategorized</span>
                  )}
                </td>

                <td className="py-2">
                  {r.townName ? `${r.townName} (${r.townSlug})` : r.townId}
                </td>

                <td className="py-2">{r.imagesCount}</td>

                <td className="py-2">
                  {r.primaryImageUrl ? (
                    <a
                      className="inline-flex items-center gap-2 text-blue-600 hover:underline"
                      href={r.primaryImageUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        src={r.primaryImageUrl}
                        alt={r.productName ?? "image"}
                        width={50}
                        height={50}
                        className="rounded border object-cover"
                      />
                      <span>view</span>
                    </a>
                  ) : (
                    <span className="text-gray-500">none</span>
                  )}
                </td>

                <td className="space-x-3 whitespace-nowrap py-2">
                  <Link
                    className="text-blue-600 hover:underline"
                    href={`/ops/town-products/${r.id}/images`}
                  >
                    Manage images →
                  </Link>

                  <Link
                    className="text-green-700 hover:underline"
                    href={`/ops/town-products/${r.id}/edit`}
                  >
                    Edit →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {nextHref ? (
          <div className="mt-4">
            <Link className="text-blue-600 hover:underline" href={nextHref}>
              Next page →
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}