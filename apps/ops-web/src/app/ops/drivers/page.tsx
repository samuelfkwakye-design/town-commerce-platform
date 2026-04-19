'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';

type AdminRole =
  | 'GLOBAL_SUPER_ADMIN'
  | 'TOWN_SUPER_ADMIN'
  | 'WAREHOUSE_ADMIN';

type CurrentAdmin = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: AdminRole;
  townId?: string | null;
};

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

type DriversResponse = Driver[] | { items?: Driver[] };

function extractDrivers(payload: DriversResponse): Driver[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Never';

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
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

export default function DriversPage() {
  const [currentAdmin, setCurrentAdmin] = useState<CurrentAdmin | null>(null);
  const [towns, setTowns] = useState<Town[]>([]);
  const [selectedTown, setSelectedTown] = useState('');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(true);
  const [loadingTowns, setLoadingTowns] = useState(true);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [newDriver, setNewDriver] = useState({
    name: '',
    phone: '',
    priority: 100,
  });

  const isGlobalAdmin = currentAdmin?.role === 'GLOBAL_SUPER_ADMIN';
  const isTownScopedAdmin =
    currentAdmin?.role === 'TOWN_SUPER_ADMIN' ||
    currentAdmin?.role === 'WAREHOUSE_ADMIN';

  const canCreateDriver =
    currentAdmin?.role === 'GLOBAL_SUPER_ADMIN' ||
    currentAdmin?.role === 'TOWN_SUPER_ADMIN';

  const canEditDriverStatus =
    currentAdmin?.role === 'GLOBAL_SUPER_ADMIN' ||
    currentAdmin?.role === 'TOWN_SUPER_ADMIN' ||
    currentAdmin?.role === 'WAREHOUSE_ADMIN';

  const selectedTownName = useMemo(() => {
    return towns.find((town) => town.id === selectedTown)?.name ?? 'Selected town';
  }, [towns, selectedTown]);

  async function loadCurrentAdmin() {
    setLoadingAdmin(true);
    try {
      const res = await apiFetch<CurrentAdmin>('/admin-auth/me', { auth: true });
      setCurrentAdmin(res || null);

      if (res?.townId) {
        setSelectedTown(res.townId);
      }
    } catch (error) {
      console.error('Failed to load current admin', error);
      setErrorMessage('Failed to load admin session.');
      setCurrentAdmin(null);
    } finally {
      setLoadingAdmin(false);
    }
  }

  async function loadTowns(admin?: CurrentAdmin | null) {
    setLoadingTowns(true);
    try {
      const res = await apiFetch<Town[]>('/towns');
      const nextTowns = Array.isArray(res) ? res : [];
      setTowns(nextTowns);

      if (admin?.townId) {
        setSelectedTown(admin.townId);
        return;
      }

      if (!selectedTown && nextTowns.length > 0) {
        setSelectedTown(nextTowns[0].id);
      }
    } catch (error) {
      console.error('Failed to load towns', error);
      setErrorMessage('Failed to load towns.');
      setTowns([]);
    } finally {
      setLoadingTowns(false);
    }
  }

  async function loadDrivers(townId?: string) {
    if (!townId) {
      setDrivers([]);
      return;
    }

    setLoadingDrivers(true);
    setErrorMessage('');

    try {
      const res = await apiFetch<DriversResponse>(`/admin/drivers?townId=${townId}`, {
  auth: true,
});
      setDrivers(extractDrivers(res));
    } catch (error) {
      console.error('Failed to load drivers', error);
      setDrivers([]);
      setErrorMessage('Failed to load drivers.');
    } finally {
      setLoadingDrivers(false);
    }
  }

  async function createDriver() {
    setSuccessMessage('');
    setErrorMessage('');

    if (!canCreateDriver) {
      setErrorMessage('You do not have permission to create drivers.');
      return;
    }

    if (!selectedTown || !newDriver.name.trim() || !newDriver.phone.trim()) {
      setErrorMessage('Please select a town and enter driver name and phone.');
      return;
    }

    setSubmitting(true);

    try {
      await apiFetch('/admin/drivers', {
  method: 'POST',
  auth: true,
  body: {
    townId: selectedTown,
    name: newDriver.name.trim(),
    phone: newDriver.phone.trim(),
    priority: Number(newDriver.priority) || 100,
    availability: 'AVAILABLE',
  },
});

      setNewDriver({
        name: '',
        phone: '',
        priority: 100,
      });

      await loadDrivers(selectedTown);
      setSuccessMessage('Driver added successfully.');
    } catch (error) {
      console.error('Failed to create driver', error);
      setErrorMessage('Failed to add driver. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function setAvailability(id: string, availability: Driver['availability']) {
    setSuccessMessage('');
    setErrorMessage('');

    if (!canEditDriverStatus) {
      setErrorMessage('You do not have permission to update driver availability.');
      return;
    }

    try {
      await apiFetch(`/admin/drivers/${id}/availability`, {
  method: 'PATCH',
  auth: true,
  body: { availability },
});
      await loadDrivers(selectedTown);
      setSuccessMessage(`Driver marked ${availability.toLowerCase()}.`);
    } catch (error) {
      console.error('Failed to update availability', error);
      setErrorMessage('Failed to update driver availability.');
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    setSuccessMessage('');
    setErrorMessage('');

    if (!canEditDriverStatus) {
      setErrorMessage('You do not have permission to update driver status.');
      return;
    }

    try {
      await apiFetch(`/admin/drivers/${id}/active`, {
  method: 'PATCH',
  auth: true,
  body: { isActive },
});

      await loadDrivers(selectedTown);
      setSuccessMessage(
        isActive ? 'Driver activated successfully.' : 'Driver deactivated successfully.',
      );
    } catch (error) {
      console.error('Failed to update driver active status', error);
      setErrorMessage('Failed to update driver active status.');
    }
  }

  useEffect(() => {
    async function bootstrap() {
      setSuccessMessage('');
      setErrorMessage('');

      try {
        const admin = await apiFetch<CurrentAdmin>('/admin-auth/me', { auth: true });
        setCurrentAdmin(admin || null);

        const townsRes = await apiFetch<Town[]>('/towns');
        const nextTowns = Array.isArray(townsRes) ? townsRes : [];
        setTowns(nextTowns);

        if (admin?.townId) {
          setSelectedTown(admin.townId);
        } else if (nextTowns.length > 0) {
          setSelectedTown(nextTowns[0].id);
        }
      } catch (error) {
        console.error('Failed to bootstrap drivers page', error);
        setErrorMessage('Failed to load drivers page.');
      } finally {
        setLoadingAdmin(false);
        setLoadingTowns(false);
      }
    }

    bootstrap();
  }, []);

  useEffect(() => {
    if (selectedTown) {
      loadDrivers(selectedTown);
    }
  }, [selectedTown]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Drivers</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage delivery drivers, availability, priority, and active status.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
          <div className="text-slate-500">Signed in as</div>
          <div className="font-medium text-slate-900">
            {loadingAdmin ? 'Loading...' : currentAdmin?.role ?? 'Unknown role'}
          </div>
        </div>
      </div>

      {successMessage ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[320px,minmax(0,1fr)]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Town scope</h2>
            <p className="mt-1 text-sm text-slate-600">
              Global admins can switch towns. Town-scoped roles stay within their assigned town.
            </p>

            <div className="mt-4 space-y-2">
              <label className="block text-sm font-medium text-slate-700">Town</label>
              <select
                value={selectedTown}
                onChange={(e) => setSelectedTown(e.target.value)}
                disabled={loadingTowns || isTownScopedAdmin}
                className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
              >
                {towns.length === 0 ? (
                  <option value="">No towns found</option>
                ) : (
                  towns.map((town) => (
                    <option key={town.id} value={town.id}>
                      {town.name}
                    </option>
                  ))
                )}
              </select>

              {isTownScopedAdmin && currentAdmin?.townId ? (
                <p className="text-xs text-slate-500">
                  Your account is restricted to one town.
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Add driver</h2>
            <p className="mt-1 text-sm text-slate-600">
              Create a new driver for {selectedTownName}.
            </p>

            {!canCreateDriver ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Your role does not allow creating drivers.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
                  <input
                    value={newDriver.name}
                    onChange={(e) =>
                      setNewDriver((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="Driver full name"
                    className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
                  <input
                    value={newDriver.phone}
                    onChange={(e) =>
                      setNewDriver((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    placeholder="Driver phone number"
                    className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Priority
                  </label>
                  <input
                    type="number"
                    value={newDriver.priority}
                    onChange={(e) =>
                      setNewDriver((prev) => ({
                        ...prev,
                        priority: Number(e.target.value),
                      }))
                    }
                    placeholder="100"
                    className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Lower numbers can be treated as higher priority later in auto-assignment.
                  </p>
                </div>

                <button
                  onClick={createDriver}
                  disabled={submitting || !selectedTown}
                  className="w-full rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {submitting ? 'Adding driver...' : 'Add driver'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Driver list</h2>
              <p className="text-sm text-slate-600">
                {selectedTown ? `Showing drivers for ${selectedTownName}.` : 'Select a town.'}
              </p>
            </div>

            <div className="text-sm text-slate-500">
              {loadingDrivers ? 'Loading drivers...' : `${drivers.length} driver(s)`}
            </div>
          </div>

          {loadingDrivers ? (
            <div className="px-5 py-10 text-sm text-slate-500">Loading drivers...</div>
          ) : drivers.length === 0 ? (
            <div className="px-5 py-10 text-sm text-slate-500">
              No drivers found for this town yet.
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-5 py-3 font-medium">Name</th>
                      <th className="px-5 py-3 font-medium">Phone</th>
                      <th className="px-5 py-3 font-medium">Town</th>
                      <th className="px-5 py-3 font-medium">Availability</th>
                      <th className="px-5 py-3 font-medium">Priority</th>
                      <th className="px-5 py-3 font-medium">Last assigned</th>
                      <th className="px-5 py-3 font-medium">Active</th>
                      <th className="px-5 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drivers.map((driver) => (
                      <tr key={driver.id} className="border-t border-slate-100 align-top">
                        <td className="px-5 py-4">
                          <Link
                            href={`/ops/drivers/${driver.id}`}
                            className="font-medium text-blue-700 hover:underline"
                          >
                            {driver.name}
                          </Link>
                        </td>
                        <td className="px-5 py-4 text-slate-700">{driver.phone}</td>
                        <td className="px-5 py-4 text-slate-700">
                          {driver.town?.name ?? selectedTownName}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${availabilityBadgeClass(
                              driver.availability,
                            )}`}
                          >
                            {driver.availability}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-700">{driver.priority}</td>
                        <td className="px-5 py-4 text-slate-700">
                          {formatDateTime(driver.lastAssignedAt)}
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          {driver.isActive ? 'Yes' : 'No'}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => setAvailability(driver.id, 'AVAILABLE')}
                              className="rounded-xl border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
                            >
                              Available
                            </button>
                            <button
                              onClick={() => setAvailability(driver.id, 'BUSY')}
                              className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
                            >
                              Busy
                            </button>
                            <button
                              onClick={() => setAvailability(driver.id, 'OFFLINE')}
                              className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                            >
                              Offline
                            </button>
                            <button
                              onClick={() => toggleActive(driver.id, !driver.isActive)}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              {driver.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-4 p-4 lg:hidden">
                {drivers.map((driver) => (
                  <div
                    key={driver.id}
                    className="rounded-2xl border border-slate-200 p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link
                          href={`/ops/drivers/${driver.id}`}
                          className="text-base font-semibold text-blue-700 hover:underline"
                        >
                          {driver.name}
                        </Link>
                        <div className="mt-1 text-sm text-slate-600">{driver.phone}</div>
                      </div>

                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${availabilityBadgeClass(
                          driver.availability,
                        )}`}
                      >
                        {driver.availability}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-slate-500">Town</div>
                        <div className="font-medium text-slate-900">
                          {driver.town?.name ?? selectedTownName}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500">Priority</div>
                        <div className="font-medium text-slate-900">{driver.priority}</div>
                      </div>
                      <div>
                        <div className="text-slate-500">Active</div>
                        <div className="font-medium text-slate-900">
                          {driver.isActive ? 'Yes' : 'No'}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500">Last assigned</div>
                        <div className="font-medium text-slate-900">
                          {formatDateTime(driver.lastAssignedAt)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => setAvailability(driver.id, 'AVAILABLE')}
                        className="rounded-xl border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
                      >
                        Available
                      </button>
                      <button
                        onClick={() => setAvailability(driver.id, 'BUSY')}
                        className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
                      >
                        Busy
                      </button>
                      <button
                        onClick={() => setAvailability(driver.id, 'OFFLINE')}
                        className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                      >
                        Offline
                      </button>
                      <button
                        onClick={() => toggleActive(driver.id, !driver.isActive)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        {driver.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}