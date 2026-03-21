"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

type CustomerRow = {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  town: string | null;
  addressCount: number;
  orderCount: number;
  registeredAt: string;
};

type CustomersResponse = {
  rows: CustomerRow[];
  count: number;
};

function fmtDate(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function OpsCustomersPage() {
  const [data, setData] = useState<CustomersResponse>({ rows: [], count: 0 });
  const [search, setSearch] = useState("");
  const [townSearch, setTownSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const query = search.trim()
        ? `/admin/customers?search=${encodeURIComponent(search.trim())}`
        : "/admin/customers";

      const res = await apiFetch<CustomersResponse>(query);
      setData(res);
    } catch (err: any) {
      setError(err?.message || "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const townOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        (data.rows ?? [])
          .map((row) => row.town?.trim())
          .filter((value): value is string => Boolean(value))
      )
    );

    return values.sort((a, b) => a.localeCompare(b));
  }, [data.rows]);

  const rows = useMemo(() => {
    const base = data.rows ?? [];
    const townTerm = townSearch.trim().toLowerCase();

    if (!townTerm) return base;

    return base.filter((row) =>
      (row.town ?? "").toLowerCase().includes(townTerm)
    );
  }, [data.rows, townSearch]);

  return (
    <main className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="text-sm text-slate-500">
            View registered customers and their order activity.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            list="town-options"
            className="h-10 w-[220px] rounded-md border px-3 text-sm"
            placeholder="Filter by town..."
            value={townSearch}
            onChange={(e) => setTownSearch(e.target.value)}
          />
          <datalist id="town-options">
            {townOptions.map((town) => (
              <option key={town} value={town} />
            ))}
          </datalist>

          <input
            className="h-10 w-[260px] rounded-md border px-3 text-sm"
            placeholder="Search name, phone, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") load();
            }}
          />

          <button
            onClick={load}
            className="h-10 rounded-md border px-4 text-sm font-medium"
          >
            Search
          </button>

          <button
            onClick={() => {
              setTownSearch("");
              setSearch("");
              load();
            }}
            className="h-10 rounded-md border px-4 text-sm font-medium"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="rounded-xl border bg-white">
        <div className="border-b px-4 py-3 text-sm text-slate-500">
          Showing {rows.length} of {data.count} customers
        </div>

        {loading ? (
          <div className="p-6 text-sm">Loading customers...</div>
        ) : error ? (
          <div className="p-6 text-sm text-red-600">{error}</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">No customers found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr className="border-b">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Town</th>
                  <th className="px-4 py-3 font-medium">Addresses</th>
                  <th className="px-4 py-3 font-medium">Orders</th>
                  <th className="px-4 py-3 font-medium">Registered</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3 font-medium">
                      {row.name || row.firstName || "—"}
                    </td>
                    <td className="px-4 py-3">{row.phone || "—"}</td>
                    <td className="px-4 py-3">{row.email || "—"}</td>
                    <td className="px-4 py-3">{row.town || "—"}</td>
                    <td className="px-4 py-3">{row.addressCount}</td>
                    <td className="px-4 py-3">{row.orderCount}</td>
                    <td className="px-4 py-3">{fmtDate(row.registeredAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}