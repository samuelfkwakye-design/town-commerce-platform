"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
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

type TownOption = {
  id: string;
  name: string;
  slug: string;
  isActive?: boolean;
};

type TownsResponse = {
  rows: TownOption[];
};

type AdminUserDetail = {
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

export default function EditAdminClient() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const adminUserId = String(params?.id ?? "");

  const [currentAdmin, setCurrentAdmin] = useState<CurrentAdmin | null>(null);
  const [targetAdmin, setTargetAdmin] = useState<AdminUserDetail | null>(null);
  const [towns, setTowns] = useState<TownOption[]>([]);

  const [bootstrapping, setBootstrapping] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<AdminRole>("WAREHOUSE_ADMIN");
  const [townId, setTownId] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isGlobal = currentAdmin?.role === "GLOBAL_SUPER_ADMIN";
  const isTownSuper = currentAdmin?.role === "TOWN_SUPER_ADMIN";

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        setBootstrapping(true);
        setError("");
        setAccessDenied(false);

        const me = await apiFetch<CurrentAdmin>("/admin/auth/me");
        if (cancelled) return;

        setCurrentAdmin(me);

        if (me.role === "GLOBAL_SUPER_ADMIN") {
          try {
            const townsResp = await apiFetch<TownsResponse>("/towns");
            if (!cancelled) {
              setTowns(townsResp.rows || []);
            }
          } catch {
            if (!cancelled) {
              setTowns([]);
            }
          }
        }

        const target = await apiFetch<AdminUserDetail>(
          `/admin/admin-users/${encodeURIComponent(adminUserId)}`,
        );
        if (cancelled) return;

        setTargetAdmin(target);
        setEmail(target.email);
        setUsername(target.username);
        setFirstName(target.firstName ?? "");
        setLastName(target.lastName ?? "");
        setPhone(target.phone ?? "");
        setRole(target.role);
        setTownId(target.townId ?? "");
        setIsActive(target.isActive);
      } catch (err: any) {
        if (!cancelled) {
          const message = err?.message || "Failed to load admin user";
          setError(message);

          if (
            String(message).toLowerCase().includes("permission") ||
            String(message).toLowerCase().includes("forbidden")
          ) {
            setAccessDenied(true);
          }
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
  }, [adminUserId]);

  const allowedRoles = useMemo(() => {
    if (isGlobal) {
      return ["TOWN_SUPER_ADMIN", "WAREHOUSE_ADMIN"] as AdminRole[];
    }
    if (isTownSuper) {
      return ["WAREHOUSE_ADMIN"] as AdminRole[];
    }
    return [] as AdminRole[];
  }, [isGlobal, isTownSuper]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();

    if (!currentAdmin || !targetAdmin) {
      setError("Admin user data is not loaded.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload: Record<string, any> = {
        email: email.trim(),
        username: username.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        isActive,
      };

      if (password.trim()) {
        payload.password = password;
      }

      if (isGlobal) {
        payload.role = role;
        payload.townId = townId.trim();
      } else if (isTownSuper) {
        payload.role = "WAREHOUSE_ADMIN";
        payload.townId = currentAdmin.townId;
      }

      const updated = await apiFetch<AdminUserDetail>(
        `/admin/admin-users/${encodeURIComponent(adminUserId)}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );

      setTargetAdmin(updated);
      setPassword("");
      setSuccess(`Admin user ${updated.email} updated successfully.`);

      setTimeout(() => {
        router.push("/ops/admins?updated=1");
      }, 700);
    } catch (err: any) {
      setError(err?.message || "Failed to update admin user");
    } finally {
      setSaving(false);
    }
  }

  if (bootstrapping) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <div className="text-sm text-gray-500">Loading admin user...</div>
      </main>
    );
  }

  if (accessDenied) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <Link href="/ops/admins" className="text-sm text-blue-600 underline">
          Back
        </Link>
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          You do not have permission to edit this admin user.
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Edit Admin User</h1>
          <p className="text-sm text-gray-500">
            Update admin account details, role, town, and active status.
          </p>
        </div>

        <Link href="/ops/admins" className="text-sm text-blue-600 underline">
          Back
        </Link>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {success}
        </div>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-lg border bg-white p-6 shadow-sm"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm text-gray-600">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="mt-1 w-full rounded-md border px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              className="mt-1 w-full rounded-md border px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600">
              New password (optional)
            </label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="mt-1 w-full rounded-md border px-3 py-2"
              minLength={8}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as AdminRole)}
              className="mt-1 w-full rounded-md border px-3 py-2"
              disabled={isTownSuper}
            >
              {allowedRoles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600">First name</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600">Last name</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600">Town</label>
            {isGlobal ? (
              <select
                value={townId}
                onChange={(e) => setTownId(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2"
                required
              >
                <option value="">Select town</option>
                {towns.map((town) => (
                  <option key={town.id} value={town.id}>
                    {town.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="mt-1 rounded-md border bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {currentAdmin?.town?.name ?? "Assigned town"}
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Admin user is active
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </main>
  );
}