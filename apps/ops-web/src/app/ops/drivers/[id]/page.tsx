import Link from 'next/link';
import { apiFetch } from '@/lib/api';

type Town = {
  id: string;
  name: string;
  slug: string;
};

type Driver = {
  id: string;
  name: string;
  phone: string;
  availability: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  priority: number;
  isActive: boolean;
  lastAssignedAt?: string | null;
  town?: Town;
};

type DriverOrder = {
  id: string;
  status: string;
  total?: string | number | null;
  createdAt?: string | null;
  town?: Town;
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatMoney(value?: string | number | null) {
  if (value === null || value === undefined) return '—';
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export default async function DriverDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [driver, orders] = await Promise.all([
    apiFetch<Driver>(`/admin/drivers/${id}`, {
      method: 'GET',
    }),
    apiFetch<DriverOrder[]>(`/admin/drivers/${id}/orders`, {
      method: 'GET',
    }),
  ]);

  return (
    <div className="p-6">
      <div className="mb-4">
        <Link
          href="/ops/drivers"
          className="text-sm text-blue-700 hover:underline"
        >
          ← Back to Drivers
        </Link>
      </div>

      <h1 className="mb-6 text-2xl font-semibold">{driver.name}</h1>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="rounded border bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase text-gray-500">
            Driver Details
          </h2>

          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Name:</span> {driver.name}
            </div>
            <div>
              <span className="font-medium">Phone:</span> {driver.phone}
            </div>
            <div>
              <span className="font-medium">Availability:</span>{' '}
              {driver.availability}
            </div>
            <div>
              <span className="font-medium">Priority:</span> {driver.priority}
            </div>
            <div>
              <span className="font-medium">Active:</span>{' '}
              {driver.isActive ? 'Yes' : 'No'}
            </div>
            <div>
              <span className="font-medium">Last assigned:</span>{' '}
              {formatDate(driver.lastAssignedAt)}
            </div>
          </div>
        </div>

        <div className="rounded border bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase text-gray-500">
            Town
          </h2>

          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Town:</span>{' '}
              {driver.town?.name ?? '—'}
            </div>
            <div>
              <span className="font-medium">Slug:</span>{' '}
              {driver.town?.slug ?? '—'}
            </div>
            <div>
              <span className="font-medium">Town ID:</span>{' '}
              {driver.town?.id ?? '—'}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded border bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Assigned Orders</h2>
          <div className="text-sm text-gray-500">
            {orders.length} order{orders.length === 1 ? '' : 's'}
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="text-sm text-gray-500">
            No orders have been assigned to this driver yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="pb-2">Order</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Total</th>
                <th className="pb-2">Town</th>
                <th className="pb-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t">
                  <td className="py-2">
                    <Link
                      href={`/ops/orders/${order.id}`}
                      className="font-medium text-blue-700 hover:underline"
                    >
                      {order.id}
                    </Link>
                  </td>
                  <td className="py-2">{order.status}</td>
                  <td className="py-2">{formatMoney(order.total)}</td>
                  <td className="py-2">{order.town?.name ?? '—'}</td>
                  <td className="py-2">{formatDate(order.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}