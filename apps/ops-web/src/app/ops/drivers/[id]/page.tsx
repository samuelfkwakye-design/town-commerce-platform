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

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default async function DriverDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const driver = await apiFetch<Driver>(`/admin/drivers/${id}`, {
    method: 'GET',
  });

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

      <div className="grid gap-4 md:grid-cols-2">
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
              <span className="font-medium">Slug:</span> {driver.town?.slug ?? '—'}
            </div>
            <div>
              <span className="font-medium">Town ID:</span>{' '}
              {driver.town?.id ?? '—'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
