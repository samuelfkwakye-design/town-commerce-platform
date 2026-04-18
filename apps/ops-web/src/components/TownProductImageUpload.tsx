
'use client';

import { useState } from 'react';
import { uploadTownProductImages } from '@/lib/cloudinary';

export function TownProductImageUpload({ townProductId }: { townProductId: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    setBusy(true);
    setMsg(null);

    try {
      const res = await uploadTownProductImages({ townProductId, files });
      setMsg(`Uploaded. Created: ${res.created}. Total images: ${res.images.length}`);
    } catch (err: any) {
      setMsg(err?.message ?? 'Upload failed');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  return (
    <div className="flex items-center gap-3">
      <label
        className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer ${
          busy ? 'opacity-60 pointer-events-none' : ''
        }`}
      >
        <span>{busy ? 'Uploading…' : 'Upload image'}</span>
        <input type="file" accept="image/*" className="hidden" onChange={onPick} />
      </label>

      {msg ? <span className="text-sm opacity-80">{msg}</span> : null}
    </div>
  );
}