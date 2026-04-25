'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type Notification = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export default function AdminNotificationsPanel() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  async function load() {
    try {
      const res = await apiFetch<{
        rows: Notification[];
        unreadCount: number;
      }>('/admin/notifications');

      setItems(res.rows);
      setUnread(res.unreadCount);
    } catch {}
  }

  useEffect(() => {
    load();

    const interval = setInterval(load, 10000); // every 10s
    return () => clearInterval(interval);
  }, []);

  async function markAllRead() {
    await apiFetch('/admin/notifications/read-all', {
      method: 'PATCH',
    });
    load();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-full border px-3 py-1"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -top-2 -right-2 rounded-full bg-red-500 px-2 text-xs text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border bg-white shadow-lg">
          <div className="flex items-center justify-between p-3 border-b">
            <div className="font-semibold">Notifications</div>
            <button
              onClick={markAllRead}
              className="text-xs text-blue-600"
            >
              Mark all
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && (
              <div className="p-4 text-sm text-gray-500">
                No notifications
              </div>
            )}

            {items.map((n) => (
              <div
                key={n.id}
                className={`p-3 border-b text-sm ${
                  n.isRead ? 'bg-white' : 'bg-blue-50'
                }`}
              >
                <div className="font-medium">{n.title}</div>
                <div className="text-gray-600">{n.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
