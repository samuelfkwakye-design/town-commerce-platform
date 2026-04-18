"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type TownRow = {
  id: string;
  name: string;
  slug: string;
};

type TownsResponse = {
  rows: TownRow[];
};

type CloneCatalogResult = {
  summary: {
    found: number;
    created: number;
    skipped: number;
  };
  created: Array<{
    productId: string;
    productName: string | null;
    townProductId: string;
  }>;
  skipped: Array<{
    productId: string;
    productName: string | null;
    reason: string;
  }>;
};

export default function CloneCatalogToTown({
  targetTownId,
  targetTownName,
}: {
  targetTownId: string;
  targetTownName: string;
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [towns, setTowns] = useState<TownRow[]>([]);
  const [sourceTownId, setSourceTownId] = useState("");
  const [copyVariants, setCopyVariants] = useState(true);
  const [copyImages, setCopyImages] = useState(false);
  const [copyStock, setCopyStock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<CloneCatalogResult | null>(null);

  useEffect(() => {
    if (!open) return;

    async function loadTowns() {
      setLoading(true);
      setErr(null);

      try {
        const data = await apiFetch<TownsResponse>("/admin/towns", {
          method: "GET",
        });

        const rows = (data?.rows ?? []).filter((t) => t.id !== targetTownId);
        setTowns(rows);
        setSourceTownId(rows[0]?.id ?? "");
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setErr(msg);
      } finally {
        setLoading(false);
      }
    }

    void loadTowns();
  }, [open, targetTownId]);

  const selectedSourceTown = useMemo(
    () => towns.find((t) => t.id === sourceTownId) ?? null,
    [towns, sourceTownId],
  );

  async function onSubmit() {
    if (!sourceTownId) {
      setErr("Select a source town.");
      return;
    }

    setSubmitting(true);
    setErr(null);
    setResult(null);

    try {
      const res = await apiFetch<CloneCatalogResult>(
        `/admin/towns/${targetTownId}/clone-catalog`,
        {
          method: "POST",
          body: {
            sourceTownId,
            copyVariants,
            copyImages,
            copyStock,
          },
        },
      );

      setResult(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function closeModal() {
    setOpen(false);
    setErr(null);
    setResult(null);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
      >
        Clone catalog
      </button>

      {open ? (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
      <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold">Clone catalog into {targetTownName}</h2>
                <p className="text-sm text-gray-500">
                  Copy all products from a source town into this town.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto p-5">
              {err ? (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                  {err}
                </div>
              ) : null}

              <div>
                <label className="block text-sm text-gray-600">Source town</label>
                <select
                  value={sourceTownId}
                  onChange={(e) => setSourceTownId(e.target.value)}
                  className="mt-1 w-full rounded-md border px-3 py-2 bg-white"
                  disabled={loading || submitting || !!result}
                >
                  <option value="">Select source town</option>
                  {towns.map((town) => (
                    <option key={town.id} value={town.id}>
                      {town.name} ({town.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-md border bg-gray-50 p-3 space-y-2">
                <div className="text-sm font-medium">Options</div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={copyVariants}
                    onChange={(e) => setCopyVariants(e.target.checked)}
                    disabled={submitting || !!result}
                  />
                  Copy variants
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={copyImages}
                    onChange={(e) => setCopyImages(e.target.checked)}
                    disabled={submitting || !!result}
                  />
                  Copy images
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={copyStock}
                    onChange={(e) => setCopyStock(e.target.checked)}
                    disabled={submitting || !!result}
                  />
                  Copy stock snapshot
                </label>
              </div>

              {selectedSourceTown ? (
                <div className="text-sm text-gray-600">
                  Source: <span className="font-medium">{selectedSourceTown.name}</span>
                </div>
              ) : null}

              {result ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 space-y-2">
                  <div className="font-medium">
                    Clone complete: found {result.summary.found}, created {result.summary.created}, skipped {result.summary.skipped}.
                  </div>

                  {result.created.length ? (
                    <div>
                      <div className="font-medium">Created</div>
                      <ul className="ml-5 list-disc">
                        {result.created.map((x) => (
                          <li key={x.townProductId}>{x.productName ?? x.productId}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {result.skipped.length ? (
                    <div>
                      <div className="font-medium">Skipped</div>
                      <ul className="ml-5 list-disc">
                        {result.skipped.map((x, i) => (
                          <li key={`${x.productId}-${i}`}>
                            {x.productName ?? x.productId} — {x.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-3 border-t px-5 py-4">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-md border px-4 py-2 hover:bg-gray-50"
                disabled={submitting}
              >
                {result ? "Close" : "Cancel"}
              </button>

              {!result && (
                <button
                  type="button"
                  onClick={onSubmit}
                  className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                  disabled={submitting || loading || !sourceTownId}
                >
                  {submitting ? "Cloning..." : "Clone catalog"}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}