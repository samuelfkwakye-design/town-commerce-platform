import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import RequireAdminRole from '@/components/RequireAdminRole';

export const dynamic = 'force-dynamic';

type TownRow = {
  id: string;
  name: string;
  slug: string;
};

type TownsResponse = {
  rows: TownRow[];
};

export default async function TownsPage() {
  let rows: TownRow[] = [];
  let error: string | null = null;

  try {
    const data = await apiFetch<TownsResponse>('/admin/towns', {
  method: 'GET',
  auth: true,
});

    rows = data?.rows ?? [];
  } catch (e: any) {
    error = e?.message ?? 'Failed to load towns';
  }

  return (
    <RequireAdminRole allowedRoles={['GLOBAL_SUPER_ADMIN']}>
      <div className="space-y-6 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Towns
            </h1>
            <p className="text-sm text-slate-500">
              Manage towns available across the KOSTOMA platform.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              className="text-sm font-medium text-blue-600 hover:underline"
              href="/ops/dashboard"
            >
              ← Back to Ops
            </Link>

            <Link
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              href="/ops/towns/new"
            >
              + New town
            </Link>
          </div>
        </div>

        {error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
            {error}
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3 text-sm text-slate-500">
              {rows.length} town{rows.length === 1 ? '' : 's'}
            </div>

            {rows.length === 0 ? (
              <div className="px-4 py-6 text-sm text-slate-500">No towns found.</div>
            ) : (
              <>
                <div className="hidden overflow-x-auto lg:block">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr className="text-left">
                        <th className="px-4 py-3 font-semibold text-slate-700">Name</th>
                        <th className="px-4 py-3 font-semibold text-slate-700">Slug</th>
                        <th className="px-4 py-3 font-semibold text-slate-700">ID</th>
                        <th className="px-4 py-3 font-semibold text-slate-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((town) => (
                        <tr key={town.id} className="border-t border-slate-100">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {town.name}
                          </td>
                          <td className="px-4 py-3 text-slate-700">{town.slug}</td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">
                            {town.id}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-3">
                              <Link
                                className="text-blue-600 hover:underline"
                                href={`/ops/towns/${town.id}/settings`}
                              >
                                Settings
                              </Link>

                              <Link
                                className="text-blue-600 hover:underline"
                                href={`/ops/town-products?townId=${town.id}`}
                              >
                                View products
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-4 p-4 lg:hidden">
                  {rows.map((town) => (
                    <div
                      key={town.id}
                      className="rounded-2xl border border-slate-200 p-4 shadow-sm"
                    >
                      <div className="text-base font-semibold text-slate-900">
                        {town.name}
                      </div>

                      <div className="mt-3 grid gap-3 text-sm">
                        <div>
                          <div className="text-slate-500">Slug</div>
                          <div className="font-medium text-slate-900">{town.slug}</div>
                        </div>

                        <div>
                          <div className="text-slate-500">ID</div>
                          <div className="break-all font-mono text-xs text-slate-700">
                            {town.id}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          <Link
                            className="text-blue-600 hover:underline"
                            href={`/ops/towns/${town.id}/settings`}
                          >
                            Settings
                          </Link>

                          <Link
                            className="text-blue-600 hover:underline"
                            href={`/ops/town-products?townId=${town.id}`}
                          >
                            View products
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </RequireAdminRole>
  );
}