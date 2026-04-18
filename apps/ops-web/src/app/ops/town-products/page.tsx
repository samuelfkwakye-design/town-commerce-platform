import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { getCurrentAdmin } from '@/lib/getCurrentAdmin';
import RequireAdminRole from '@/components/RequireAdminRole';

export const dynamic = 'force-dynamic';

type SearchParams = {
  townId?: string;
  search?: string;
  missingImages?: string;
  categoryId?: string;
  cursor?: string;
};

type TownOption = {
  id: string;
  name: string;
  slug: string;
};

type TownsResp = {
  rows: TownOption[];
};

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
  pageInfo: {
    limit: number;
    hasNextPage: boolean;
    nextCursor: string | null;
  };
};

export default async function TownProductsPage(props: {
  searchParams?: Promise<SearchParams>;
}) {
  const admin = await getCurrentAdmin();
  const sp = (await props.searchParams) ?? {};

  const isGlobalAdmin = admin?.role === 'GLOBAL_SUPER_ADMIN';
  const isTownScopedAdmin = admin?.role === 'TOWN_SUPER_ADMIN';

  const requestedTownId = sp.townId ?? '';
  const effectiveTownId = isGlobalAdmin ? requestedTownId : admin?.townId ?? '';

  const search = sp.search ?? '';
  const missingImages = sp.missingImages === 'true';
  const categoryId = sp.categoryId ?? '';
  const cursor = sp.cursor ?? '';

  const [townsResp, categoriesResp, data] = await Promise.all([
    isGlobalAdmin
      ? apiFetch<TownsResp>('/admin/reports/towns', {
    method: 'GET',
    auth: true,
  })
      : Promise.resolve({ rows: [] }),
    apiFetch<CategoriesResp>('/admin/town-products/meta/categories', {
  method: 'GET',
  auth: true,
}),
    (async () => {
      const qs = new URLSearchParams();
      if (effectiveTownId) qs.set('townId', effectiveTownId);
      if (search) qs.set('search', search);
      if (missingImages) qs.set('missingImages', 'true');
      if (categoryId) qs.set('categoryId', categoryId);
      if (cursor) qs.set('cursor', cursor);

      return apiFetch<Resp>(`/admin/town-products?${qs.toString()}`, {
  method: 'GET',
  auth: true,
});
    })(),
  ]);

  const towns = townsResp?.rows ?? [];
  const categories = categoriesResp?.rows ?? [];

  const selectedTown = effectiveTownId
    ? towns.find((t) => t.id === effectiveTownId) ?? null
    : null;

  const nextHref =
    data.pageInfo?.hasNextPage && data.pageInfo?.nextCursor
      ? `/ops/town-products?${new URLSearchParams({
          ...(effectiveTownId ? { townId: effectiveTownId } : {}),
          ...(search ? { search } : {}),
          ...(missingImages ? { missingImages: 'true' } : {}),
          ...(categoryId ? { categoryId } : {}),
          cursor: data.pageInfo.nextCursor,
        }).toString()}`
      : null;

  const missingCount = (data.rows ?? []).filter((r) => (r.imagesCount ?? 0) === 0).length;

  const categoryLabel =
    categoryId === 'uncategorized'
      ? 'Uncategorized'
      : categories.find((c) => c.id === categoryId)?.name ?? '';

  return (
    <RequireAdminRole
      allowedRoles={['GLOBAL_SUPER_ADMIN', 'TOWN_SUPER_ADMIN']}
      requireTownScope={false}
    >
      <div className="space-y-6 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Town Products
            </h1>
            <p className="text-sm text-slate-500">
              Browse products and manage images, categories, and catalog entries.
            </p>

            {isTownScopedAdmin ? (
              <p className="mt-1 text-sm text-blue-700">
                Your view is restricted to your assigned town.
              </p>
            ) : null}

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
              href={
                effectiveTownId
                  ? `/ops/town-products/new?townId=${encodeURIComponent(effectiveTownId)}`
                  : '/ops/town-products/new'
              }
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
            >
              + New product
            </Link>

            <Link className="text-sm text-blue-600 hover:underline" href="/ops/dashboard">
              Back to dashboard
            </Link>
          </div>
        </div>

        <form className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-end">
          <div className="flex-1">
            <label className="block text-sm text-slate-600">Town</label>

            {isGlobalAdmin ? (
              <select
                name="townId"
                defaultValue={effectiveTownId}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
              >
                <option value="">All towns</option>
                {towns.map((town) => (
                  <option key={town.id} value={town.id}>
                    {town.name} ({town.slug})
                  </option>
                ))}
              </select>
            ) : (
              <>
                <input
                  value={selectedTown ? `${selectedTown.name} (${selectedTown.slug})` : ''}
                  disabled
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-100 px-3 py-2"
                />
                <input type="hidden" name="townId" value={effectiveTownId} />
              </>
            )}
          </div>

          <div className="flex-1">
            <label className="block text-sm text-slate-600">Search (product name)</label>
            <input
              name="search"
              defaultValue={search}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              placeholder="e.g. rice"
            />
          </div>

          <div className="flex-1">
            <label className="block text-sm text-slate-600">Category</label>
            <select
              name="categoryId"
              defaultValue={categoryId}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
            >
              <option value="">All categories</option>
              <option value="uncategorized">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {typeof c.productCount === 'number' ? ` (${c.productCount})` : ''}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="missingImages" value="true" defaultChecked={missingImages} />
            Missing images only
          </label>

          <button
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 hover:bg-slate-50"
            type="submit"
          >
            Apply
          </button>
        </form>

        {!effectiveTownId && isGlobalAdmin ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            You are viewing products across all towns. Selecting a town first is usually clearer for local product work.
          </div>
        ) : null}

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-2 text-left font-semibold text-slate-700">Product</th>
                <th className="py-2 text-left font-semibold text-slate-700">Category</th>
                <th className="py-2 text-left font-semibold text-slate-700">Town</th>
                <th className="py-2 text-left font-semibold text-slate-700">Images</th>
                <th className="py-2 text-left font-semibold text-slate-700">Primary</th>
                <th className="py-2 text-left font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>

            <tbody>
              {(data.rows ?? []).map((row) => (
                <tr key={row.id} className="border-b border-slate-100 last:border-b-0">
                  <td className="py-2 text-slate-900">{row.productName ?? row.id}</td>

                  <td className="py-2">
                    {row.categoryName ? (
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                        {row.categoryName}
                      </span>
                    ) : (
                      <span className="text-slate-500">Uncategorized</span>
                    )}
                  </td>

                  <td className="py-2 text-slate-700">
                    {row.townName ? `${row.townName} (${row.townSlug})` : row.townId}
                  </td>

                  <td className="py-2 text-slate-700">{row.imagesCount}</td>

                  <td className="py-2">
                    {row.primaryImageUrl ? (
                      <a
                        className="inline-flex items-center gap-2 text-blue-600 hover:underline"
                        href={row.primaryImageUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <img
                          src={row.primaryImageUrl}
                          alt={row.productName ?? 'image'}
                          width={50}
                          height={50}
                          className="rounded border object-cover"
                        />
                        <span>view</span>
                      </a>
                    ) : (
                      <span className="text-slate-500">none</span>
                    )}
                  </td>

                  <td className="space-x-3 whitespace-nowrap py-2">
                    <Link
                      className="text-blue-600 hover:underline"
                      href={`/ops/town-products/${row.id}/images`}
                    >
                      Manage images →
                    </Link>

                    <Link
                      className="text-green-700 hover:underline"
                      href={`/ops/town-products/${row.id}/edit`}
                    >
                      Edit →
                    </Link>
                  </td>
                </tr>
              ))}

              {(data.rows ?? []).length === 0 ? (
                <tr>
                  <td className="py-6 text-slate-500" colSpan={6}>
                    No town products found.
                  </td>
                </tr>
              ) : null}
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
    </RequireAdminRole>
  );
}