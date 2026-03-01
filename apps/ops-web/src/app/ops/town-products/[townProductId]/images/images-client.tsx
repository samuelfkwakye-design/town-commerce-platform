"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

type TownProductImage = {
  id: string;
  townProductId: string;
  url: string;
  alt: string | null;
  sortOrder: number;
  createdAt: string;
};

type CloudinarySignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
};

export default function ImagesClient({ townProductId }: { townProductId: string }) {
  const [images, setImages] = useState<TownProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [uploading, setUploading] = useState(false);

  // ✅ Success feedback
  const [success, setSuccess] = useState<string | null>(null);

  // ✅ Preview
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // ✅ Auto-scroll to uploaded image
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [scrollToId, setScrollToId] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Auto-hide success after 3 seconds
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 3000);
    return () => clearTimeout(t);
  }, [success]);

  // When scrollToId is set, scroll that row into view
  useEffect(() => {
    if (!scrollToId) return;
    const el = rowRefs.current[scrollToId];
    if (!el) return;

    // slight delay so DOM paints updated list
    const t = setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setScrollToId(null);
    }, 100);

    return () => clearTimeout(t);
  }, [scrollToId, images]);

  async function refresh() {
    setError(null);
    setLoading(true);
    try {
      const data = await apiFetch<TownProductImage[]>(
        `/admin/town-products/${townProductId}/images`
      );
      setImages(data ?? []);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [townProductId]);

  const canMoveUp = useMemo(() => new Set(images.slice(1).map((i) => i.id)), [images]);
  const canMoveDown = useMemo(() => new Set(images.slice(0, -1).map((i) => i.id)), [images]);

  async function setPrimary(imageId: string) {
    setBusyId(imageId);
    setError(null);
    try {
      const data = await apiFetch<TownProductImage[]>(
        `/admin/town-product-images/${imageId}/set-primary`,
        { method: "POST" }
      );
      setImages(data ?? []);
      setSuccess("Primary image updated.");
      setScrollToId(imageId);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusyId(null);
    }
  }

  async function remove(imageId: string) {
    if (!window.confirm("Delete this image?")) return;
    setBusyId(imageId);
    setError(null);
    try {
      const data = await apiFetch<TownProductImage[]>(
        `/admin/town-product-images/${imageId}`,
        { method: "DELETE" }
      );
      setImages(data ?? []);
      setSuccess("Image deleted.");
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusyId(null);
    }
  }

  async function reorder(next: TownProductImage[]) {
    setError(null);
    setImages(next);

    try {
      const orderedImageIds = next.map((x) => x.id);
      const data = await apiFetch<TownProductImage[]>(
        `/admin/town-products/${townProductId}/images/reorder`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedImageIds }),
        }
      );
      setImages(data ?? next);
    } catch (e: any) {
      setError(String(e?.message ?? e));
      refresh();
    }
  }

  // ✅ Disable reorder while uploading (guard)
  function moveUp(id: string) {
    if (uploading) return;
    const idx = images.findIndex((x) => x.id === id);
    if (idx <= 0) return;
    const next = images.slice();
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    reorder(next);
  }

  function moveDown(id: string) {
    if (uploading) return;
    const idx = images.findIndex((x) => x.id === id);
    if (idx < 0 || idx >= images.length - 1) return;
    const next = images.slice();
    [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
    reorder(next);
  }

  async function uploadToCloudinaryAndAttach() {
    if (!file) return;
    setUploading(true);
    setError(null);
    setSuccess(null);

    const fileName = file.name;

    try {
      // 1) get signature from API
      const sig = await apiFetch<CloudinarySignature>(
        `/admin/uploads/cloudinary-signature?folder=town-products/${townProductId}`
      );

      // 2) upload directly to Cloudinary
      const uploadUrl = `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`;
      const form = new FormData();
      form.append("file", file);
      form.append("api_key", sig.apiKey);
      form.append("timestamp", String(sig.timestamp));
      form.append("signature", sig.signature);
      form.append("folder", sig.folder);

      const upRes = await fetch(uploadUrl, { method: "POST", body: form });
      if (!upRes.ok) {
        const txt = await upRes.text();
        throw new Error(`Cloudinary upload failed: ${upRes.status} ${txt}`);
      }

      const upJson: any = await upRes.json();
      const secureUrl = upJson?.secure_url ?? upJson?.url;
      if (!secureUrl) throw new Error("Upload succeeded but no secure_url returned");

      // 3) attach URL to TownProductImage
      const updated = await apiFetch<TownProductImage[]>(
        `/admin/town-products/${townProductId}/images`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: secureUrl, alt: alt.trim() || null }),
        }
      );

      const nextImages = updated ?? [];
      setImages(nextImages);

      // ✅ Success badge
      setSuccess(`✅ Image uploaded successfully (${fileName})`);

      // ✅ auto-scroll to the new image
      const newOne = nextImages.find((x) => x.url === secureUrl);
      if (newOne?.id) {
        setScrollToId(newOne.id);
      } else if (nextImages[0]?.id) {
        // fallback: scroll to primary
        setScrollToId(nextImages[0].id);
      }

      // reset inputs
      setFile(null);
      setAlt("");
      setPreviewUrl(null);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setUploading(false);
    }
  }

  const isBusy = uploading || !!busyId;

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          {success}
        </div>
      ) : null}

      <div className="rounded-2xl border bg-white p-4 space-y-3">
        <div className="font-semibold">Upload new image</div>

        {/* ✅ Preview before upload */}
        {previewUrl ? (
          <div className="flex items-center gap-3">
            <div className="h-20 w-20 overflow-hidden rounded-xl border bg-slate-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
            </div>
            <div className="text-xs text-slate-600">
              Preview ready. Add optional alt text then upload.
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-3">
          <input
            type="file"
            accept="image/*"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={uploading}
          />
          <input
            placeholder="Alt text (optional)"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            disabled={uploading}
          />
          <button
            onClick={uploadToCloudinaryAndAttach}
            disabled={!file || uploading}
            className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {/* ✅ Spinner during upload */}
            {uploading ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Uploading...
              </span>
            ) : (
              "Upload & attach"
            )}
          </button>
        </div>

        <div className="text-xs text-slate-500">
          Upload is direct to Cloudinary using a signed request, then attached to this TownProduct.
        </div>
      </div>

      <div className="rounded-2xl border bg-white">
        <div className="flex items-center justify-between p-4">
          <div className="font-semibold">Images</div>
          <button
            onClick={refresh}
            disabled={loading || uploading}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        <div className="border-t p-4">
          {loading ? (
            <div className="text-sm text-slate-600">Loading…</div>
          ) : images.length === 0 ? (
            <div className="text-sm text-slate-600">No images yet.</div>
          ) : (
            <div className="grid gap-3">
              {images.map((img, idx) => {
                const isPrimary = idx === 0;
                const busyRow = busyId === img.id;

                return (
                  <div
                    key={img.id}
                    ref={(el) => {
                      rowRefs.current[img.id] = el;
                    }}
                    className="flex flex-col gap-3 rounded-xl border p-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-16 w-16 overflow-hidden rounded-lg bg-slate-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt={img.alt ?? ""} className="h-full w-full object-cover" />
                      </div>

                      <div>
                        <div className="text-sm font-semibold">
                          {isPrimary ? "Primary" : `Image ${idx + 1}`}
                          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                            sortOrder {img.sortOrder}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-slate-500 break-all">{img.url}</div>
                        {img.alt ? <div className="mt-1 text-xs text-slate-600">Alt: {img.alt}</div> : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => moveUp(img.id)}
                        disabled={!canMoveUp.has(img.id) || busyRow || uploading}
                        className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
                        title={uploading ? "Disabled while uploading" : "Move up"}
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveDown(img.id)}
                        disabled={!canMoveDown.has(img.id) || busyRow || uploading}
                        className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
                        title={uploading ? "Disabled while uploading" : "Move down"}
                      >
                        ↓
                      </button>

                      <button
                        onClick={() => setPrimary(img.id)}
                        disabled={isPrimary || busyRow || uploading}
                        className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
                      >
                        Set primary
                      </button>

                      <button
                        onClick={() => remove(img.id)}
                        disabled={busyRow || uploading}
                        className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 hover:bg-red-100 disabled:opacity-50"
                      >
                        Delete
                      </button>

                      {busyRow ? (
                        <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                          <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
                          Working…
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {isBusy ? (
            <div className="mt-4 text-xs text-slate-500">
              Some actions are temporarily disabled while an operation is in progress.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}