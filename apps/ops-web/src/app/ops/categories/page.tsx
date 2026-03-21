"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  isActive?: boolean;
  sortOrder?: number;
  productCount?: number;
};

type CategoriesResp = {
  rows: CategoryRow[];
};

type DeleteResp = {
  success: boolean;
  deletedCategoryId: string;
  deletedCategoryName: string;
  affectedProducts: number;
  message: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function OpsCategoriesPage() {
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingSortId, setSavingSortId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const [sortDrafts, setSortDrafts] = useState<Record<string, string>>({});

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadCategories() {
    setLoading(true);
    setError(null);

    try {
      const resp = await apiFetch<CategoriesResp>(`/admin/town-products/meta/categories`, {
        method: "GET",
      });

      const nextRows = resp?.rows ?? [];
      setRows(nextRows);

      const nextDrafts: Record<string, string> = {};
      for (const row of nextRows) {
        nextDrafts[row.id] = String(row.sortOrder ?? 0);
      }
      setSortDrafts(nextDrafts);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (!name.trim()) {
      setSlug("");
      return;
    }
    setSlug(slugify(name));
  }, [name]);

  const canCreate = useMemo(() => {
    if (saving) return false;
    if (!name.trim()) return false;
    if (!slug.trim()) return false;
    return true;
  }, [saving, name, slug]);

  async function onCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      setSaving(true);

      await apiFetch(`/admin/town-products/meta/categories`, {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          slug: slugify(slug),
        }),
      });

      setName("");
      setSlug("");
      setSuccess("Category created successfully.");
      await loadCategories();
    } catch (e: any) {
      setError(e?.message ?? "Failed to create category");
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteCategory(row: CategoryRow) {
    const ok = window.confirm(
      `Delete category "${row.name}"?\n\nProducts in this category will not be deleted. They will become Uncategorized.`
    );
    if (!ok) return;

    setError(null);
    setSuccess(null);

    try {
      setDeletingId(row.id);

      const resp = await apiFetch<DeleteResp>(
        `/admin/town-products/meta/categories/${row.id}/delete`,
        {
          method: "POST",
        }
      );

      setSuccess(resp.message || "Category deleted.");
      await loadCategories();
    } catch (e: any) {
      setError(e?.message ?? "Failed to delete category");
    } finally {
      setDeletingId(null);
    }
  }

  async function onSaveSortOrder(row: CategoryRow) {
    setError(null);
    setSuccess(null);

    try {
      setSavingSortId(row.id);

      const raw = sortDrafts[row.id] ?? "0";
      const sortOrder = Number(raw);

      if (Number.isNaN(sortOrder)) {
        throw new Error("Sort order must be a valid number");
      }

      await apiFetch(`/admin/town-products/meta/categories/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          sortOrder,
        }),
      });

      setSuccess(`Sort order updated for "${row.name}".`);
      await loadCategories();
    } catch (e: any) {
      setError(e?.message ?? "Failed to update sort order");
    } finally {
      setSavingSortId(null);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Category Management</h1>
          <p className="text-sm text-gray-500">
            Create, order, and delete product categories used across the catalog.
          </p>
        </div>

        <Link
          className="text-sm text-blue-600 hover:underline"
          href="/ops/town-products"
        >
          ← Back to products
        </Link>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {success}
        </div>
      ) : null}

      <form
        onSubmit={onCreateCategory}
        className="space-y-4 rounded-lg border bg-white p-4 shadow-sm"
      >
        <div>
          <h2 className="text-lg font-semibold">Create Category</h2>
          <p className="text-sm text-gray-500">
            Add a new reusable category for products.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm text-gray-600">Category name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2"
              placeholder="e.g. Beverages"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600">Slug</label>
            <input
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              className="mt-1 w-full rounded-md border px-3 py-2"
              placeholder="e.g. beverages"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!canCreate}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create category"}
          </button>
        </div>
      </form>

      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Existing Categories</h2>
          <p className="text-sm text-gray-500">
            Use sort order to control how categories appear across the platform.
            Deleting a category moves its products to Uncategorized.
          </p>
        </div>

        {loading ? (
          <div className="text-sm text-gray-600">Loading categories...</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-gray-600">No categories found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left">
                  <th className="p-3">Name</th>
                  <th className="p-3">Slug</th>
                  <th className="p-3">Products</th>
                  <th className="p-3">Sort Order</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="p-3 font-medium">{row.name}</td>
                    <td className="p-3 text-gray-600">{row.slug}</td>
                    <td className="p-3 text-gray-600">{row.productCount ?? 0}</td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={sortDrafts[row.id] ?? String(row.sortOrder ?? 0)}
                        onChange={(e) =>
                          setSortDrafts((prev) => ({
                            ...prev,
                            [row.id]: e.target.value,
                          }))
                        }
                        className="w-24 rounded-md border px-3 py-2"
                      />
                    </td>
                    <td className="p-3">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                        {row.isActive === false ? "Inactive" : "Active"}
                      </span>
                    </td>
                    <td className="space-x-3 p-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onSaveSortOrder(row)}
                        disabled={savingSortId === row.id}
                        className="text-sm text-blue-600 hover:underline disabled:opacity-50"
                      >
                        {savingSortId === row.id ? "Saving..." : "Save order"}
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteCategory(row)}
                        disabled={deletingId === row.id}
                        className="text-sm text-red-600 hover:underline disabled:opacity-50"
                      >
                        {deletingId === row.id ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}