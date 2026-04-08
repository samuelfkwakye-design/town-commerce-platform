'use client';

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

  const [newDriver, setNewDriver] = useState({
    name: '',
    phone: '',
    priority: 100,
  });

  async function loadTowns() {
    const res = await apiFetch<{ towns: Town[] }>('/towns');
    setTowns(res.towns || []);
    if (res.towns?.length) {
      setSelectedTown(res.towns[0].id);
    }
  }

  async function loadDrivers(townId: string) {
    setLoading(true);
    try {
      const res = await apiFetch<Driver[]>(
        `/admin/drivers?townId=${townId}`,
      );
      setDrivers(res || []);
    } finally {
      setLoading(false);
    }
  }

  async function createDriver() {
    if (!selectedTown || !newDriver.name || !newDriver.phone) return;

    await apiFetch('/admin/drivers', {
      method: 'POST',
      body: JSON.stringify({
        townId: selectedTown,
        name: newDriver.name,
        phone: newDriver.phone,
        priority: Number(newDriver.priority),
      }),
    });

    setNewDriver({ name: '', phone: '', priority: 100 });
    await loadDrivers(selectedTown);
  }

  async function setAvailability(id: string, availability: Driver['availability']) {
    await apiFetch(`/admin/drivers/${id}/availability`, {
      method: 'PATCH',
      body: JSON.stringify({ availability }),
    });

    await loadDrivers(selectedTown);
  }

  async function toggleActive(id: string, isActive: boolean) {
    await apiFetch(`/admin/drivers/${id}/active`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });

    await loadDrivers(selectedTown);
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

      {/* Town Selector */}
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

      {/* Add Driver */}
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

      {/* Drivers List */}
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
                  <td>{d.name}</td>
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
