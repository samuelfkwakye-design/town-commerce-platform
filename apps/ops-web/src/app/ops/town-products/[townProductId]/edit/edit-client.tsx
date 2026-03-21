"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import CloneToTowns from "./clone-to-towns";
import ApplyPricingToTowns from "./apply-pricing-to-towns";

type PricingModel = "UNIT" | "WEIGHT" | "VARIANT";

type CategoryOption = {
  id: string;
  name: string;
  slug: string;
  isActive?: boolean;
  sortOrder?: number;
};

type CategoriesResp = {
  rows: CategoryOption[];
};

type TownProductVariantResp = {
  id: string;
  townProductId: string;
  label: string;
  unitPrice: string;
  unitCost: string | null;
  isActive: boolean;
  sortOrder: number;
  packWeightGrams: number | null;
};

type TownProductResp = {
  id: string;
  townId: string;
  productId: string;
  pricingModel: PricingModel;

  pricePerUnit: string | null;
  pricePerKg: string | null;

  costPerUnit: string | null;
  costPerKg: string | null;

  stockQty: number | null;
  stockWeightGrams: number | null;

  isActive: boolean;

  product?: {
    name: string | null;
    categoryId?: string | null;
    category?: { id: string; name: string; slug: string } | null;
  } | null;

  town?: { name: string | null; slug: string | null } | null;

  variants?: TownProductVariantResp[];
};

type VariantRow = {
  label: string;
  unitPrice: string;
  unitCost: string;
  isActive: boolean;
  sortOrder: string;
  packWeightGrams: string;
};

function asString(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

function toNumberOrNull(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function toIntOrNull(v: string): number | null {
  const n = toNumberOrNull(v);
  if (n === null) return null;
  return Math.trunc(n);
}

function normalizeVariants(input: unknown): VariantRow[] {
  const arr = Array.isArray(input) ? input : [];
  return arr.map((v: any, idx: number) => ({
    label: asString(v.label).trim(),
    unitPrice: asString(v.unitPrice ?? ""),
    unitCost: asString(v.unitCost ?? ""),
    isActive: v.isActive ?? true,
    sortOrder: asString(v.sortOrder ?? idx),
    packWeightGrams: asString(v.packWeightGrams ?? ""),
  }));
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function EditTownProductClient(props: {
  townProductId: string;
  initialTownProduct: TownProductResp;
}) {
  const router = useRouter();
  const { townProductId } = props;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [err, setErr] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const [tp, setTp] = useState<TownProductResp | null>(
    props.initialTownProduct ?? null
  );

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categoryId, setCategoryId] = useState(
    props.initialTownProduct?.product?.categoryId ?? ""
  );

  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategorySlug, setNewCategorySlug] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  const [pricingModel, setPricingModel] = useState<PricingModel>(
    props.initialTownProduct?.pricingModel ?? "UNIT"
  );

  const [pricePerUnit, setPricePerUnit] = useState(
    asString(props.initialTownProduct?.pricePerUnit)
  );
  const [pricePerKg, setPricePerKg] = useState(
    asString(props.initialTownProduct?.pricePerKg)
  );

  const [costPerUnit, setCostPerUnit] = useState(
    asString(props.initialTownProduct?.costPerUnit)
  );
  const [costPerKg, setCostPerKg] = useState(
    asString(props.initialTownProduct?.costPerKg)
  );

  const [stockQty, setStockQty] = useState(
    props.initialTownProduct?.stockQty === null ||
      props.initialTownProduct?.stockQty === undefined
      ? ""
      : String(props.initialTownProduct.stockQty)
  );

  const [stockWeightGrams, setStockWeightGrams] = useState(
    props.initialTownProduct?.stockWeightGrams === null ||
      props.initialTownProduct?.stockWeightGrams === undefined
      ? ""
      : String(props.initialTownProduct.stockWeightGrams)
  );

  const [isActive, setIsActive] = useState(!!props.initialTownProduct?.isActive);

  const [variants, setVariants] = useState<VariantRow[]>(
    normalizeVariants(props.initialTownProduct?.variants ?? [])
  );

  const isVariant = pricingModel === "VARIANT";
  const isUnit = pricingModel === "UNIT";
  const isWeight = pricingModel === "WEIGHT";

  const title = useMemo(() => {
    const name = tp?.product?.name ?? "Town Product";
    return `Edit Town Product — ${name}`;
  }, [tp?.product?.name]);

  const canSave = !loading && !saving;

  function showSaved(message: string) {
    setSavedMsg(message);
    window.setTimeout(() => setSavedMsg(null), 2500);
  }

  function addVariantRow() {
    setVariants((prev) => [
      ...prev,
      {
        label: "",
        unitPrice: "",
        unitCost: "",
        isActive: true,
        sortOrder: String(prev.length),
        packWeightGrams: "",
      },
    ]);
  }

  function removeVariantRow(index: number) {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  }

  function updateVariantRow(index: number, patch: Partial<VariantRow>) {
    setVariants((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...patch } : r))
    );
  }

  function validateVariants(rows: VariantRow[]) {
    const activeRows = rows.filter(
      (r) => r.label.trim() || r.unitPrice.trim() || r.unitCost.trim()
    );
    for (const r of activeRows) {
      if (!r.label.trim()) throw new Error("Variant label is required.");
      const p = toNumberOrNull(r.unitPrice);
      if (p === null) throw new Error(`Unit price is required for "${r.label}".`);
    }
    return activeRows;
  }

  async function loadCategories() {
    setLoadingCategories(true);
    try {
      const resp = await apiFetch<CategoriesResp>(
        `/admin/town-products/meta/categories`,
        { method: "GET" }
      );
      setCategories(resp?.rows ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr((prev) => prev ?? msg);
    } finally {
      setLoadingCategories(false);
    }
  }

  async function loadAll() {
    setLoading(true);
    setErr(null);

    try {
      const data = await apiFetch<TownProductResp>(
        `/admin/town-products/${townProductId}`,
        {
          method: "GET",
        }
      );

      setTp(data);
      setPricingModel(data.pricingModel);

      setPricePerUnit(asString(data.pricePerUnit));
      setPricePerKg(asString(data.pricePerKg));
      setCostPerUnit(asString((data as any).costPerUnit));
      setCostPerKg(asString((data as any).costPerKg));

      setStockQty(
        data.stockQty === null || data.stockQty === undefined
          ? ""
          : String(data.stockQty)
      );
      setStockWeightGrams(
        data.stockWeightGrams === null || data.stockWeightGrams === undefined
          ? ""
          : String(data.stockWeightGrams)
      );

      setIsActive(!!data.isActive);
      setCategoryId(data.product?.categoryId ?? "");

      if (Array.isArray((data as any).variants)) {
        setVariants(normalizeVariants((data as any).variants));
      } else {
        const v = await apiFetch<{ rows: TownProductVariantResp[] }>(
          `/admin/town-products/${townProductId}/variants`,
          { method: "GET" }
        );
        setVariants(normalizeVariants(v?.rows ?? []));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
      setTp(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
    void loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [townProductId]);

  useEffect(() => {
    if (!showNewCategory) return;
    if (!newCategoryName.trim()) return;
    setNewCategorySlug(slugify(newCategoryName));
  }, [newCategoryName, showNewCategory]);

  async function handleCreateCategory() {
    setErr(null);

    const name = newCategoryName.trim();
    const slug = slugify(newCategorySlug || newCategoryName);

    if (!name) {
      setErr("New category name is required");
      return;
    }

    if (!slug) {
      setErr("New category slug is required");
      return;
    }

    try {
      setCreatingCategory(true);

      const created = await apiFetch<CategoryOption>(
        `/admin/town-products/meta/categories`,
        {
          method: "POST",
          body: { name, slug },
        }
      );

      await loadCategories();

      setCategoryId(created.id);
      setShowNewCategory(false);
      setNewCategoryName("");
      setNewCategorySlug("");
      showSaved("Category created ✅");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
    } finally {
      setCreatingCategory(false);
    }
  }

  async function saveVariantsIfNeeded() {
    if (!isVariant) return;

    const cleaned = validateVariants(variants);

    await apiFetch(`/admin/town-products/${townProductId}/variants`, {
      method: "PUT",
      body: {
        variants: cleaned.map((r, idx) => ({
          label: r.label.trim(),
          unitPrice: r.unitPrice.trim(),
          unitCost: r.unitCost.trim() ? r.unitCost.trim() : null,
          isActive: !!r.isActive,
          sortOrder: toIntOrNull(r.sortOrder) ?? idx,
          packWeightGrams: toIntOrNull(r.packWeightGrams),
        })),
      },
    });
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setSavedMsg(null);
    setSaving(true);

    try {
      const payload: Record<string, any> = {
        pricingModel,
        isActive,
        categoryId: categoryId || null,
        stockQty: toIntOrNull(stockQty),
        stockWeightGrams: toIntOrNull(stockWeightGrams),
      };

      if (isUnit) {
        payload.pricePerUnit = toNumberOrNull(pricePerUnit);
        payload.costPerUnit = toNumberOrNull(costPerUnit);
        payload.pricePerKg = null;
        payload.costPerKg = null;
      } else if (isWeight) {
        payload.pricePerKg = toNumberOrNull(pricePerKg);
        payload.costPerKg = toNumberOrNull(costPerKg);
        payload.pricePerUnit = null;
        payload.costPerUnit = null;
      } else if (isVariant) {
        payload.pricePerUnit = null;
        payload.pricePerKg = null;
        payload.costPerUnit = null;
        payload.costPerKg = null;
      }

      await apiFetch(`/admin/town-products/${townProductId}`, {
        method: "PATCH",
        body: payload,
      });

      await saveVariantsIfNeeded();
      await loadAll();
      showSaved("Saved ✅");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
    } finally {
      setSaving(false);
    }
  }

  async function onArchive() {
    const ok = window.confirm(
      "Archive will set this Town Product to inactive.\n\nProceed?"
    );
    if (!ok) return;

    setErr(null);
    setSavedMsg(null);
    setSaving(true);

    try {
      await apiFetch(`/admin/town-products/${townProductId}`, {
        method: "PATCH",
        body: { isActive: false },
      });

      router.push("/ops/town-products");
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading && !tp) {
    return <div className="p-6 text-sm text-gray-600">Loading…</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-gray-500">
            {tp?.town?.name ?? "Town"}
            {tp?.town?.slug ? ` (${tp.town.slug})` : ""} •{" "}
            <span className="font-mono text-xs">{townProductId}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link className="text-sm text-blue-600 hover:underline" href="/ops/town-products">
            ← Back to list
          </Link>

          <CloneToTowns townProductId={townProductId} sourceTownId={tp?.townId} />

          <ApplyPricingToTowns
            townProductId={townProductId}
            sourceTownId={tp?.townId}
          />

          <Link
            className="text-sm text-blue-600 hover:underline"
            href={`/ops/town-products/${townProductId}/images`}
          >
            Manage images →
          </Link>
        </div>
      </div>

      {savedMsg ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          {savedMsg}
        </div>
      ) : null}

      {err ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          {err}
        </div>
      ) : null}

      <form onSubmit={onSave} className="rounded-lg border bg-white p-4 shadow-sm space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm text-gray-600">Pricing model</label>
            <select
              value={pricingModel}
              onChange={(e) => setPricingModel(e.target.value as PricingModel)}
              className="mt-1 w-full border rounded-md px-3 py-2 bg-white"
              disabled={saving}
            >
              <option value="UNIT">UNIT</option>
              <option value="WEIGHT">WEIGHT</option>
              <option value="VARIANT">VARIANT</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              UNIT = one item price • WEIGHT = per kg • VARIANT = sizes/options
            </p>
          </div>

          <div className="flex items-center gap-2 pt-6">
            <input
              id="isActive"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              disabled={saving}
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">
              Active
            </label>
          </div>

          <div className="space-y-2">
            <label className="block text-sm text-gray-600">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1 w-full rounded-md border bg-white px-3 py-2"
              disabled={saving || loadingCategories}
            >
              <option value="">
                {loadingCategories
                  ? "Loading categories..."
                  : "Select a category (optional)"}
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="text-sm text-blue-600 hover:underline"
              onClick={() => setShowNewCategory((s) => !s)}
              disabled={saving}
            >
              {showNewCategory ? "Cancel new category" : "+ Create new category"}
            </button>

            {showNewCategory && (
              <div className="rounded-md border bg-gray-50 p-3 space-y-3">
                <div>
                  <label className="block text-sm text-gray-600">
                    New category name
                  </label>
                  <input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="mt-1 w-full rounded-md border px-3 py-2"
                    placeholder="e.g. Beverages"
                    disabled={saving || creatingCategory}
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600">Slug</label>
                  <input
                    value={newCategorySlug}
                    onChange={(e) => setNewCategorySlug(slugify(e.target.value))}
                    className="mt-1 w-full rounded-md border px-3 py-2"
                    placeholder="e.g. beverages"
                    disabled={saving || creatingCategory}
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    disabled={saving || creatingCategory}
                    className="rounded-md bg-slate-800 px-4 py-2 text-white hover:bg-slate-900 disabled:opacity-50"
                  >
                    {creatingCategory ? "Creating..." : "Create category"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-md border bg-gray-50 p-3">
          <div className="text-sm font-semibold mb-2">Pricing</div>

          {isUnit ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm text-gray-600">Price per unit</label>
                <input
                  inputMode="decimal"
                  value={pricePerUnit}
                  onChange={(e) => setPricePerUnit(e.target.value)}
                  className="mt-1 w-full border rounded-md px-3 py-2"
                  placeholder="e.g. 10"
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Cost per unit (optional)</label>
                <input
                  inputMode="decimal"
                  value={costPerUnit}
                  onChange={(e) => setCostPerUnit(e.target.value)}
                  className="mt-1 w-full border rounded-md px-3 py-2"
                  placeholder="e.g. 7.50"
                  disabled={saving}
                />
              </div>
            </div>
          ) : null}

          {isWeight ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm text-gray-600">Price per kg</label>
                <input
                  inputMode="decimal"
                  value={pricePerKg}
                  onChange={(e) => setPricePerKg(e.target.value)}
                  className="mt-1 w-full border rounded-md px-3 py-2"
                  placeholder="e.g. 20"
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Cost per kg (optional)</label>
                <input
                  inputMode="decimal"
                  value={costPerKg}
                  onChange={(e) => setCostPerKg(e.target.value)}
                  className="mt-1 w-full border rounded-md px-3 py-2"
                  placeholder="e.g. 14"
                  disabled={saving}
                />
              </div>
            </div>
          ) : null}

          {isVariant ? (
            <div className="text-sm text-gray-700">
              Pricing is stored per variant (Small / Medium / Large) below.
            </div>
          ) : null}
        </div>

        {isVariant ? (
          <div className="rounded-md border bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Variants</div>
                <div className="text-xs text-gray-500">Add sizes/options and their prices.</div>
              </div>

              <button
                type="button"
                onClick={addVariantRow}
                className="border rounded-md px-3 py-1 text-sm bg-white hover:bg-gray-50 disabled:opacity-50"
                disabled={saving}
              >
                + Add variant
              </button>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="min-w-[900px] w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left">
                    <th className="p-2">Label</th>
                    <th className="p-2">Unit price</th>
                    <th className="p-2">Unit cost</th>
                    <th className="p-2">Pack grams</th>
                    <th className="p-2">Sort</th>
                    <th className="p-2">Active</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.length ? (
                    variants.map((v, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2">
                          <input
                            value={v.label}
                            onChange={(e) =>
                              updateVariantRow(idx, { label: e.target.value })
                            }
                            className="w-full border rounded-md px-2 py-1"
                            placeholder="e.g. Small"
                            disabled={saving}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            inputMode="decimal"
                            value={v.unitPrice}
                            onChange={(e) =>
                              updateVariantRow(idx, { unitPrice: e.target.value })
                            }
                            className="w-full border rounded-md px-2 py-1"
                            placeholder="e.g. 4.00"
                            disabled={saving}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            inputMode="decimal"
                            value={v.unitCost}
                            onChange={(e) =>
                              updateVariantRow(idx, { unitCost: e.target.value })
                            }
                            className="w-full border rounded-md px-2 py-1"
                            placeholder="optional"
                            disabled={saving}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            inputMode="numeric"
                            value={v.packWeightGrams}
                            onChange={(e) =>
                              updateVariantRow(idx, {
                                packWeightGrams: e.target.value,
                              })
                            }
                            className="w-full border rounded-md px-2 py-1"
                            placeholder="optional"
                            disabled={saving}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            inputMode="numeric"
                            value={v.sortOrder}
                            onChange={(e) =>
                              updateVariantRow(idx, { sortOrder: e.target.value })
                            }
                            className="w-full border rounded-md px-2 py-1"
                            placeholder="0"
                            disabled={saving}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="checkbox"
                            checked={v.isActive}
                            onChange={(e) =>
                              updateVariantRow(idx, { isActive: e.target.checked })
                            }
                            disabled={saving}
                          />
                        </td>
                        <td className="p-2">
                          <button
                            type="button"
                            className="text-red-700 hover:underline disabled:opacity-50"
                            onClick={() => removeVariantRow(idx)}
                            disabled={saving}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="p-3 text-gray-600" colSpan={7}>
                        No variants yet. Click “Add variant”.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <div className="rounded-md border bg-gray-50 p-3">
          <div className="text-sm font-semibold mb-2">Stock</div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm text-gray-600">Stock quantity (units)</label>
              <input
                inputMode="numeric"
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
                className="mt-1 w-full border rounded-md px-3 py-2"
                placeholder="e.g. 5"
                disabled={saving}
              />
              <p className="mt-1 text-xs text-gray-500">
                For UNIT + VARIANT, you typically use Qty.
              </p>
            </div>

            <div>
              <label className="block text-sm text-gray-600">Stock weight (grams)</label>
              <input
                inputMode="numeric"
                value={stockWeightGrams}
                onChange={(e) => setStockWeightGrams(e.target.value)}
                className="mt-1 w-full border rounded-md px-3 py-2"
                placeholder="e.g. 5000"
                disabled={saving}
              />
              <p className="mt-1 text-xs text-gray-500">
                For WEIGHT, use grams (5kg = 5000).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onArchive}
            className="border rounded-md px-4 py-2 bg-white hover:bg-gray-50 text-red-700 disabled:opacity-50"
            disabled={saving}
          >
            Archive (delete)
          </button>

          <button
            type="submit"
            disabled={!canSave}
            className="border rounded-md px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}