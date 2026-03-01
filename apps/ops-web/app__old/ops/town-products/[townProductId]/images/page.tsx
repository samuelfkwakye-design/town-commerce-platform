import Link from "next/link";
import ImagesClient from "./images-client";

export default async function TownProductImagesPage({
  params,
}: {
  params: Promise<{ townProductId: string }>;
}) {
  const { townProductId } = await params;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-slate-500">
            <Link className="underline" href="/ops/town-products">
              Town products
            </Link>{" "}
            / Images
          </div>
          <h1 className="text-2xl font-bold">Product images</h1>
          <div className="mt-1 text-sm text-slate-600">
            TownProductId: <span className="font-mono">{townProductId}</span>
          </div>
        </div>

        <Link
          href="/ops/town-products"
          className="rounded-xl border px-4 py-2 text-sm hover:bg-slate-50"
        >
          Back
        </Link>
      </div>

      <ImagesClient townProductId={townProductId} />
    </div>
  );
}
