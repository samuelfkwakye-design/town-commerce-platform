type CloudinarySignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
};

export type UploadedImage = {
  url: string;
  sortOrder: number;
  alt: string | null;
};

export async function uploadImagesToCloudinary(files: File[]): Promise<UploadedImage[]> {
  if (!files.length) return [];

  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  const adminKey = process.env.NEXT_PUBLIC_ADMIN_KEY;

  if (!base) throw new Error('Missing NEXT_PUBLIC_API_BASE_URL in .env.local');
  if (!adminKey) throw new Error('Missing NEXT_PUBLIC_ADMIN_KEY in .env.local');

  // 1) Get signature from backend
  const sigRes = await fetch(`${base}/admin/uploads/cloudinary-signature`, {
    headers: { 'x-admin-key': adminKey },
    cache: 'no-store',
  });

  if (!sigRes.ok) {
    const text = await sigRes.text().catch(() => '');
    throw new Error(`Failed to get Cloudinary signature: ${text}`);
  }

  const sig: CloudinarySignature = await sigRes.json();

  // 2) Upload each file directly to Cloudinary
  const uploads = files.map(async (file, idx) => {
    const uploadUrl = `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`;

    const form = new FormData();
    form.append('file', file);
    form.append('api_key', sig.apiKey);
    form.append('timestamp', String(sig.timestamp));
    form.append('signature', sig.signature);
    form.append('folder', sig.folder);

    const res = await fetch(uploadUrl, { method: 'POST', body: form });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Cloudinary upload failed: ${text}`);
    }

    const json: any = await res.json();

    return {
      url: json.secure_url as string,
      sortOrder: idx,
      alt: file.name ?? null,
    };
  });

  return Promise.all(uploads);
}

export async function attachTownProductImages(params: {
  townProductId: string;
  images: { url: string; alt?: string | null; sortOrder?: number }[];
}) {
  const townProductId = (params.townProductId ?? '').trim();
  if (!townProductId) throw new Error('townProductId is required');

  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  const adminKey = process.env.NEXT_PUBLIC_ADMIN_KEY;

  if (!base) throw new Error('Missing NEXT_PUBLIC_API_BASE_URL in .env.local');
  if (!adminKey) throw new Error('Missing NEXT_PUBLIC_ADMIN_KEY in .env.local');

  const images = (params.images ?? [])
    .map((img, idx) => ({
      url: (img.url ?? '').trim(),
      alt: img.alt ?? null,
      sortOrder: img.sortOrder ?? idx,
    }))
    .filter((img) => img.url.length > 0);

  if (!images.length) throw new Error('images must contain at least one valid url');

  const res = await fetch(`${base}/admin/town-products/${townProductId}/images`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': adminKey,
    },
    body: JSON.stringify({ images }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Attach images failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<{
    ok: boolean;
    townProductId: string;
    created: number;
    images: { id: string; url: string; alt: string | null; sortOrder: number }[];
  }>;
}

/**
 * Convenience helper: upload files to Cloudinary, then attach them to a TownProduct in one call.
 */
export async function uploadTownProductImages(params: {
  townProductId: string;
  files: File[];
}) {
  const uploaded = await uploadImagesToCloudinary(params.files);

  return attachTownProductImages({
    townProductId: params.townProductId,
    images: uploaded.map((u) => ({
      url: u.url,
      alt: u.alt ?? null,
      sortOrder: u.sortOrder,
    })),
  });
}