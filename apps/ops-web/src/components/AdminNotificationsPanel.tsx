'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  orderId?: string | null;
  isRead: boolean;
  createdAt: string;
};

export default function AdminNotificationsPanel() {
  const router = useRouter();

  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  async function load() {
    try {
      const res = await apiFetch<{
        rows: Notification[];
        unreadCount: number;
      }>('/admin/notifications', {
        auth: true,
      });

      setItems(res.rows);
      setUnread(res.unreadCount);
    } catch {
      // Keep panel quiet if notifications fail.
    }
  }

  useEffect(() => {
    load();

    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  async function markAllRead() {
    await apiFetch('/admin/notifications/read-all', {
      method: 'PATCH',
      auth: true,
    });

    await load();
  }

  async function openNotification(notification: Notification) {
    try {
      await apiFetch(`/admin/notifications/${notification.id}/read`, {
        method: 'PATCH',
        auth: true,
      });
    } catch {
      // Still navigate even if mark-read fails.
    }

    setOpen(false);
    await load();

    if (notification.orderId) {
      router.push(`/ops/orders/${notification.orderId}`);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm hover:bg-slate-50"
        aria-label="Open notifications"
      >
        🔔
        {unread > 0 ? (
          <span className="absolute -right-2 -top-2 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
            {unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute left-0 z-50 mt-2 w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 p-3">
            <div className="font-semibold text-slate-900">Notifications</div>
            <button
              type="button"
              onClick={markAllRead}
              className="text-xs font-medium text-blue-600 hover:text-blue-800"
            >
              Mark all
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">
                No notifications yet.
              </div>
            ) : (
              items.map((notification) => (
  <div
    key={notification.id}
    className={`relative border-b border-slate-100 p-3 text-left text-sm transition ${
      notification.isRead ? 'bg-white' : 'bg-emerald-50'
    }`}
  >
    {/* CLICKABLE AREA */}
    <div
      onClick={() => openNotification(notification)}
      className="cursor-pointer pr-8 hover:bg-slate-50"
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-base">
          {notification.type === 'ORDER_DELIVERED' ? '✅' : '📦'}
        </span>

        <div className="min-w-0 flex-1">
          <div
            className={`font-semibold ${
              notification.isRead
                ? 'text-slate-700'
                : 'text-slate-950'
            }`}
          >
            {notification.title}
          </div>

          <div className="mt-1 text-xs leading-5 text-slate-600">
            {notification.message}
          </div>

          {notification.orderId ? (
            <div className="mt-2 text-xs font-semibold text-emerald-700">
              Open order →
            </div>
          ) : null}
        </div>
      </div>
    </div>

    {/* MARK AS READ BUTTON */}
    {!notification.isRead && (
      <button
        onClick={async (e) => {
          e.stopPropagation(); // 🚨 prevents opening order
          await apiFetch(`/admin/notifications/${notification.id}/read`, {
            method: 'PATCH',
            auth: true,
          });
          await load();
        }}
        className="absolute right-2 top-2 text-xs text-blue-600 hover:text-blue-800"
      >
        Mark read
      </button>
    )}
  </div>
))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}