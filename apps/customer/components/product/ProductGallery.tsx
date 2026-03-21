"use client";

import Image from "next/image";
import { useState } from "react";

type ProductImage = {
  url: string;
  alt?: string | null;
  sortOrder?: number;
};

export default function ProductGallery({
  images,
  name,
}: {
  images: ProductImage[];
  name: string;
}) {
  const sorted = [...(images || [])].sort(
    (a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)
  );

  const [active, setActive] = useState(sorted[0]);

  if (!sorted.length) {
    return (
      <div className="aspect-square rounded-xl border bg-slate-50 flex items-center justify-center text-slate-400">
        No image
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* MAIN IMAGE */}
      <div className="relative aspect-square overflow-hidden rounded-xl border bg-white">
        <Image
          src={active.url}
          alt={active.alt ?? name}
          fill
          className="object-contain p-4"
          sizes="(max-width: 768px) 100vw, 600px"
        />
      </div>

      {/* THUMBNAILS */}
      {sorted.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {sorted.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(img)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md border ${
                active.url === img.url
                  ? "border-orange-500"
                  : "border-slate-200"
              }`}
            >
              <Image
                src={img.url}
                alt={img.alt ?? name}
                fill
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
