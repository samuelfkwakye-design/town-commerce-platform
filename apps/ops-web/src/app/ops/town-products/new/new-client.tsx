'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
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

type TownOption = { id: string; name: string; slug: string };
type CategoryOption = {
  id: string;
  name: string;
  slug: string;
  isActive?: boolean;
  sortOrder?: number;
};

type TownsResp = { rows: TownOption[] };
type CategoriesResp = { rows: CategoryOption[] };
type CreateResp = { id: string };

type PricingModel = 'UNIT' | 'WEIGHT' | 'VARIANT' | 'FIXED';

type VariantRow = {
  name: string;
  price: string;
  isActive: boolean;
};

function toNumberOrNull(v: string): number | null {
  const trimmed = v.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function extractCreatedCategory(payload: any): CategoryOption | null {
  if (!payload) return null;

  if (payload.id && payload.name) return payload as CategoryOption;
  if (payload.row?.id && payload.row?.name) return payload.row as CategoryOption;
  if (payload.data?.id && payload.data?.name) return payload.data as CategoryOption;

  return null;
}

export default function NewTownProductClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentAdmin, setCurrentAdmin] = useState<CurrentAdmin | null>(null);
  const [adminLoading, setAdminLoading] = useState(true);

  const [towns, setTowns] = useState<TownOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loadingTowns, setLoadingTowns] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [townId, setTownId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [pricingModel, setPricingModel] = useState<PricingModel>('UNIT');

  const [pricePerUnit, setPricePerUnit] = useState('');
  const [pricePerKg, setPricePerKg] = useState('');
  const [basePrice, setBasePrice] = useState('');

  const [stockQty, setStockQty] = useState('');
  const [stockWeightGrams, setStockWeightGrams] = useState('');

  const [isActive, setIsActive] = useState(true);

  const [variants, setVariants] = useState<VariantRow[]>([
    { name: 'Small', price: '', isActive: true },
    { name: 'Medium', price: '', isActive: true },
    { name: 'Large', price: '', isActive: true },
  ]);

  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategorySlug, setNewCategorySlug] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isGlobalAdmin = currentAdmin?.role === 'GLOBAL_SUPER_ADMIN';
  const isTownScopedAdmin = currentAdmin?.role === 'TOWN_SUPER_ADMIN';

  async function loadCategories() {
    setLoadingCategories(true);
    try {
      const resp = await apiFetch<CategoriesResp>('/admin/town-products/meta/categories', {
        method: 'GET',
      });
      setCategories(resp?.rows ?? []);
    } catch (e: any) {
      setError((prev) => prev ?? e?.message ?? 'Failed to load categories');
    } finally {
      setLoadingCategories(false);
    }
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setAdminLoading(true);
        const admin = await apiFetch<CurrentAdmin>('/admin-auth/me');
        if (!alive) return;
        setCurrentAdmin(admin ?? null);

        const townIdFromUrl = searchParams.get('townId') ?? '';

        if (admin?.role === 'TOWN_SUPER_ADMIN') {
          setTownId(admin.townId ?? '');
        } else if (townIdFromUrl) {
          setTownId(townIdFromUrl);
        }
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? 'Failed to load admin session');
      } finally {
        if (!alive) return;
        setAdminLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [searchParams]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoadingTowns(true);

        const resp = await apiFetch<TownsResp>('/admin/reports/towns', {
          method: 'GET',
        });

        if (!alive) return;

        const rows = resp?.rows ?? [];
        setTowns(rows);

        if (!townId && rows.length > 0 && !isTownScopedAdmin) {
          const townIdFromUrl = searchParams.get('townId') ?? '';
          if (townIdFromUrl && rows.some((t) => t.id === townIdFromUrl)) {
            setTownId(townIdFromUrl);
          }
        }
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? 'Failed to load towns');
      } finally {
        if (!alive) return;
        setLoadingTowns(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [searchParams, townId, isTownScopedAdmin]);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (!showNewCategory) return;
    if (!newCategoryName.trim()) {
      setNewCategorySlug('');
      return;
    }
    setNewCategorySlug(slugify(newCategoryName));
  }, [newCategoryName, showNewCategory]);

  useEffect(() => {
    if (isTownScopedAdmin && currentAdmin?.townId && townId !== currentAdmin.townId) {
      setTownId(currentAdmin.townId);
    }
  }, [isTownScopedAdmin, currentAdmin, townId]);

  const selectedTown = useMemo(
    () => towns.find((t) => t.id === townId) ?? null,
    [towns, townId],
  );

  const canSubmit = useMemo(() => {
    if (submitting) return false;
    if (adminLoading) return false;
    if (!townId) return false;
    if (!productName.trim()) return false;

    if ((pricingModel === 'UNIT' || pricingModel === 'FIXED') && !pricePerUnit.trim()) {
      return false;
    }

    if (pricingModel === 'WEIGHT' && !pricePerKg.trim()) {
      return false;
    }

    if (pricingModel === 'VARIANT') {
      const validVariantCount = variants.filter(
        (v) => v.name.trim() && !isNaN(Number(v.price)),
      ).length;
      if (validVariantCount === 0) return false;
    }

    return true;
  }, [submitting, adminLoading, townId, productName, pricingModel, pricePerUnit, pricePerKg, variants]);

  async function handleCreateCategory() {
    setError(null);

    const name = newCategoryName.trim();
    const slug = slugify(newCategorySlug || newCategoryName);

    if (!name) {
      setError('New category name is required');
      return;
    }

    if (!slug) {
      setError('New category slug is required');
      return;
    }

    try {
      setCreatingCategory(true);

      const createdPayload = await apiFetch<any>('/admin/town-products/meta/categories', {
        method: 'POST',
        body: JSON.stringify({
          name,
          slug,
          isActive: true,
          sortOrder: 0,
        }),
      });

      const createdCategory = extractCreatedCategory(createdPayload);

      await loadCategories();

      if (createdCategory?.id) {
        setCategoryId(createdCategory.id);
      } else {
        const refreshed = await apiFetch<CategoriesResp>('/admin/town-products/meta/categories', {
          method: 'GET',
        });

        const rows = refreshed?.rows ?? [];
        setCategories(rows);

        const matched =
          rows.find((c) => c.slug === slug) ||
          rows.find((c) => c.name.toLowerCase() === name.toLowerCase());

        if (matched?.id) {
          setCategoryId(matched.id);
        }
      }

      setShowNewCategory(false);
      setNewCategoryName('');
      setNewCategorySlug('');
    } catch (e: any) {
      setError(e?.message ?? 'Failed to create category');
    } finally {
      setCreatingCategory(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const effectiveTownId = isTownScopedAdmin ? currentAdmin?.townId ?? '' : townId;

    if (!effectiveTownId) {
      setError('Town is required');
      return;
    }

    const payload: Record<string, any> = {
      townId: effectiveTownId,
      productName: productName.trim(),
      description: description.trim() || null,
      pricingModel,
      isActive,
      categoryId: categoryId || null,
    };

    const ppu = toNumberOrNull(pricePerUnit);
    const ppk = toNumberOrNull(pricePerKg);
    const bp = toNumberOrNull(basePrice);

    const qty = toNumberOrNull(stockQty);
    const grams = toNumberOrNull(stockWeightGrams);

    if (pricingModel === 'UNIT' || pricingModel === 'FIXED') {
      if (ppu === null) {
        setError('Price per unit is required');
        return;
      }
      payload.pricePerUnit = ppu;
    }

    if (pricingModel === 'WEIGHT') {
      if (ppk === null) {
        setError('Price per kg is required');
        return;
      }
      payload.pricePerKg = ppk;
    }

    if (bp !== null) payload.basePrice = bp;
    if (qty !== null) payload.stockQty = Math.trunc(qty);
    if (grams !== null) payload.stockWeightGrams = Math.trunc(grams);

    if (pricingModel === 'VARIANT') {
      const cleaned = variants
        .map((v, i) => ({
          label: v.name.trim(),
          unitPrice: Number(v.price),
          sortOrder: i,
          isActive: v.isActive,
        }))
        .filter((v) => v.label && !isNaN(v.unitPrice));

      if (cleaned.length === 0) {
        setError('At least one valid variant is required');
        return;
      }

      payload.variants = cleaned;
    }

    try {
      setSubmitting(true);

      const created = await apiFetch<CreateResp>('/admin/town-products', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!created?.id) {
        throw new Error('Create succeeded but no id returned.');
      }

      router.push(`/ops/town-products/${created.id}/images`);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to create product');
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">New Town Product</h1>
          <p className="text-sm text-gray-500">
            Create a town listing, assign or create a category, then upload images.
          </p>
          {isTownScopedAdmin ? (
            <p className="mt-1 text-sm text-blue-700">
              Your product creation is restricted to your assigned town.
            </p>
          ) : null}
        </div>

        <Link className="text-sm text-blue-600 hover:underline" href="/ops/town-products">
          ← Back to list
        </Link>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm text-gray-600">Town</label>

            {isTownScopedAdmin ? (
              <input
                value={selectedTown ? `${selectedTown.name} (${selectedTown.slug})` : ''}
                disabled
                className="mt-1 w-full rounded-md border bg-gray-100 px-3 py-2"
              />
            ) : (
              <select
                value={townId}
                onChange={(e) => setTownId(e.target.value)}
                className="mt-1 w-full rounded-md border bg-white px-3 py-2"
                disabled={loadingTowns || adminLoading}
                required
              >
                <option value="">
                  {loadingTowns ? 'Loading towns...' : 'Select a town'}
                </option>
                {towns.map((town) => (
                  <option key={town.id} value={town.id}>
                    {town.name} ({town.slug})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-600">Product name</label>
            <input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-gray-600">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 min-h-[110px] w-full rounded-md border px-3 py-2"
              placeholder="Short product description shown in the customer storefront"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm text-gray-600">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1 w-full rounded-md border bg-white px-3 py-2"
              disabled={loadingCategories}
            >
              <option value="">
                {loadingCategories ? 'Loading categories...' : 'Select a category (optional)'}
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="text-sm text-blue-600 hover:underline"
              onClick={() => setShowNewCategory((s) => !s)}
            >
              {showNewCategory ? 'Cancel new category' : '+ Create new category'}
            </button>

            {showNewCategory ? (
              <div className="space-y-3 rounded-md border bg-gray-50 p-3">
                <div>
                  <label className="block text-sm text-gray-600">New category name</label>
                  <input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="mt-1 w-full rounded-md border px-3 py-2"
                    placeholder="e.g. Foodstuff"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600">Slug</label>
                  <input
                    value={newCategorySlug}
                    onChange={(e) => setNewCategorySlug(slugify(e.target.value))}
                    className="mt-1 w-full rounded-md border px-3 py-2"
                    placeholder="e.g. foodstuff"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    disabled={creatingCategory}
                    className="rounded-md bg-slate-800 px-4 py-2 text-white hover:bg-slate-900 disabled:opacity-50"
                  >
                    {creatingCategory ? 'Creating...' : 'Create category'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div>
            <label className="block text-sm text-gray-600">Pricing model</label>
            <select
              value={pricingModel}
              onChange={(e) => setPricingModel(e.target.value as PricingModel)}
              className="mt-1 w-full rounded-md border bg-white px-3 py-2"
            >
              <option value="UNIT">UNIT</option>
              <option value="WEIGHT">WEIGHT</option>
              <option value="VARIANT">VARIANT</option>
              <option value="FIXED">FIXED</option>
            </select>
          </div>

          {(pricingModel === 'UNIT' || pricingModel === 'FIXED') ? (
            <div>
              <label className="block text-sm text-gray-600">Price per unit</label>
              <input
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(e.target.value)}
                inputMode="decimal"
                className="mt-1 w-full rounded-md border px-3 py-2"
                placeholder="e.g. 25"
              />
            </div>
          ) : null}

          {pricingModel === 'WEIGHT' ? (
            <div>
              <label className="block text-sm text-gray-600">Price per kg</label>
              <input
                value={pricePerKg}
                onChange={(e) => setPricePerKg(e.target.value)}
                inputMode="decimal"
                className="mt-1 w-full rounded-md border px-3 py-2"
                placeholder="e.g. 12.5"
              />
            </div>
          ) : null}

          {pricingModel === 'UNIT' ? (
            <div>
              <label className="block text-sm text-gray-600">Stock quantity</label>
              <input
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
                inputMode="numeric"
                className="mt-1 w-full rounded-md border px-3 py-2"
                placeholder="e.g. 20"
              />
            </div>
          ) : null}

          {pricingModel === 'WEIGHT' ? (
            <div>
              <label className="block text-sm text-gray-600">Stock weight (grams)</label>
              <input
                value={stockWeightGrams}
                onChange={(e) => setStockWeightGrams(e.target.value)}
                inputMode="numeric"
                className="mt-1 w-full rounded-md border px-3 py-2"
                placeholder="e.g. 5000"
              />
            </div>
          ) : null}

          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <label className="text-sm text-gray-700">Active</label>
          </div>
        </div>

        {pricingModel === 'VARIANT' ? (
          <div className="space-y-3 rounded-md border bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Variants</div>
              <button
                type="button"
                className="text-sm text-blue-600 hover:underline"
                onClick={() =>
                  setVariants((rows) => [...rows, { name: '', price: '', isActive: true }])
                }
              >
                + Add variant
              </button>
            </div>

            {variants.map((variant, idx) => (
              <div key={idx} className="grid grid-cols-4 items-center gap-3">
                <input
                  className="rounded-md border px-3 py-2"
                  placeholder="Variant name"
                  value={variant.name}
                  onChange={(e) =>
                    setVariants((rows) =>
                      rows.map((row, i) =>
                        i === idx ? { ...row, name: e.target.value } : row,
                      ),
                    )
                  }
                />

                <input
                  className="rounded-md border px-3 py-2"
                  inputMode="decimal"
                  placeholder="Price"
                  value={variant.price}
                  onChange={(e) =>
                    setVariants((rows) =>
                      rows.map((row, i) =>
                        i === idx ? { ...row, price: e.target.value } : row,
                      ),
                    )
                  }
                />

                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={variant.isActive}
                    onChange={(e) =>
                      setVariants((rows) =>
                        rows.map((row, i) =>
                          i === idx ? { ...row, isActive: e.target.checked } : row,
                        ),
                      )
                    }
                  />
                  Active
                </label>

                <button
                  type="button"
                  className="text-sm text-red-600"
                  onClick={() => setVariants((rows) => rows.filter((_, i) => i !== idx))}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create product'}
          </button>
        </div>
      </form>
    </div>
  );
}