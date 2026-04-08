'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
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

export default function DriversPage() {
  const [towns, setTowns] = useState<Town[]>([]);
  const [selectedTown, setSelectedTown] = useState<string>('');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [newDriver, setNewDriver] = useState({
    name: '',
    phone: '',
    priority: 100,
  });

  async function loadTowns() {
    const res = await apiFetch<Town[]>('/towns');
    setTowns(res || []);
    if (res?.length) {
      setSelectedTown(res[0].id);
    }
  }

  async function loadDrivers(townId: string) {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await apiFetch<Driver[]>(`/admin/drivers?townId=${townId}`);
      setDrivers(res || []);
    } catch (error) {
      console.error('Failed to load drivers', error);
      setErrorMessage('Failed to load drivers.');
    } finally {
      setLoading(false);
    }
  }

  async function createDriver() {
    setSuccessMessage('');
    setErrorMessage('');

    if (!selectedTown || !newDriver.name || !newDriver.phone) {
      setErrorMessage('Please select a town and enter name and phone.');
      return;
    }

    try {
      await apiFetch('/admin/drivers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          townId: selectedTown,
          name: newDriver.name.trim(),
          phone: newDriver.phone.trim(),
          priority: Number(newDriver.priority),
          availability: 'AVAILABLE',
        }),
      });

      setNewDriver({ name: '', phone: '', priority: 100 });
      await loadDrivers(selectedTown);
      setSuccessMessage('Driver added successfully.');
    } catch (error) {
      console.error('Failed to create driver', error);
      setErrorMessage('Failed to add driver. Please try again.');
    }
  }

  async function setAvailability(id: string, availability: Driver['availability']) {
    setSuccessMessage('');
    setErrorMessage('');

    try {
      await apiFetch(`/admin/drivers/${id}/availability`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ availability }),
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

    try {
      await apiFetch(`/admin/drivers/${id}/active`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive }),
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
    loadTowns();
  }, []);

  useEffect(() => {
    if (selectedTown) {
      loadDrivers(selectedTown);
    }
  }, [selectedTown]);

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-semibold">Drivers</h1>

      {successMessage ? (
        <div className="mb-4 rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {errorMessage}
        </div>
      ) : null}

      <div className="mb-4">
        <select
          value={selectedTown}
          onChange={(e) => setSelectedTown(e.target.value)}
          className="rounded border px-3 py-2"
        >
          {towns.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-6 rounded border bg-white p-4">
        <h2 className="mb-2 font-semibold">Add Driver</h2>

        <div className="flex gap-2">
          <input
            placeholder="Name"
            value={newDriver.name}
            onChange={(e) =>
              setNewDriver({ ...newDriver, name: e.target.value })
            }
            className="border px-2 py-1"
          />

          <input
            placeholder="Phone"
            value={newDriver.phone}
            onChange={(e) =>
              setNewDriver({ ...newDriver, phone: e.target.value })
            }
            className="border px-2 py-1"
          />

          <input
            type="number"
            placeholder="Priority"
            value={newDriver.priority}
            onChange={(e) =>
              setNewDriver({
                ...newDriver,
                priority: Number(e.target.value),
              })
            }
            className="w-24 border px-2 py-1"
          />

          <button
            onClick={createDriver}
            className="rounded bg-black px-4 py-1 text-white"
          >
            Add
          </button>
        </div>
      </div>

      <div className="rounded border bg-white p-4">
        {loading ? (
          <div>Loading...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th>Name</th>
                <th>Phone</th>
                <th>Availability</th>
                <th>Priority</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {drivers.map((d) => (
                <tr key={d.id} className="border-t">
                  <td>
                    <Link
                      href={`/ops/drivers/${d.id}`}
                      className="font-medium text-blue-700 hover:underline"
                    >
                      {d.name}
                    </Link>
                  </td>
                  <td>{d.phone}</td>
                  <td>{d.availability}</td>
                  <td>{d.priority}</td>
                  <td>{d.isActive ? 'Yes' : 'No'}</td>

                  <td className="space-x-2">
                    <button onClick={() => setAvailability(d.id, 'AVAILABLE')}>
                      ✅
                    </button>
                    <button onClick={() => setAvailability(d.id, 'BUSY')}>
                      ⏳
                    </button>
                    <button onClick={() => setAvailability(d.id, 'OFFLINE')}>
                      ❌
                    </button>

                    <button onClick={() => toggleActive(d.id, !d.isActive)}>
                      {d.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}