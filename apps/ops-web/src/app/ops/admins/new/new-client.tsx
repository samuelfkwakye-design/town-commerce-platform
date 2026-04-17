"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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

type CreatedAdminResponse = {
  id: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: AdminRole;
  townId: string | null;
  isActive: boolean;
  createdAt: string;
  town: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

export default function NewAdminClient() {
  const router = useRouter();

  const [admin, setAdmin] = useState<CurrentAdmin | null>(null);
  const [towns, setTowns] = useState<TownOption[]>([]);
  const [bootstrapping, setBootstrapping] = useState(true);

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<AdminRole>("WAREHOUSE_ADMIN");
  const [townId, setTownId] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isGlobal = admin?.role === "GLOBAL_SUPER_ADMIN";
  const isTownSuper = admin?.role === "TOWN_SUPER_ADMIN";

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        setBootstrapping(true);
        setError("");

        const me = await apiFetch<CurrentAdmin>("/admin/auth/me");
        if (cancelled) return;

        setAdmin(me);

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

          setRole("WAREHOUSE_ADMIN");
          return;
        }

        if (me.role === "TOWN_SUPER_ADMIN") {
          setRole("WAREHOUSE_ADMIN");
          setTownId(me.townId ?? "");
        }
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

    if (!admin) {
      setError("Admin session not loaded.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload: Record<string, any> = {
        email: email.trim(),
        username: username.trim(),
        password,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        phone: phone.trim() || undefined,
        role,
      };

      if (isGlobal) {
        if (!townId.trim()) {
          throw new Error("Town is required.");
        }
        payload.townId = townId.trim();
      } else if (isTownSuper) {
        if (!admin.townId) {
          throw new Error("Your admin account is not linked to a town.");
        }
        payload.townId = admin.townId;
        payload.role = "WAREHOUSE_ADMIN";
      }

      const created = await apiFetch<CreatedAdminResponse>("/admin/admin-users", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setSuccess(`Admin user ${created.email} created successfully.`);

      setTimeout(() => {
        router.push("/ops/admins");
      }, 700);
    } catch (err: any) {
      setError(err?.message || "Failed to create admin user");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Create Admin User</h1>
          <p className="text-sm text-gray-500">
            Add a new admin user with the correct town and role scope.
          </p>
          {admin ? (
            <p className="mt-2 text-xs text-gray-500">
              Role: <span className="font-medium">{admin.role}</span>
              {isTownSuper && admin.town ? (
                <>
                  {" "}
                  · Town locked to <span className="font-medium">{admin.town.name}</span>
                </>
              ) : null}
            </p>
          ) : null}
        </div>

        <Link
          href="/ops/admins"
          className="text-sm text-blue-600 underline"
        >
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

      {bootstrapping ? (
        <div className="text-sm text-gray-500">Loading admin access...</div>
      ) : (
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
              <label className="block text-sm text-gray-600">Password</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className="mt-1 w-full rounded-md border px-3 py-2"
                required
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
                  {admin?.town?.name ?? "Assigned town"}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create admin"}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
