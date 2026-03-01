
import Image from 'next/image';

type Catalog = {
  town: { id: string; name: string; slug: string };
  categories: Array<{
    id: string | null;
    name: string;
    slug: string | null;
    products: Array<{
      townProductId: string;
      name: string;
      description: string | null;
      images: Array<{ url: string; alt: string | null; sortOrder: number }>;
    }>;
  }>;
};

export default async function Page() {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!base) throw new Error('Missing NEXT_PUBLIC_API_BASE_URL');

  const res = await fetch(`${base}/catalog?townSlug=harlow`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Catalog fetch failed: ${res.status}`);

  const data = (await res.json()) as Catalog;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Catalog Test — {data.town.name}</h1>

      {data.categories.map((c) => (
        <div key={c.id ?? 'uncat'} className="space-y-3">
          <h2 className="text-lg font-semibold">{c.name}</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {c.products.map((p) => {
              const cover = p.images?.[0]?.url ?? null;

              return (
                <div key={p.townProductId} className="rounded-xl border bg-white overflow-hidden">
                  <div className="relative w-full aspect-[4/3] bg-gray-50">
                    {cover ? (
                      <Image
                        src={cover}
                        alt={p.images?.[0]?.alt ?? p.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 1024px) 50vw, 33vw"
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="p-3">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-gray-600">{p.description ?? '—'}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}