"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

type AdminRole =
  | "GLOBAL_SUPER_ADMIN"
  | "TOWN_SUPER_ADMIN"
  | "WAREHOUSE_ADMIN";

type CurrentAdmin = {
  id: string;
  email: string;
  username?: string;
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

type AdminUserRow = {
  id: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: AdminRole;
  townId: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  town: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

type AdminUsersResponse = {
  rows: AdminUserRow[];
};

type UpdatedAdminResponse = AdminUserRow;

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function canEditAdmin(currentAdmin: CurrentAdmin | null, target: AdminUserRow) {
  if (!currentAdmin) return false;

  if (currentAdmin.role === "GLOBAL_SUPER_ADMIN") {
    return target.role !== "GLOBAL_SUPER_ADMIN";
  }

  if (currentAdmin.role === "TOWN_SUPER_ADMIN") {
    return (
      target.role === "WAREHOUSE_ADMIN" &&
      !!currentAdmin.townId &&
      target.townId === currentAdmin.townId
    );
  }

  return false;
}

export default function AdminsClient() {
  const searchParams = useSearchParams();

  const [admin, setAdmin] = useState<CurrentAdmin | null>(null);
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const updatedFlag = searchParams.get("updated");
  const createdFlag = searchParams.get("created");

  async function loadAdmins(nextAdmin?: CurrentAdmin | null) {
    const currentAdmin = nextAdmin ?? admin;
    if (!currentAdmin) return;

    try {
      setLoading(true);
      setError("");

      const data = await apiFetch<AdminUsersResponse>("/admin/admin-users");
      setRows(data.rows || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load admin users");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (updatedFlag === "1") {
      setSuccess("Admin user updated successfully.");
    } else if (createdFlag === "1") {
      setSuccess("Admin user created successfully.");
    }
  }, [updatedFlag, createdFlag]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        setBootstrapping(true);
        setError("");

        const me = await apiFetch<CurrentAdmin>("/admin-auth/me");
        if (cancelled) return;

        setAdmin(me);
        await loadAdmins(me);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Failed to load admin access");
        }
      } finally {
        if (!cancelled) {
          setBootstrapping(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const editableIds = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows) {
      if (canEditAdmin(admin, row)) {
        set.add(row.id);
      }
    }
    return set;
  }, [admin, rows]);

  async function onToggleActive(row: AdminUserRow) {
    if (!editableIds.has(row.id)) {
      setError("You do not have permission to update this admin user.");
      return;
    }

    const nextActive = !row.isActive;
    const actionText = nextActive ? "activate" : "deactivate";

    const ok = window.confirm(
      `Are you sure you want to ${actionText} ${row.email}?`,
    );
    if (!ok) return;

    try {
      setTogglingId(row.id);
      setError("");
      setSuccess("");

      const updated = await apiFetch<UpdatedAdminResponse>(
        `/admin/admin-users/${encodeURIComponent(row.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            isActive: nextActive,
          }),
        },
      );

      setRows((prev) =>
        prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
      );

      setSuccess(
        `Admin user ${updated.email} ${nextActive ? "activated" : "deactivated"} successfully.`,
      );
    } catch (err: any) {
      setError(err?.message || "Failed to update admin user");
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Admin Users</h1>
          <p className="text-sm text-gray-500">
            Manage platform admin accounts by role and town scope.
          </p>
          {admin ? (
            <p className="mt-2 text-xs text-gray-500">
              Role: <span className="font-medium">{admin.role}</span>
              {admin.role === "TOWN_SUPER_ADMIN" && admin.town ? (
                <>
                  {" "}
                  · Town-scoped to <span className="font-medium">{admin.town.name}</span>
                </>
              ) : null}
            </p>
          ) : null}
        </div>

        <Link
          href="/ops/admins/new"
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
        >
          New admin
        </Link>
      </div>

      {success ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {success}
        </div>
      ) : null}

      {bootstrapping ? (
        <div className="text-sm text-gray-500">Loading admin access...</div>
      ) : error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      ) : loading ? (
        <div className="text-sm text-gray-500">Loading admin users...</div>
      ) : rows.length === 0 ? (
        <div className="rounded-md border bg-white p-4 text-sm text-gray-600">
          No admin users found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Username</th>
                <th className="p-3">Role</th>
                <th className="p-3">Town</th>
                <th className="p-3">Status</th>
                <th className="p-3">Last login</th>
                <th className="p-3">Created</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const fullName =
                  [row.firstName, row.lastName].filter(Boolean).join(" ") || "—";

                const editable = canEditAdmin(admin, row);
                const toggling = togglingId === row.id;

                return (
                  <tr key={row.id} className="border-t">
                    <td className="p-3 font-medium">{fullName}</td>
                    <td className="p-3">{row.email}</td>
                    <td className="p-3">{row.username}</td>
                    <td className="p-3">{row.role}</td>
                    <td className="p-3">
                      {row.town ? (
                        <div>
                          <div>{row.town.name}</div>
                          <div className="text-xs text-gray-500">{row.town.slug}</div>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-3">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                        {row.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="p-3">{fmtDate(row.lastLoginAt)}</td>
                    <td className="p-3">{fmtDate(row.createdAt)}</td>
                    <td className="p-3 whitespace-nowrap">
                      {editable ? (
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/ops/admins/${encodeURIComponent(row.id)}/edit`}
                            className="text-sm text-blue-600 hover:underline"
                          >
                            Edit
                          </Link>

                          <button
                            type="button"
                            onClick={() => onToggleActive(row)}
                            disabled={toggling}
                            className="text-sm text-red-600 hover:underline disabled:opacity-50"
                          >
                            {toggling
                              ? "Saving..."
                              : row.isActive
                                ? "Deactivate"
                                : "Activate"}
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">View only</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}