"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";

type TownRow = {
  id: string;
  name: string;
  slug: string;
};

type TownsResponse = {
  rows: TownRow[];
};

type CreateTownResponse = {
  town: {
    id: string;
    name: string;
    slug: string;
  };
  catalogClone: null | {
    summary?: {
      found: number;
      created: number;
      skipped: number;
    };
  };
};

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function NewTownClient() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const [cloneEnabled, setCloneEnabled] = useState(false);
  const [cloneFromTownId, setCloneFromTownId] = useState("");
  const [copyVariants, setCopyVariants] = useState(true);
  const [copyImages, setCopyImages] = useState(false);
  const [copyStock, setCopyStock] = useState(false);

  const [towns, setTowns] = useState<TownRow[]>([]);
  const [loadingTowns, setLoadingTowns] = useState(false);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const suggestedSlug = useMemo(() => slugify(name), [name]);

  useEffect(() => {
    async function loadTowns() {
      setLoadingTowns(true);
      try {
        const data = await apiFetch<TownsResponse>("/admin/towns", {
          method: "GET",
        });
        const rows = data?.rows ?? [];
        setTowns(rows);
        if (!cloneFromTownId && rows.length) {
          setCloneFromTownId(rows[0].id);
        }
      } catch {
        // do not block the page if towns fail to load
      } finally {
        setLoadingTowns(false);
      }
    }

    void loadTowns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setSaving(true);

    try {
      const payload = {
        name: name.trim(),
        slug: (slug.trim() || suggestedSlug).toLowerCase(),
        cloneFromTownId: cloneEnabled ? cloneFromTownId : null,
        copyVariants,
        copyImages,
        copyStock,
      };

      await apiFetch<CreateTownResponse>("/admin/towns", {
        method: "POST",
        body: payload,
      });

      router.push("/ops/towns");
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
      setSaving(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">New Town</h1>
          <p className="text-sm text-gray-500">
            Create a new town for product listings and customer storefronts.
          </p>
        </div>

        <Link className="text-sm text-blue-600 hover:underline" href="/ops/towns">
          ← Back to towns
        </Link>
      </div>

      {err ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          {err}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="max-w-2xl space-y-5 rounded-lg border bg-white p-5 shadow-sm">
        <div>
          <label className="block text-sm text-gray-600">Town name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2"
            placeholder="e.g. Kumasi"
            disabled={saving}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600">Slug</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2"
            placeholder={suggestedSlug || "e.g. kumasi"}
            disabled={saving}
          />
          <p className="mt-1 text-xs text-gray-500">
            Leave blank to auto-generate from the name. Suggested:{" "}
            <span className="font-medium">{suggestedSlug || "—"}</span>
          </p>
        </div>

        <div className="rounded-md border bg-gray-50 p-4 space-y-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={cloneEnabled}
              onChange={(e) => setCloneEnabled(e.target.checked)}
              disabled={saving}
            />
            Clone catalog from an existing town
          </label>

          {cloneEnabled ? (
            <>
              <div>
                <label className="block text-sm text-gray-600">Source town</label>
                <select
                  value={cloneFromTownId}
                  onChange={(e) => setCloneFromTownId(e.target.value)}
                  className="mt-1 w-full rounded-md border px-3 py-2 bg-white"
                  disabled={saving || loadingTowns}
                >
                  <option value="">Select source town</option>
                  {towns.map((town) => (
                    <option key={town.id} value={town.id}>
                      {town.name} ({town.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Clone options</div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={copyVariants}
                    onChange={(e) => setCopyVariants(e.target.checked)}
                    disabled={saving}
                  />
                  Copy variants
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={copyImages}
                    onChange={(e) => setCopyImages(e.target.checked)}
                    disabled={saving}
                  />
                  Copy images
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={copyStock}
                    onChange={(e) => setCopyStock(e.target.checked)}
                    disabled={saving}
                  />
                  Copy stock snapshot
                </label>
              </div>
            </>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link
            href="/ops/towns"
            className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={saving || !name.trim() || (cloneEnabled && !cloneFromTownId)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create town"}
          </button>
        </div>
      </form>
    </div>
  );
}