import Link from 'next/link';
import ImagesClient from './images-client';
import RequireAdminRole from '@/components/RequireAdminRole';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ townProductId: string }>;
};

export default async function TownProductImagesPage({ params }: Props) {
  const { townProductId } = await params;

  return (
    <RequireAdminRole
      allowedRoles={['GLOBAL_SUPER_ADMIN', 'TOWN_SUPER_ADMIN']}
      requireTownScope={false}
    >
      <div className="space-y-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm text-slate-500">
              <Link className="underline" href="/ops/town-products">
                Town products
              </Link>{' '}
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
    </RequireAdminRole>
  );
}