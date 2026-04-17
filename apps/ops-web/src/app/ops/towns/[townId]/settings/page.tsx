import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getCurrentAdmin } from '@/lib/getCurrentAdmin';

export const dynamic = 'force-dynamic';

type AdminRole =
  | 'GLOBAL_SUPER_ADMIN'
  | 'TOWN_SUPER_ADMIN'
  | 'WAREHOUSE_ADMIN';

type Town = {
  id: string;
  name: string;
  slug: string;
  isActive?: boolean;
};

type TownSettings = {
  deliveryFee?: string;
  serviceFee?: string;
  minimumOrder?: string;
  currency?: string;
};

type CurrentAdmin = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: AdminRole;
  townId: string | null;
  town: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

async function saveTownSettings(formData: FormData) {
  'use server';

  const admin = (await getCurrentAdmin()) as CurrentAdmin;

  if (!admin) {
    redirect('/ops/login');
  }

  if (
    admin.role !== 'GLOBAL_SUPER_ADMIN' &&
    admin.role !== 'TOWN_SUPER_ADMIN'
  ) {
    redirect('/ops/dashboard');
  }

  const requestedTownId = String(formData.get('townId') || '').trim();

  if (!requestedTownId) {
    throw new Error('Town ID is required.');
  }

  const effectiveTownId =
    admin.role === 'GLOBAL_SUPER_ADMIN'
      ? requestedTownId
      : admin.townId ?? '';

  if (!effectiveTownId) {
    throw new Error('Your admin account is not linked to a town.');
  }

  if (
    admin.role === 'TOWN_SUPER_ADMIN' &&
    effectiveTownId !== requestedTownId
  ) {
    throw new Error('You are not allowed to update another town’s settings.');
  }

  const deliveryFee = String(formData.get('deliveryFee') || '0');
  const serviceFee = String(formData.get('serviceFee') || '0');
  const minimumOrder = String(formData.get('minimumOrder') || '0');
  const currency = String(formData.get('currency') || 'GHS');

  await apiFetch(`/admin/town-settings/${encodeURIComponent(effectiveTownId)}`, {
    method: 'POST',
    body: JSON.stringify({
      deliveryFee,
      serviceFee,
      minimumOrder,
      currency,
    }),
  });

  revalidatePath(`/ops/towns/${effectiveTownId}/settings`);
  redirect(`/ops/towns/${effectiveTownId}/settings?saved=1`);
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ townId: string }>;
  searchParams?: Promise<{ saved?: string }>;
}) {
  const admin = (await getCurrentAdmin()) as CurrentAdmin;

  if (!admin) {
    redirect('/ops/login');
  }

  if (
    admin.role !== 'GLOBAL_SUPER_ADMIN' &&
    admin.role !== 'TOWN_SUPER_ADMIN'
  ) {
    redirect('/ops/dashboard');
  }

  const { townId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const saved = resolvedSearchParams?.saved === '1';

  const effectiveTownId =
    admin.role === 'GLOBAL_SUPER_ADMIN'
      ? townId
      : admin.townId ?? '';

  if (!effectiveTownId) {
    throw new Error('Your admin account is not linked to a town.');
  }

  if (
    admin.role === 'TOWN_SUPER_ADMIN' &&
    effectiveTownId !== townId
  ) {
    redirect(`/ops/towns/${effectiveTownId}/settings`);
  }

  const towns = await apiFetch<Town[]>('/towns');
  const town = towns.find((t) => t.id === effectiveTownId);

  if (!town) {
    throw new Error(`Town not found for id: ${effectiveTownId}`);
  }

  let settings: TownSettings | null = null;

  try {
    settings = await apiFetch<TownSettings>(
      `/admin/town-settings/${encodeURIComponent(effectiveTownId)}`
    );
  } catch {
    settings = null;
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Town Settings</h1>
          <p className="text-sm text-gray-500">
            Configure checkout fees for {town.name}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Role: <span className="font-medium">{admin.role}</span>
            {admin.role === 'TOWN_SUPER_ADMIN' && admin.town ? (
              <>
                {' '}
                · Town locked to{' '}
                <span className="font-medium">{admin.town.name}</span>
              </>
            ) : null}
          </p>
        </div>

        <Link href="/ops/towns" className="text-sm text-blue-600 underline">
          Back
        </Link>
      </div>

      {saved ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Settings saved successfully.
        </div>
      ) : null}

      <form action={saveTownSettings} className="space-y-4 rounded-xl border bg-white p-6">
        <input type="hidden" name="townId" value={effectiveTownId} />

        <div>
          <label className="mb-1 block text-sm font-medium">Delivery Fee</label>
          <input
            name="deliveryFee"
            type="number"
            step="0.01"
            defaultValue={settings?.deliveryFee ?? '0'}
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Service Fee</label>
          <input
            name="serviceFee"
            type="number"
            step="0.01"
            defaultValue={settings?.serviceFee ?? '0'}
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Minimum Order</label>
          <input
            name="minimumOrder"
            type="number"
            step="0.01"
            defaultValue={settings?.minimumOrder ?? '0'}
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Currency</label>
          <input
            name="currency"
            type="text"
            defaultValue={settings?.currency ?? 'GHS'}
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <button type="submit" className="rounded bg-black px-4 py-2 text-white">
          Save Settings
        </button>
      </form>
    </main>
  );
}