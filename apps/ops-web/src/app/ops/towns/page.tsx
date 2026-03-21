import Link from "next/link";
import { apiFetch } from "@/lib/api";
import CloneCatalogToTown from "./clone-catalog-to-town";

export const dynamic = "force-dynamic";

type TownRow = {
  id: string;
  name: string;
  slug: string;
};

type TownsResponse = {
  rows: TownRow[];
};

export default async function TownsPage() {
  const data = await apiFetch<TownsResponse>("/admin/towns", {
    method: "GET",
  });

  const rows = data?.rows ?? [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Towns</h1>
          <p className="text-sm text-gray-500">
            Manage towns available for the Town Commerce platform.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link className="text-sm text-blue-600 hover:underline" href="/ops/dashboard">
            ← Back to Ops
          </Link>
          <Link
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            href="/ops/towns/new"
          >
            + New town
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="px-4 py-3 font-semibold text-gray-700">Name</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Slug</th>
              <th className="px-4 py-3 font-semibold text-gray-700">ID</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((town) => (
                <tr key={town.id} className="border-t">
                  <td className="px-4 py-3">{town.name}</td>
                  <td className="px-4 py-3 text-gray-700">{town.slug}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{town.id}</td>
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

                      <CloneCatalogToTown
                        targetTownId={town.id}
                        targetTownName={town.name}
                      />
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-6 text-gray-500" colSpan={4}>
                  No towns found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}