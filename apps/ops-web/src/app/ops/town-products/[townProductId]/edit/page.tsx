import { apiFetch } from '@/lib/api';
import EditClient from './edit-client';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ townProductId: string }>;
};

export default async function EditPage({ params }: Props) {
  const { townProductId } = await params;

  if (!townProductId) {
    return (
      <div className="p-6 text-sm text-red-700">
        Missing townProductId in route params.
      </div>
    );
  }

  try {
    const data = await apiFetch<any>(`/admin/town-products/${townProductId}`, {
      method: 'GET',
    });

    return <EditClient townProductId={townProductId} initialTownProduct={data} />;
  } catch (e: any) {
    return (
      <div className="space-y-2 p-6">
        <div className="text-sm font-medium text-red-700">Town Product not found.</div>
        <div className="text-xs text-gray-600">
          ID: <span className="font-mono">{townProductId}</span>
        </div>
        <div className="text-xs text-gray-600">
          {e?.message ? `Error: ${e.message}` : 'Could not load this product.'}
        </div>
      </div>
    );
  }
}