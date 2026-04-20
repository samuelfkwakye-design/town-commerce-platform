"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { TownProductImageUpload } from "@/components/TownProductImageUpload";

type AdminRole =
  | "GLOBAL_SUPER_ADMIN"
  | "TOWN_SUPER_ADMIN"
  | "WAREHOUSE_ADMIN";

type CurrentAdmin = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: AdminRole;
  townId: string | null;
  town: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

type PricingModel = "UNIT" | "WEIGHT" | "VARIANT";

type TownProductResp = {
  id: string;
  townId?: string | null;
  pricingModel: PricingModel;

  pricePerUnit: string | null;
  costPerUnit: string | null;

  pricePerKg: string | null;
  costPerKg: string | null;

  stockQty: number | null;
  stockWeightGrams: number | null;

  product?: { name: string | null } | null;
  town?: { id?: string | null; name: string | null; slug: string | null } | null;
};

type VariantResp = {
  id: string;
  label: string;
  unitPrice: string;
  unitCost: string | null;
  isActive: boolean;
  sortOrder: number;
  packWeightGrams: number | null;
};

type StockSummary = {
  townProductId: string;
  townName?: string | null;
  townSlug?: string | null;
  productName?: string | null;
  pricingModel?: PricingModel | null;

  snapshotQty?: number | null;
  ledgerQty?: number | null;
  diffQty?: number | null;

  snapshotWeightGrams?: number | null;
  ledgerWeightGrams?: number | null;
  diffWeightGrams?: number | null;

  lastMovementAt?: string | null;
  snapshotUpdatedAt?: string | null;
};

type Movement = Record<string, any>;

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function fmtNumber(n: any) {
  if (n === null || n === undefined) return "—";
  const x = Number(n);
  if (!Number.isFinite(x)) return String(n);
  return x.toLocaleString();
}

function fmtMoney(v: any) {
  if (v === null || v === undefined || v === "") return "—";
  const x = Number(v);
  if (!Number.isFinite(x)) return String(v);
  return x.toFixed(2);
}

function fmtWeightGrams(n: any) {
  if (n === null || n === undefined) return "—";
  const grams = Number(n);
  if (!Number.isFinite(grams)) return String(n);
  const kg = grams / 1000;
  return `${grams.toLocaleString()} g (${kg.toFixed(3)} kg)`;
}

function pickSummaryShape(payload: any, townProductId: string): StockSummary {
  const base = payload?.summary ?? payload?.header ?? payload?.item ?? payload ?? {};
  return {
    townProductId,
    townName: base.townName ?? base.town?.name ?? null,
    townSlug: base.townSlug ?? base.town?.slug ?? null,
    productName: base.productName ?? base.product?.name ?? null,
    pricingModel: base.pricingModel ?? base.product?.pricingModel ?? null,

    snapshotQty: base.snapshotQty ?? null,
    ledgerQty: base.ledgerQty ?? null,
    diffQty: base.diffQty ?? null,

    snapshotWeightGrams: base.snapshotWeightGrams ?? null,
    ledgerWeightGrams: base.ledgerWeightGrams ?? null,
    diffWeightGrams: base.diffWeightGrams ?? null,

    lastMovementAt: base.lastMovementAt ?? null,
    snapshotUpdatedAt: base.snapshotUpdatedAt ?? null,
  };
}

function pickMovements(payload: any): Movement[] {
  const m = payload?.movements ?? payload?.items ?? payload?.rows ?? payload?.data ?? [];
  return Array.isArray(m) ? m : [];
}

export default function OpsStockDetailPage() {
  const params = useParams<{ townProductId?: string | string[] }>();
  const raw = params?.townProductId;
  const townProductId = Array.isArray(raw) ? raw[0] : raw;

  const [admin, setAdmin] = useState<CurrentAdmin | null>(null);

  const [bootstrapping, setBootstrapping] = useState(true);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);

  const [tp, setTp] = useState<TownProductResp | null>(null);
  const [variants, setVariants] = useState<VariantResp[]>([]);

  const [showAdjust, setShowAdjust] = useState(false);
  const [note, setNote] = useState("");
  const [deltaQty, setDeltaQty] = useState<string>("0");
  const [deltaWeightGrams, setDeltaWeightGrams] = useState<string>("0");

  const pricingModel = (tp?.pricingModel ?? summary?.pricingModel ?? null) as PricingModel | null;
  const isWeight = pricingModel === "WEIGHT";
  const isVariant = pricingModel === "VARIANT";

  const canManageImages =
    admin?.role === "GLOBAL_SUPER_ADMIN" || admin?.role === "TOWN_SUPER_ADMIN";

  async function refreshAll(id: string, currentAdmin?: CurrentAdmin | null) {
    const effectiveAdmin = currentAdmin ?? admin;
    if (!effectiveAdmin) return;

    setLoading(true);
    setErr(null);
    setAccessDenied(false);

    try {
      // 1) TownProduct first, so we can RBAC-check town ownership before using the rest
      const townProduct = await apiFetch<TownProductResp>(`/admin/town-products/${id}`, {
  method: "GET",
  auth: true,
});

      const ownerTownId =
        townProduct.townId ?? townProduct.town?.id ?? null;

      if (
        (effectiveAdmin.role === "TOWN_SUPER_ADMIN" ||
          effectiveAdmin.role === "WAREHOUSE_ADMIN") &&
        effectiveAdmin.townId &&
        ownerTownId &&
        ownerTownId !== effectiveAdmin.townId
      ) {
        setAccessDenied(true);
        setTp(null);
        setSummary(null);
        setMovements([]);
        setVariants([]);
        return;
      }

      setTp(townProduct);

      // 2) Stock + movements
      const res = await apiFetch<any>(`/stock-movements/${id}`, {
  auth: true,
});
      setSummary(pickSummaryShape(res, id));
      setMovements(pickMovements(res));

      // 3) Variants if needed
      if (townProduct?.pricingModel === "VARIANT") {
        const v = await apiFetch<{ rows: VariantResp[] }>(
  `/admin/town-products/${id}/variants`,
  {
    method: "GET",
    auth: true,
  },
);

        const rows = (v?.rows ?? []).slice().sort((a, b) => {
          const ao = a.sortOrder ?? 0;
          const bo = b.sortOrder ?? 0;
          if (ao !== bo) return ao - bo;
          return String(a.label).localeCompare(String(b.label));
        });

        setVariants(rows);
      } else {
        setVariants([]);
      }
    } catch (e: any) {
      setErr(String(e?.message ?? e));
      setSummary(null);
      setMovements([]);
      setTp(null);
      setVariants([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!townProductId) return;

      try {
        setBootstrapping(true);
        setErr(null);
        setAccessDenied(false);

        const me = await apiFetch<CurrentAdmin>("/admin-auth/me");
        if (cancelled) return;

        setAdmin(me);
        await refreshAll(townProductId, me);
      } catch (e: any) {
        if (!cancelled) {
          setErr(String(e?.message ?? e));
        }
      } finally {
        if (!cancelled) {
          setBootstrapping(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [townProductId]);

  async function doReconcile() {
    if (!townProductId || accessDenied) return;

    const ok = window.confirm(
      "Reconcile will set snapshot stock = ledger stock for this TownProduct.\n\nProceed?",
    );
    if (!ok) return;

    setLoading(true);
    setErr(null);
    try {
      await apiFetch<any>(`/stock-movements/${townProductId}/reconcile`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      await refreshAll(townProductId);
    } catch (e: any) {
      setErr(String(e?.message ?? e));
      setLoading(false);
    }
  }

  async function submitAdjustment() {
    if (!townProductId || accessDenied) return;

    const trimmed = note.trim();
    if (!trimmed) {
      alert("Note is required for audit.");
      return;
    }

    const qty = Number(deltaQty);
    const grams = Number(deltaWeightGrams);

    if (!isWeight && !Number.isFinite(qty)) {
      alert("Please enter a valid UNIT delta quantity.");
      return;
    }
    if (isWeight && !Number.isFinite(grams)) {
      alert("Please enter a valid WEIGHT delta grams.");
      return;
    }

    const preview = isWeight
      ? `You are about to create a ledger adjustment of ${grams} grams.\n\nNote: ${trimmed}\n\nProceed?`
      : `You are about to create a ledger adjustment of ${qty} units.\n\nNote: ${trimmed}\n\nProceed?`;

    const ok = window.confirm(preview);
    if (!ok) return;

    setLoading(true);
    setErr(null);
    try {
      await apiFetch<any>(`/stock-movements/${townProductId}/manual-adjustment`, {
        method: "POST",
        body: JSON.stringify({
          note: trimmed,
          deltaQty: isWeight ? null : qty,
          deltaWeightGrams: isWeight ? grams : null,
        }),
      });

      setShowAdjust(false);
      setNote("");
      setDeltaQty("0");
      setDeltaWeightGrams("0");

      await refreshAll(townProductId);
    } catch (e: any) {
      setErr(String(e?.message ?? e));
      setLoading(false);
    }
  }

  const snapshotText = summary
    ? isWeight
      ? fmtWeightGrams(summary.snapshotWeightGrams)
      : fmtNumber(summary.snapshotQty)
    : "—";

  const ledgerText = summary
    ? isWeight
      ? fmtWeightGrams(summary.ledgerWeightGrams)
      : fmtNumber(summary.ledgerQty)
    : "—";

  const diffText = summary
    ? isWeight
      ? fmtWeightGrams(summary.diffWeightGrams)
      : fmtNumber(summary.diffQty)
    : "—";

  if (!townProductId) {
    return (
      <div className="p-4">
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          Missing TownProductId.
        </div>
      </div>
    );
  }

  if (bootstrapping) {
    return (
      <div className="p-4">
        <div className="rounded-md border bg-white p-4 text-sm text-gray-700">
          Loading stock detail...
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-sm text-gray-500">
          <Link href="/ops/stock" className="underline">
            Stock
          </Link>{" "}
          <span className="mx-1">/</span>
          <span>Detail</span>
        </div>

        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          You do not have permission to access this stock item.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-gray-500">
            <Link href="/ops/stock" className="underline">
              Stock
            </Link>{" "}
            <span className="mx-1">/</span>
            <span>Detail</span>
          </div>

          <h1 className="text-xl font-semibold mt-1">
            {tp?.town?.name ?? summary?.townName ?? "—"} •{" "}
            {tp?.product?.name ?? summary?.productName ?? "—"}
          </h1>

          <div className="text-sm text-gray-600">
            TownProductId: <span className="font-mono text-xs">{townProductId}</span>
          </div>

          {admin ? (
            <div className="mt-1 text-xs text-gray-500">
              Role: <span className="font-medium">{admin.role}</span>
              {(admin.role === "TOWN_SUPER_ADMIN" ||
                admin.role === "WAREHOUSE_ADMIN") &&
              admin.town ? (
                <>
                  {" "}
                  · Town-scoped to <span className="font-medium">{admin.town.name}</span>
                </>
              ) : null}
            </div>
          ) : null}

          {townProductId && canManageImages ? (
            <div className="mt-3">
              <TownProductImageUpload townProductId={townProductId} />
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
            disabled={loading}
            onClick={doReconcile}
          >
            Reconcile
          </button>

          <button
            className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
            disabled={loading}
            onClick={() => setShowAdjust(true)}
          >
            Manual adjustment
          </button>

          <button
            className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
            disabled={loading}
            onClick={() => refreshAll(townProductId)}
          >
            Refresh
          </button>
        </div>
      </div>

      {err ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          {err}
        </div>
      ) : null}

      <div className="rounded-lg border bg-white p-3">
        <div className="text-sm font-semibold">Pricing</div>
        <div className="mt-2 text-sm text-gray-700">
          Model: <span className="font-mono">{pricingModel ?? "—"}</span>
        </div>

        {pricingModel === "UNIT" ? (
          <div className="mt-2 grid gap-2 md:grid-cols-2 text-sm">
            <div>
              <span className="text-gray-600">Price per unit:</span> {fmtMoney(tp?.pricePerUnit)}
            </div>
            <div>
              <span className="text-gray-600">Cost per unit:</span> {fmtMoney(tp?.costPerUnit)}
            </div>
          </div>
        ) : null}

        {pricingModel === "WEIGHT" ? (
          <div className="mt-2 grid gap-2 md:grid-cols-2 text-sm">
            <div>
              <span className="text-gray-600">Price per kg:</span> {fmtMoney(tp?.pricePerKg)}
            </div>
            <div>
              <span className="text-gray-600">Cost per kg:</span> {fmtMoney(tp?.costPerKg)}
            </div>
          </div>
        ) : null}

        {pricingModel === "VARIANT" ? (
          <div className="mt-3">
            {variants.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-[700px] w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left">
                      <th className="p-2">Variant</th>
                      <th className="p-2">Price</th>
                      <th className="p-2">Cost</th>
                      <th className="p-2">Pack grams</th>
                      <th className="p-2">Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((v) => (
                      <tr key={v.id} className="border-t">
                        <td className="p-2">{v.label}</td>
                        <td className="p-2">{fmtMoney(v.unitPrice)}</td>
                        <td className="p-2">{fmtMoney(v.unitCost)}</td>
                        <td className="p-2">{v.packWeightGrams ?? "—"}</td>
                        <td className="p-2">{v.isActive ? "Yes" : "No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-amber-700 mt-2">
                No variants found yet. Add Small/Medium/Large in the Edit page.
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-lg border bg-white p-3">
          <div className="text-xs text-gray-600">Snapshot</div>
          <div className="mt-1 text-lg font-semibold">{snapshotText}</div>
          <div className="mt-1 text-xs text-gray-600">
            Updated: {fmtDate(summary?.snapshotUpdatedAt)}
          </div>
        </div>

        <div className="rounded-lg border bg-white p-3">
          <div className="text-xs text-gray-600">Ledger</div>
          <div className="mt-1 text-lg font-semibold">{ledgerText}</div>
          <div className="mt-1 text-xs text-gray-600">
            Last movement: {fmtDate(summary?.lastMovementAt)}
          </div>
        </div>

        <div className="rounded-lg border bg-white p-3">
          <div className="text-xs text-gray-600">Diff</div>
          <div className="mt-1 text-lg font-semibold">{diffText}</div>
          <div className="mt-1 text-xs text-gray-600">Model: {pricingModel ?? "—"}</div>
        </div>
      </div>

      <div className="rounded-lg border bg-white overflow-x-auto">
        <div className="p-3 border-b">
          <div className="font-medium">Movements</div>
          <div className="text-xs text-gray-600">
            Showing {movements.length.toLocaleString()} movement(s)
          </div>
        </div>

        <table className="min-w-[1100px] w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="p-3">When</th>
              <th className="p-3">Type</th>
              <th className="p-3">Delta Qty</th>
              <th className="p-3">Delta Grams</th>
              <th className="p-3">Note/Reason</th>
              <th className="p-3">Ref</th>
              <th className="p-3">Id</th>
            </tr>
          </thead>
          <tbody>
            {movements.length ? (
              movements.map((m, idx) => {
                const when = m.createdAt ?? m.at ?? m.timestamp ?? m.occurredAt ?? null;
                const type = m.type ?? m.kind ?? m.reasonType ?? "—";
                const dQty = m.deltaQty ?? m.deltaQuantity ?? m.qtyDelta ?? m.quantityDelta ?? null;
                const dG = m.deltaWeightGrams ?? m.deltaGrams ?? m.weightDeltaGrams ?? null;
                const noteText = m.note ?? m.reason ?? m.memo ?? m.description ?? "—";
                const refType = m.refType ?? m.sourceType ?? null;
                const refId = m.refId ?? m.sourceId ?? null;

                return (
                  <tr key={m.id ?? `${idx}`} className="border-t">
                    <td className="p-3">{fmtDate(when)}</td>
                    <td className="p-3">{String(type)}</td>
                    <td className="p-3">{fmtNumber(dQty)}</td>
                    <td className="p-3">{fmtNumber(dG)}</td>
                    <td className="p-3">{String(noteText)}</td>
                    <td className="p-3">
                      {refType || refId ? (
                        <span className="font-mono text-xs">
                          {String(refType ?? "ref")}:{String(refId ?? "—")}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-3">
                      <span className="font-mono text-xs">{String(m.id ?? "—")}</span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="p-3 text-gray-600" colSpan={7}>
                  No movements found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdjust ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-lg">
            <div className="p-4 border-b flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">Manual adjustment</div>
                <div className="text-xs text-gray-600">
                  This creates a StockMovement entry. Note is required.
                </div>
              </div>
              <button
                className="rounded-md border px-2 py-1 text-sm"
                onClick={() => setShowAdjust(false)}
                disabled={loading}
              >
                Close
              </button>
            </div>

            <div className="p-4 space-y-3">
              <label className="block text-sm">
                <div className="text-gray-600">Note (required)</div>
                <textarea
                  className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Why is this adjustment needed?"
                />
              </label>

              {isWeight ? (
                <label className="block text-sm">
                  <div className="text-gray-600">Delta weight (grams)</div>
                  <input
                    className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                    value={deltaWeightGrams}
                    onChange={(e) => setDeltaWeightGrams(e.target.value)}
                    placeholder="e.g. 250 (positive to add, negative to subtract)"
                  />
                </label>
              ) : (
                <label className="block text-sm">
                  <div className="text-gray-600">Delta quantity (units)</div>
                  <input
                    className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                    value={deltaQty}
                    onChange={(e) => setDeltaQty(e.target.value)}
                    placeholder="e.g. 3 (positive to add, negative to subtract)"
                  />
                </label>
              )}
            </div>

            <div className="p-4 border-t flex items-center justify-end gap-2">
              <button
                className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
                onClick={() => setShowAdjust(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
                onClick={submitAdjustment}
                disabled={loading}
              >
                Create adjustment
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}