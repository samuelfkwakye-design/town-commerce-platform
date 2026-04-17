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
  town?: Town | null;
};

type DriverOrder = {
  id: string;
  status: string;
  total?: string | number | null;
  createdAt?: string | null;
  town?: Town | null;
};

type OrdersResponse = DriverOrder[] | { items?: DriverOrder[] };

function extractOrders(payload: OrdersResponse): DriverOrder[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

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

function availabilityBadgeClass(availability: Driver['availability']) {
  switch (availability) {
    case 'AVAILABLE':
      return 'bg-green-50 text-green-700 ring-green-200';
    case 'BUSY':
      return 'bg-amber-50 text-amber-700 ring-amber-200';
    case 'OFFLINE':
      return 'bg-slate-100 text-slate-700 ring-slate-200';
    default:
      return 'bg-slate-100 text-slate-700 ring-slate-200';
  }
}

function statusBadgeClass(status: string) {
  const value = status.toUpperCase();

  switch (value) {
    case 'DRAFT':
      return 'bg-slate-100 text-slate-700 ring-slate-200';
    case 'CONFIRMED':
      return 'bg-blue-50 text-blue-700 ring-blue-200';
    case 'FULFILLED':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    case 'SETTLED':
      return 'bg-green-50 text-green-700 ring-green-200';
    case 'PARTIALLY_REFUNDED':
      return 'bg-amber-50 text-amber-700 ring-amber-200';
    case 'REFUNDED':
      return 'bg-rose-50 text-rose-700 ring-rose-200';
    case 'CANCELLED':
      return 'bg-red-50 text-red-700 ring-red-200';
    default:
      return 'bg-slate-100 text-slate-700 ring-slate-200';
  }
}

export default async function DriverDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [driver, ordersResponse] = await Promise.all([
    apiFetch<Driver>(`/admin/drivers/${id}`, {
      method: 'GET',
    }),
    apiFetch<OrdersResponse>(`/admin/drivers/${id}/orders`, {
      method: 'GET',
    }),
  ]);

  const orders = extractOrders(ordersResponse);

  return (
    <div className="space-y-6 p-6">
      <div>
        <Link
          href="/ops/drivers"
          className="inline-flex items-center text-sm font-medium text-blue-700 hover:underline"
        >
          ← Back to Drivers
        </Link>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {driver.name}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Driver details, town assignment, and delivery history.
          </p>
        </div>

        <div
          className={`inline-flex w-fit rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset ${availabilityBadgeClass(
            driver.availability,
          )}`}
        >
          {driver.availability}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-base font-semibold text-slate-900">Driver details</h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-sm text-slate-500">Name</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {driver.name}
              </div>
            </div>

            <div>
              <div className="text-sm text-slate-500">Phone</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {driver.phone}
              </div>
            </div>

            <div>
              <div className="text-sm text-slate-500">Availability</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {driver.availability}
              </div>
            </div>

            <div>
              <div className="text-sm text-slate-500">Priority</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {driver.priority}
              </div>
            </div>

            <div>
              <div className="text-sm text-slate-500">Active</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {driver.isActive ? 'Yes' : 'No'}
              </div>
            </div>

            <div>
              <div className="text-sm text-slate-500">Last assigned</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {formatDate(driver.lastAssignedAt)}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Town</h2>

          <div className="mt-4 space-y-4">
            <div>
              <div className="text-sm text-slate-500">Town name</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {driver.town?.name ?? '—'}
              </div>
            </div>

            <div>
              <div className="text-sm text-slate-500">Town slug</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {driver.town?.slug ?? '—'}
              </div>
            </div>

            <div>
              <div className="text-sm text-slate-500">Town ID</div>
              <div className="mt-1 break-all text-sm font-medium text-slate-900">
                {driver.town?.id ?? '—'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Assigned orders</h2>
            <p className="text-sm text-slate-600">
              Orders linked to this driver.
            </p>
          </div>

          <div className="text-sm text-slate-500">
            {orders.length} order{orders.length === 1 ? '' : 's'}
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="px-5 py-10 text-sm text-slate-500">
            No orders have been assigned to this driver yet.
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-5 py-3 font-medium">Order</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Total</th>
                    <th className="px-5 py-3 font-medium">Town</th>
                    <th className="px-5 py-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-t border-slate-100">
                      <td className="px-5 py-4">
                        <Link
                          href={`/ops/orders/${order.id}`}
                          className="font-medium text-blue-700 hover:underline"
                        >
                          {order.id}
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusBadgeClass(
                            order.status,
                          )}`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {formatMoney(order.total)}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {order.town?.name ?? '—'}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {formatDate(order.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-4 p-4 lg:hidden">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl border border-slate-200 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/ops/orders/${order.id}`}
                        className="text-sm font-semibold text-blue-700 hover:underline"
                      >
                        {order.id}
                      </Link>
                      <div className="mt-1 text-sm text-slate-600">
                        {formatDate(order.createdAt)}
                      </div>
                    </div>

                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusBadgeClass(
                        order.status,
                      )}`}
                    >
                      {order.status}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-slate-500">Total</div>
                      <div className="font-medium text-slate-900">
                        {formatMoney(order.total)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Town</div>
                      <div className="font-medium text-slate-900">
                        {order.town?.name ?? '—'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}