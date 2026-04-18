'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';

type AdminRole =
  | 'GLOBAL_SUPER_ADMIN'
  | 'TOWN_SUPER_ADMIN'
  | 'WAREHOUSE_ADMIN';

type CurrentAdmin = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: AdminRole;
  townId?: string | null;
};

type CustomerRow = {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  town: string | null;
  townId?: string | null;
  addressCount: number;
  orderCount: number;
  registeredAt: string;
};

type CustomersResponse = {
  rows: CustomerRow[];
  count: number;
};

type Town = {
  id: string;
  name: string;
  slug: string;
};

function fmtDate(value: string) {
  try {
    return new Date(value).toLocaleString('en-GB');
  } catch {
    return value;
  }
}

export default function OpsCustomersPage() {
  const [currentAdmin, setCurrentAdmin] = useState<CurrentAdmin | null>(null);
  const [towns, setTowns] = useState<Town[]>([]);
  const [data, setData] = useState<CustomersResponse>({ rows: [], count: 0 });
  const [search, setSearch] = useState('');
  const [selectedTownId, setSelectedTownId] = useState('');
  const [loading, setLoading] = useState(true);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isGlobalAdmin = currentAdmin?.role === 'GLOBAL_SUPER_ADMIN';
  const isTownScopedAdmin =
    currentAdmin?.role === 'TOWN_SUPER_ADMIN' ||
    currentAdmin?.role === 'WAREHOUSE_ADMIN';

  async function loadCustomers(nextTownId?: string) {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      const trimmedSearch = search.trim();
      const townIdToUse = nextTownId ?? selectedTownId;

      if (trimmedSearch) {
        params.set('search', trimmedSearch);
      }

      if (townIdToUse) {
        params.set('townId', townIdToUse);
      }

      const query = params.toString()
        ? `/admin/customers?${params.toString()}`
        : '/admin/customers';

      const res = await apiFetch<CustomersResponse>(query, {
  method: 'GET',
  auth: true,
});
      setData(res ?? { rows: [], count: 0 });
    } catch (err: any) {
      setError(err?.message || 'Failed to load customers');
      setData({ rows: [], count: 0 });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function bootstrap() {
      setBootstrapping(true);
      setError(null);

      try {
        const [adminRes, townsRes] = await Promise.all([
          apiFetch<CurrentAdmin>('/admin-auth/me', {
  method: 'GET',
  auth: true,
}),
          apiFetch<Town[]>('/towns', {
  method: 'GET',
  auth: true,
}),
        ]);

        const admin = adminRes ?? null;
        const nextTowns = Array.isArray(townsRes) ? townsRes : [];

        setCurrentAdmin(admin);
        setTowns(nextTowns);

        let initialTownId = '';

        if (admin?.townId) {
          initialTownId = admin.townId;
        }

        setSelectedTownId(initialTownId);
        await loadCustomers(initialTownId);
      } catch (err: any) {
        setError(err?.message || 'Failed to load customers page');
      } finally {
        setBootstrapping(false);
      }
    }

    bootstrap();
  }, []);

  const selectedTownName = useMemo(() => {
    return towns.find((town) => town.id === selectedTownId)?.name ?? '';
  }, [towns, selectedTownId]);

  const rows = useMemo(() => {
    return data.rows ?? [];
  }, [data.rows]);

  return (
    <main className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Customers
          </h1>
          <p className="text-sm text-slate-500">
            View registered customers and their order activity.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
          <div className="text-slate-500">Signed in as</div>
          <div className="font-medium text-slate-900">
            {bootstrapping ? 'Loading...' : currentAdmin?.role ?? 'Unknown role'}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Filters</h2>
            <p className="text-sm text-slate-500">
              {isTownScopedAdmin && selectedTownName
                ? `Your view is restricted to ${selectedTownName}.`
                : 'Filter customers by town and search term.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={selectedTownId}
              onChange={(e) => setSelectedTownId(e.target.value)}
              disabled={bootstrapping || isTownScopedAdmin}
              className="h-10 w-[220px] rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500 disabled:bg-slate-100"
            >
              <option value="">
                {isGlobalAdmin ? 'All towns' : 'Assigned town'}
              </option>
              {towns.map((town) => (
                <option key={town.id} value={town.id}>
                  {town.name}
                </option>
              ))}
            </select>

            <input
              className="h-10 w-[260px] rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
              placeholder="Search name, phone, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  loadCustomers();
                }
              }}
            />

            <button
              onClick={() => loadCustomers()}
              disabled={loading || bootstrapping}
              className="h-10 rounded-xl border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Search
            </button>

            <button
              onClick={() => {
                const resetTownId = currentAdmin?.townId ?? '';
                setSearch('');
                setSelectedTownId(resetTownId);
                loadCustomers(resetTownId);
              }}
              disabled={loading || bootstrapping}
              className="h-10 rounded-xl border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3 text-sm text-slate-500">
          {loading ? 'Loading customers...' : `Showing ${rows.length} of ${data.count} customers`}
        </div>

        {bootstrapping || loading ? (
          <div className="p-6 text-sm text-slate-600">Loading customers...</div>
        ) : error ? (
          <div className="p-6 text-sm text-red-600">{error}</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">No customers found.</div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-3 font-medium text-slate-700">Name</th>
                    <th className="px-4 py-3 font-medium text-slate-700">Phone</th>
                    <th className="px-4 py-3 font-medium text-slate-700">Email</th>
                    <th className="px-4 py-3 font-medium text-slate-700">Town</th>
                    <th className="px-4 py-3 font-medium text-slate-700">Addresses</th>
                    <th className="px-4 py-3 font-medium text-slate-700">Orders</th>
                    <th className="px-4 py-3 font-medium text-slate-700">Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {row.name ||
                          [row.firstName, row.lastName].filter(Boolean).join(' ') ||
                          '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{row.phone || '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{row.email || '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{row.town || '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{row.addressCount}</td>
                      <td className="px-4 py-3 text-slate-700">{row.orderCount}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {fmtDate(row.registeredAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-4 p-4 lg:hidden">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="rounded-2xl border border-slate-200 p-4 shadow-sm"
                >
                  <div className="text-base font-semibold text-slate-900">
                    {row.name ||
                      [row.firstName, row.lastName].filter(Boolean).join(' ') ||
                      '—'}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-slate-500">Phone</div>
                      <div className="font-medium text-slate-900">{row.phone || '—'}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Email</div>
                      <div className="font-medium text-slate-900">{row.email || '—'}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Town</div>
                      <div className="font-medium text-slate-900">{row.town || '—'}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Addresses</div>
                      <div className="font-medium text-slate-900">{row.addressCount}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Orders</div>
                      <div className="font-medium text-slate-900">{row.orderCount}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Registered</div>
                      <div className="font-medium text-slate-900">
                        {fmtDate(row.registeredAt)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}