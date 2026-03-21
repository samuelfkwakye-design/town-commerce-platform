"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MapPin,
  Plus,
  Home,
  Building2,
  Trash2,
  Star,
  Pencil,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type CustomerAddress = {
  id: string;
  label?: string | null;
  recipientName: string;
  phone?: string | null;
  line1: string;
  line2?: string | null;
  area?: string | null;
  town: string;
  landmark?: string | null;
  notes?: string | null;
  isDefault: boolean;
};

type AddressForm = {
  label: string;
  recipientName: string;
  phone: string;
  line1: string;
  line2: string;
  area: string;
  town: string;
  landmark: string;
  notes: string;
  isDefault: boolean;
};

type MeResponse = {
  ok: boolean;
  customer?: {
    id: string;
    phone?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
};

const emptyForm: AddressForm = {
  label: "",
  recipientName: "",
  phone: "",
  line1: "",
  line2: "",
  area: "",
  town: "",
  landmark: "",
  notes: "",
  isDefault: false,
};

function labelIcon(label?: string | null) {
  const value = String(label ?? "").toLowerCase();
  if (value.includes("work") || value.includes("office")) {
    return <Building2 className="h-4 w-4" />;
  }
  return <Home className="h-4 w-4" />;
}

function getTownFromRedirect(value: string | null) {
  if (!value) return "";
  const match = value.match(/^\/([^/]+)\/checkout$/);
  return match?.[1] ?? "";
}

function AddressesPageInner() {
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState<AddressForm>(emptyForm);
  const [customer, setCustomer] = useState<MeResponse["customer"]>(null);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomerAddress | null>(null);
  const [deleting, setDeleting] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");

  async function loadAddresses() {
    try {
      const res = await apiFetch<CustomerAddress[]>("/customers/me/addresses");
      setAddresses(res || []);
    } catch {
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadCustomer() {
    try {
      const me = await apiFetch<MeResponse>("/customer-auth/me");
      setCustomer(me?.customer ?? null);
    } catch {
      setCustomer(null);
    }
  }

  useEffect(() => {
    void loadAddresses();
    void loadCustomer();
  }, []);

  function openForm(address?: CustomerAddress) {
    setError("");
    setShowForm(true);

    if (address) {
      setEditingAddress(address);
      setForm({
        label: address.label || "",
        recipientName: address.recipientName,
        phone: address.phone || "",
        line1: address.line1,
        line2: address.line2 || "",
        area: address.area || "",
        town: address.town,
        landmark: address.landmark || "",
        notes: address.notes || "",
        isDefault: address.isDefault,
      });
    } else {
      const redirectTown = getTownFromRedirect(redirect);
      const fullName = `${customer?.firstName ?? ""} ${customer?.lastName ?? ""}`.trim();

      setEditingAddress(null);
      setForm({
        ...emptyForm,
        phone: customer?.phone || "",
        recipientName: fullName || "",
        town: redirectTown || "",
      });
    }

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 50);
  }

  function closeForm() {
    setShowForm(false);
    setEditingAddress(null);
    setForm(emptyForm);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!form.recipientName.trim() || !form.line1.trim() || !form.town.trim()) {
      setError("Recipient name, address line 1, and town are required.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        label: form.label.trim() || undefined,
        recipientName: form.recipientName.trim(),
        phone: form.phone.trim() || undefined,
        line1: form.line1.trim(),
        line2: form.line2.trim() || undefined,
        area: form.area.trim() || undefined,
        town: form.town.trim(),
        landmark: form.landmark.trim() || undefined,
        notes: form.notes.trim() || undefined,
        isDefault: form.isDefault,
      };

      if (editingAddress) {
        await apiFetch(`/customers/me/addresses/${editingAddress.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/customers/me/addresses", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      closeForm();
      await loadAddresses();

      if (redirect) {
        const nextUrl = `${redirect}${redirect.includes("?") ? "&" : "?"}addressUpdated=1`;
        router.push(nextUrl);
        router.refresh();
        return;
      }
    } catch (err: any) {
      setError(err?.message || "Failed to save address.");
    } finally {
      setSaving(false);
    }
  }

  function handleDeleteClick(addr: CustomerAddress) {
    setDeleteTarget(addr);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      setBusyId(deleteTarget.id);

      await apiFetch(`/customers/me/addresses/${deleteTarget.id}`, {
        method: "DELETE",
      });

      setDeleteTarget(null);
      await loadAddresses();
    } catch (err: any) {
      alert(err?.message || "Failed to delete address");
    } finally {
      setDeleting(false);
      setBusyId(null);
    }
  }

  async function handleSetDefault(id: string) {
    try {
      setBusyId(id);
      await apiFetch(`/customers/me/addresses/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isDefault: true }),
      });
      await loadAddresses();
    } catch (err: any) {
      alert(err?.message || "Failed to update address");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-white px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-col gap-4 rounded-[28px] border border-orange-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-700">
              <MapPin className="h-3.5 w-3.5" />
              Delivery addresses
            </div>

            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
              My Addresses
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Save your delivery locations for faster checkout and smoother repeat
              orders.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {redirect ? (
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-2xl"
                onClick={() => router.push(redirect)}
              >
                ← Back to checkout
              </Button>
            ) : null}

            <Button
              type="button"
              onClick={() => openForm()}
              className="h-11 rounded-2xl bg-orange-500 px-5 text-white hover:bg-orange-600"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add new address
            </Button>
          </div>
        </div>

        {showForm ? (
          <Card className="mb-8 rounded-[28px] border-orange-100 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
              {editingAddress ? "Edit address" : "Add new address"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {editingAddress
                ? "Update the delivery details for this address."
                : "Enter a delivery address you want to save to your account."}
            </p>

            <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Label
                </label>
                <input
                  value={form.label}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, label: e.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-300"
                  placeholder="e.g. Home, Work"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Recipient name
                  </label>
                  <input
                    value={form.recipientName}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        recipientName: e.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-300"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Phone
                  </label>
                  <input
                    value={form.phone}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-300"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Address line 1
                </label>
                <input
                  value={form.line1}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, line1: e.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-300"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Address line 2
                </label>
                <input
                  value={form.line2}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, line2: e.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-300"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Area
                  </label>
                  <input
                    value={form.area}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, area: e.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-300"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Town
                  </label>
                  <input
                    value={form.town}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, town: e.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-300"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Landmark
                </label>
                <input
                  value={form.landmark}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, landmark: e.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-300"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  className="min-h-[110px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-300"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, isDefault: e.target.checked }))
                  }
                />
                Set as default address
              </label>

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={saving}
                  className="rounded-2xl bg-orange-500 text-white hover:bg-orange-600"
                >
                  {saving
                    ? editingAddress
                      ? "Updating..."
                      : "Saving..."
                    : editingAddress
                      ? "Update address"
                      : "Save address"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="rounded-2xl"
                  onClick={closeForm}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        ) : null}

        {loading ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
            Loading addresses...
          </div>
        ) : addresses.length === 0 ? (
          <Card className="rounded-[28px] border-dashed border-orange-200 p-10 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 text-orange-500">
              <MapPin className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-slate-900">
              No saved addresses yet
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Add your first delivery address to make checkout quicker next time.
            </p>
            <div className="mt-5">
              <Button
                type="button"
                onClick={() => openForm()}
                className="rounded-2xl bg-orange-500 text-white hover:bg-orange-600"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add your first address
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {addresses.map((addr) => (
              <Card
                key={addr.id}
                className="rounded-[24px] border-slate-200 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 text-slate-900">
                    <div className="rounded-full bg-orange-50 p-2 text-orange-500">
                      {labelIcon(addr.label)}
                    </div>
                    <div>
                      <div className="font-semibold">
                        {addr.label || addr.recipientName}
                      </div>
                      <div className="text-sm text-slate-500">
                        {addr.recipientName}
                      </div>
                    </div>
                  </div>

                  {addr.isDefault ? (
                    <span className="rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                      Default
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 space-y-1.5 text-sm text-slate-600">
                  <div>{addr.line1}</div>
                  {addr.line2 ? <div>{addr.line2}</div> : null}
                  {addr.area ? <div>{addr.area}</div> : null}
                  <div className="font-medium text-slate-700">{addr.town}</div>
                  {addr.landmark ? <div>Landmark: {addr.landmark}</div> : null}
                  {addr.phone ? <div>Phone: {addr.phone}</div> : null}
                </div>

                <div className="mt-5 flex flex-wrap gap-4 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => openForm(addr)}
                    className="inline-flex items-center gap-1 text-sm font-medium text-orange-600 hover:underline"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>

                  {!addr.isDefault ? (
                    <button
                      type="button"
                      onClick={() => void handleSetDefault(addr.id)}
                      disabled={busyId === addr.id}
                      className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline disabled:opacity-50"
                    >
                      <Star className="h-4 w-4" />
                      {busyId === addr.id ? "Updating..." : "Set as default"}
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-1 text-sm font-medium text-green-700">
                      <Star className="h-4 w-4" />
                      Default address
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDeleteClick(addr)}
                    disabled={busyId === addr.id}
                    className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-[28px] border border-orange-100 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
                <Trash2 className="h-5 w-5" />
              </div>

              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-900">
                  Delete address?
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  You are about to remove{" "}
                  <span className="font-semibold text-slate-900">
                    {deleteTarget.label || deleteTarget.recipientName}
                  </span>
                  . This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <div>{deleteTarget.line1}</div>
              {deleteTarget.area ? <div>{deleteTarget.area}</div> : null}
              <div>{deleteTarget.town}</div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                className="rounded-2xl"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={deleting}
                className="rounded-2xl bg-red-600 text-white hover:bg-red-700"
              >
                {deleting ? "Deleting..." : "Delete address"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default function AddressesPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-white px-4 py-8 sm:px-6">
          <div className="mx-auto max-w-4xl rounded-[28px] border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
            Loading addresses...
          </div>
        </main>
      }
    >
      <AddressesPageInner />
    </Suspense>
  );
}