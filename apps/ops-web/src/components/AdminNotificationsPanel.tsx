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
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const res = await apiFetch<{
        rows: Notification[];
        unreadCount: number;
      }>('/admin/notifications', {
        auth: true,
      });

      setItems(res.rows ?? []);
      setUnread(Number(res.unreadCount || 0));
    } catch {
      // Keep panel quiet if notifications fail.
    }
  }

  useEffect(() => {
    load();

    const interval = window.setInterval(load, 60000);
    return () => window.clearInterval(interval);
  }, []);

  async function markAllRead() {
    try {
      setBusy(true);

      await apiFetch('/admin/notifications/read-all', {
        method: 'PATCH',
        auth: true,
      });

      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnread(0);

      await load();
    } finally {
      setBusy(false);
    }
  }

  async function markOneRead(notificationId: string) {
    await apiFetch(`/admin/notifications/${notificationId}/read`, {
      method: 'PATCH',
      auth: true,
    });

    setItems((prev) =>
      prev.map((n) =>
        n.id === notificationId ? { ...n, isRead: true } : n,
      ),
    );

    setUnread((prev) => Math.max(0, prev - 1));

    await load();
  }

  async function clearAll() {
    const ok = window.confirm('Clear all notifications?');
    if (!ok) return;

    try {
      setBusy(true);

      await apiFetch('/admin/notifications', {
        method: 'DELETE',
        auth: true,
      });

      setItems([]);
      setUnread(0);
    } finally {
      setBusy(false);
    }
  }

  async function clearOne(notificationId: string) {
    await apiFetch(`/admin/notifications/${notificationId}`, {
      method: 'DELETE',
      auth: true,
    });

    setItems((prev) => {
      const removed = prev.find((n) => n.id === notificationId);
      if (removed && !removed.isRead) {
        setUnread((count) => Math.max(0, count - 1));
      }

      return prev.filter((n) => n.id !== notificationId);
    });
  }

  async function openNotification(notification: Notification) {
    try {
      if (!notification.isRead) {
        await markOneRead(notification.id);
      }
    } catch {
      // Still navigate even if mark-read fails.
    }

    setOpen(false);

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
        <div className="absolute left-0 z-50 mt-2 w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-3">
            <div>
              <div className="font-semibold text-slate-900">Notifications</div>
              <div className="text-xs text-slate-500">
                {unread > 0 ? `${unread} unread` : 'All caught up'}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={markAllRead}
                disabled={busy || unread === 0}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:cursor-not-allowed disabled:text-slate-300"
              >
                Mark all read
              </button>

              <button
                type="button"
                onClick={clearAll}
                disabled={busy || items.length === 0}
                className="text-xs font-medium text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:text-slate-300"
              >
                Clear all
              </button>
            </div>
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
                  <button
                    type="button"
                    onClick={() => openNotification(notification)}
                    className="block w-full cursor-pointer rounded-xl pr-20 text-left hover:bg-slate-50"
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
                  </button>

                  <div className="absolute right-2 top-2 flex flex-col items-end gap-2">
                    {!notification.isRead ? (
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          await markOneRead(notification.id);
                        }}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800"
                      >
                        Mark read
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await clearOne(notification.id);
                      }}
                      className="text-xs font-medium text-red-600 hover:text-red-800"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}