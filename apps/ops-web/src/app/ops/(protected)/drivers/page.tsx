'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';

type AdminRole =
  | 'GLOBAL_SUPER_ADMIN'
  | 'TOWN_SUPER_ADMIN'
  | 'WAREHOUSE_ADMIN';

type Availability = 'AVAILABLE' | 'BUSY' | 'OFFLINE';
type AvailabilityFilter = 'ALL' | Availability;

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
  motorNumber?: string | null;
  idNumber?: string | null;
  availability: Availability;
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

function availabilityBadgeClass(availability: Availability) {
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
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [pendingDeleteDriver, setPendingDeleteDriver] = useState<Driver | null>(
  null,
);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [search, setSearch] = useState('');
  const [availabilityFilter, setAvailabilityFilter] =
    useState<AvailabilityFilter>('ALL');

  const [newDriver, setNewDriver] = useState({
  name: '',
  phone: '',
  motorNumber: '',
  idNumber: '',
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

  const canDeleteDriver = currentAdmin?.role === 'GLOBAL_SUPER_ADMIN';

  const selectedTownName = useMemo(() => {
    return (
      towns.find((town) => town.id === selectedTown)?.name ?? 'Selected town'
    );
  }, [towns, selectedTown]);

  const filteredDrivers = useMemo(() => {
    const term = search.trim().toLowerCase();

    return drivers.filter((driver) => {
      const matchesSearch =
        !term ||
        driver.name.toLowerCase().includes(term) ||
        driver.phone.toLowerCase().includes(term) ||
        driver.town?.name?.toLowerCase().includes(term);

      const matchesAvailability =
        availabilityFilter === 'ALL' ||
        driver.availability === availabilityFilter;

      return matchesSearch && matchesAvailability;
    });
  }, [drivers, search, availabilityFilter]);

  async function loadDrivers(townId?: string) {
    if (!townId) {
      setDrivers([]);
      return;
    }

    setLoadingDrivers(true);
    setErrorMessage('');

    try {
      const res = await apiFetch<DriversResponse>(
        `/admin/drivers?townId=${encodeURIComponent(townId)}`,
        {
          method: 'GET',
          auth: true,
          cache: 'no-store',
        },
      );

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
      const created = await apiFetch<Driver>('/admin/drivers', {
        method: 'POST',
        auth: true,
        body: {
  townId: selectedTown,
  name: newDriver.name.trim(),
  phone: newDriver.phone.trim(),
  motorNumber: newDriver.motorNumber.trim(),
  idNumber: newDriver.idNumber.trim(),
  priority: Number(newDriver.priority) || 100,
  availability: 'AVAILABLE',
},
      });

      setNewDriver({
  name: '',
  phone: '',
  motorNumber: '',
  idNumber: '',
  priority: 100,
});

      setDrivers((prev) => [created, ...prev]);
      setSuccessMessage('Driver added successfully.');
    } catch (error) {
      console.error('Failed to create driver', error);
      const msg = error instanceof Error ? error.message : String(error);
      setErrorMessage(msg || 'Failed to add driver. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function setAvailability(id: string, availability: Availability) {
    setSuccessMessage('');
    setErrorMessage('');

    if (!canEditDriverStatus) {
      setErrorMessage('You do not have permission to update driver availability.');
      return;
    }

    setActionBusyId(`${id}-${availability}`);

    try {
      await apiFetch(`/admin/drivers/${id}/availability`, {
        method: 'PATCH',
        auth: true,
        body: { availability },
      });

      setDrivers((prev) =>
        prev.map((driver) =>
          driver.id === id ? { ...driver, availability } : driver,
        ),
      );

      setSuccessMessage(`Driver marked ${availability.toLowerCase()}.`);
    } catch (error) {
      console.error('Failed to update availability', error);
      setErrorMessage('Failed to update driver availability.');
    } finally {
      setActionBusyId(null);
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    setSuccessMessage('');
    setErrorMessage('');

    if (!canEditDriverStatus) {
      setErrorMessage('You do not have permission to update driver status.');
      return;
    }

    setActionBusyId(`${id}-active`);

    try {
      await apiFetch(`/admin/drivers/${id}/active`, {
        method: 'PATCH',
        auth: true,
        body: { isActive },
      });

      setDrivers((prev) =>
        prev.map((driver) =>
          driver.id === id ? { ...driver, isActive } : driver,
        ),
      );

      setSuccessMessage(
        isActive
          ? 'Driver activated successfully.'
          : 'Driver deactivated successfully.',
      );
    } catch (error) {
      console.error('Failed to update driver active status', error);
      setErrorMessage('Failed to update driver active status.');
    } finally {
      setActionBusyId(null);
    }
  }

  async function deleteDriver(driver: Driver) {
  setSuccessMessage('');
  setErrorMessage('');

  if (!canDeleteDriver) {
    setErrorMessage('Only global super admins can delete drivers.');
    return;
  }

  setPendingDeleteDriver(driver);
}

async function confirmDeleteDriver() {
  if (!pendingDeleteDriver) return;

  const driver = pendingDeleteDriver;

  setActionBusyId(`${driver.id}-delete`);
  setSuccessMessage('');
  setErrorMessage('');

  try {
    await apiFetch(`/admin/drivers/${driver.id}`, {
      method: 'DELETE',
      auth: true,
    });

    setDrivers((prev) => prev.filter((d) => d.id !== driver.id));
    setSuccessMessage(`${driver.name} deleted from driver list.`);
    setPendingDeleteDriver(null);
  } catch (error) {
    console.error('Failed to delete driver', error);
    const msg = error instanceof Error ? error.message : String(error);
    setErrorMessage(msg || 'Failed to delete driver.');
  } finally {
    setActionBusyId(null);
  }
}

  useEffect(() => {
    async function bootstrap() {
      setSuccessMessage('');
      setErrorMessage('');

      try {
        const admin = await apiFetch<CurrentAdmin>('/admin-auth/me', {
          method: 'GET',
          auth: true,
          cache: 'no-store',
        });

        setCurrentAdmin(admin || null);

        const townsRes = await apiFetch<Town[]>('/towns', {
          method: 'GET',
          auth: true,
          cache: 'no-store',
        });

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
      {pendingDeleteDriver ? (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4">
    <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
      <div className="text-xl font-black text-slate-900">
        Delete driver?
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        This will hide{' '}
        <span className="font-bold text-slate-900">
          {pendingDeleteDriver.name}
        </span>{' '}
        from the driver list. Historical orders and records will remain.
      </p>

      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
        This action should only be used when the driver should no longer appear
        in operations.
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => setPendingDeleteDriver(null)}
          disabled={actionBusyId === `${pendingDeleteDriver.id}-delete`}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={confirmDeleteDriver}
          disabled={actionBusyId === `${pendingDeleteDriver.id}-delete`}
          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {actionBusyId === `${pendingDeleteDriver.id}-delete`
            ? 'Deleting...'
            : 'Delete driver'}
        </button>
      </div>
    </div>
  </div>
) : null}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Drivers
          </h1>
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
            <h2 className="text-base font-semibold text-slate-900">
              Town scope
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Global admins can switch towns. Town-scoped roles stay within
              their assigned town.
            </p>

            <div className="mt-4 space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Town
              </label>
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
            <h2 className="text-base font-semibold text-slate-900">
              Add driver
            </h2>
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
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Name
                  </label>
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
  <label className="mb-1 block text-sm font-medium text-slate-700">
    Motor number
  </label>
  <input
    value={newDriver.motorNumber}
    onChange={(e) =>
      setNewDriver((prev) => ({
        ...prev,
        motorNumber: e.target.value,
      }))
    }
    placeholder="e.g. GX-1234-24"
    className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
  />
</div>

<div>
  <label className="mb-1 block text-sm font-medium text-slate-700">
    ID number
  </label>
  <input
    value={newDriver.idNumber}
    onChange={(e) =>
      setNewDriver((prev) => ({
        ...prev,
        idNumber: e.target.value,
      }))
    }
    placeholder="Driver ID number"
    className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
  />
</div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Phone
                  </label>
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
                    Lower numbers can be treated as higher priority later in
                    auto-assignment.
                  </p>
                </div>

                <button
                  type="button"
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
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Driver list
                </h2>
                <p className="text-sm text-slate-600">
                  {selectedTown
                    ? `Showing drivers for ${selectedTownName}.`
                    : 'Select a town.'}
                </p>
              </div>

              <div className="text-sm text-slate-500">
                {loadingDrivers
                  ? 'Loading drivers...'
                  : `${filteredDrivers.length} of ${drivers.length} driver(s)`}
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search driver name, phone, or town..."
                className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
              />

              <select
                value={availabilityFilter}
                onChange={(e) =>
                  setAvailabilityFilter(e.target.value as AvailabilityFilter)
                }
                className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
              >
                <option value="ALL">All availability</option>
                <option value="AVAILABLE">Available</option>
                <option value="BUSY">Busy</option>
                <option value="OFFLINE">Offline</option>
              </select>
            </div>
          </div>

          {loadingDrivers ? (
            <div className="px-5 py-10 text-sm text-slate-500">
              Loading drivers...
            </div>
          ) : drivers.length === 0 ? (
            <div className="px-5 py-10 text-sm text-slate-500">
              No drivers found for this town yet.
            </div>
          ) : filteredDrivers.length === 0 ? (
            <div className="px-5 py-10 text-sm text-slate-500">
              No drivers match your search/filter.
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1080px] text-sm">
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
                    {filteredDrivers.map((driver) => {
                      const busy = actionBusyId?.startsWith(driver.id);

                      return (
                        <tr
                          key={driver.id}
                          className="border-t border-slate-100 align-top"
                        >
                          <td className="px-5 py-4">
                            <Link
                              href={`/ops/drivers/${driver.id}`}
                              className="font-medium text-blue-700 hover:underline"
                            >
                              {driver.name}
                            </Link>
                          </td>
                          <td className="px-5 py-4 text-slate-700">
                            {driver.phone}
                          </td>
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
                          <td className="px-5 py-4 text-slate-700">
                            {driver.priority}
                          </td>
                          <td className="px-5 py-4 text-slate-700">
                            {formatDateTime(driver.lastAssignedAt)}
                          </td>
                          <td className="px-5 py-4 text-slate-700">
                            {driver.isActive ? 'Yes' : 'No'}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setAvailability(driver.id, 'AVAILABLE')
                                }
                                disabled={busy}
                                className="rounded-xl border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Available
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setAvailability(driver.id, 'BUSY')
                                }
                                disabled={busy}
                                className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Busy
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setAvailability(driver.id, 'OFFLINE')
                                }
                                disabled={busy}
                                className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Offline
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  toggleActive(driver.id, !driver.isActive)
                                }
                                disabled={busy}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {driver.isActive ? 'Deactivate' : 'Activate'}
                              </button>

                              {canDeleteDriver ? (
                                <button
                                  type="button"
                                  onClick={() => deleteDriver(driver)}
                                  disabled={busy}
                                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Delete
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="space-y-4 p-4 lg:hidden">
                {filteredDrivers.map((driver) => {
                  const busy = actionBusyId?.startsWith(driver.id);

                  return (
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
                          <div className="mt-1 text-sm text-slate-600">
                            {driver.phone}
                          </div>
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
                          <div className="font-medium text-slate-900">
                            {driver.priority}
                          </div>
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
                          type="button"
                          onClick={() =>
                            setAvailability(driver.id, 'AVAILABLE')
                          }
                          disabled={busy}
                          className="rounded-xl border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Available
                        </button>
                        <button
                          type="button"
                          onClick={() => setAvailability(driver.id, 'BUSY')}
                          disabled={busy}
                          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Busy
                        </button>
                        <button
                          type="button"
                          onClick={() => setAvailability(driver.id, 'OFFLINE')}
                          disabled={busy}
                          className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Offline
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            toggleActive(driver.id, !driver.isActive)
                          }
                          disabled={busy}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {driver.isActive ? 'Deactivate' : 'Activate'}
                        </button>

                        {canDeleteDriver ? (
                          <button
                            type="button"
                            onClick={() => deleteDriver(driver)}
                            disabled={busy}
                            className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}