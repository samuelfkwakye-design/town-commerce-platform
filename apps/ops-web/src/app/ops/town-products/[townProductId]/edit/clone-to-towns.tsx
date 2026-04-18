"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

type TownOption = {
  id: string;
  name: string;
  slug: string;
};

type CloneResult = {
  summary: {
    requested: number;
    created: number;
    skipped: number;
  };
  created: Array<{
    townId: string;
    townName: string;
    townSlug: string;
    townProductId: string;
  }>;
  skipped: Array<{
    townId: string;
    townName: string;
    townSlug: string;
    reason: string;
  }>;
};

type TownsResponse = {
  rows: TownOption[];
};

export default function CloneToTowns({
  townProductId,
  sourceTownId,
}: {
  townProductId: string;
  sourceTownId: string | null | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [towns, setTowns] = useState<TownOption[]>([]);
  const [selectedTownIds, setSelectedTownIds] = useState<string[]>([]);
  const [copyVariants, setCopyVariants] = useState(true);
  const [copyImages, setCopyImages] = useState(false);
  const [copyStock, setCopyStock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<CloneResult | null>(null);

  useEffect(() => {
    if (!open) return;

    async function loadTowns() {
      setLoading(true);
      setErr(null);

      try {
        const data = await apiFetch<TownsResponse>("/admin/towns", {
          method: "GET",
        });

        const rows = data?.rows ?? [];
        setTowns(rows.filter((t) => t.id !== sourceTownId));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setErr(msg);
      } finally {
        setLoading(false);
      }
    }

    void loadTowns();
  }, [open, sourceTownId]);

  const allVisibleTownIds = useMemo(() => towns.map((t) => t.id), [towns]);

  function toggleTown(id: string) {
    setSelectedTownIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function selectAll() {
    setSelectedTownIds(allVisibleTownIds);
  }

  function clearAll() {
    setSelectedTownIds([]);
  }

  async function onSubmit() {
    if (!selectedTownIds.length) {
      setErr("Select at least one town.");
      return;
    }

    setSubmitting(true);
    setErr(null);
    setResult(null);

    try {
      const res = await apiFetch<CloneResult>(`/admin/town-products/${townProductId}/clone`, {
        method: "POST",
        body: {
          townIds: selectedTownIds,
          copyVariants,
          copyImages,
          copyStock,
        },
      });

      setResult(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border px-4 py-2 text-sm bg-white hover:bg-gray-50"
      >
        Copy to towns
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold">Copy product to towns</h2>
                <p className="text-sm text-gray-500">
                  Clone this town product into selected towns.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setErr(null);
                  setResult(null);
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 p-5">
              {err ? (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                  {err}
                </div>
              ) : null}

              <div className="rounded-md border bg-gray-50 p-3 space-y-2">
                <div className="text-sm font-medium">Options</div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={copyVariants}
                    onChange={(e) => setCopyVariants(e.target.checked)}
                  />
                  Copy variants
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={copyImages}
                    onChange={(e) => setCopyImages(e.target.checked)}
                  />
                  Copy images
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={copyStock}
                    onChange={(e) => setCopyStock(e.target.checked)}
                  />
                  Copy stock snapshot
                </label>
              </div>

              <div className="rounded-md border p-3">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-medium">Target towns</div>
                  <div className="flex items-center gap-3 text-sm">
                    <button
                      type="button"
                      className="text-blue-600 hover:underline"
                      onClick={selectAll}
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      className="text-blue-600 hover:underline"
                      onClick={clearAll}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div className="text-sm text-gray-500">Loading towns…</div>
                ) : towns.length ? (
                  <div className="grid gap-2 md:grid-cols-2">
                    {towns.map((town) => (
                      <label
                        key={town.id}
                        className="flex items-center gap-2 rounded border px-3 py-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTownIds.includes(town.id)}
                          onChange={() => toggleTown(town.id)}
                        />
                        <span>
                          {town.name} <span className="text-gray-500">({town.slug})</span>
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No target towns available.</div>
                )}
              </div>

              {result ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 space-y-2">
                  <div className="font-medium">
                    Clone complete: {result.summary.created} created, {result.summary.skipped} skipped.
                  </div>

                  {result.created.length ? (
                    <div>
                      <div className="font-medium">Created</div>
                      <ul className="ml-5 list-disc">
                        {result.created.map((x) => (
                          <li key={x.townId}>
                            {x.townName} ({x.townSlug})
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {result.skipped.length ? (
                    <div>
                      <div className="font-medium">Skipped</div>
                      <ul className="ml-5 list-disc">
                        {result.skipped.map((x) => (
                          <li key={x.townId}>
                            {x.townName} ({x.townSlug}) — {x.reason}
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
                onClick={() => setOpen(false)}
                className="rounded-md border px-4 py-2 bg-white hover:bg-gray-50"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSubmit}
                className="rounded-md border px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={submitting || loading}
              >
                {submitting ? "Copying..." : "Copy to selected towns"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
