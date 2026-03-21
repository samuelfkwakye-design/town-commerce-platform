"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type Address = {
  id: string;
  label?: string | null;
  recipientName: string;
  town: string;
  isDefault: boolean;
};

export default function DeliveryBar() {
  const [address, setAddress] = useState<Address | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const me = await apiFetch<any>("/customer-auth/me");
        if (!me?.customer) {
          setAddress(null);
          setLoaded(true);
          return;
        }

        const addresses = await apiFetch<Address[]>("/customers/me/addresses");
        const preferred = addresses.find((a) => a.isDefault) || addresses[0] || null;

        setAddress(preferred);
      } catch {
        setAddress(null);
      } finally {
        setLoaded(true);
      }
    }

    void load();
  }, []);

  if (!loaded) return null;

  if (!address) {
    return (
      <div className="mb-4 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <div>No delivery address set</div>
        <Link href="/account/addresses" className="font-medium underline">
          Add address
        </Link>
      </div>
    );
  }

  return (
    <div className="mb-4 flex items-center justify-between rounded-2xl border border-orange-100 bg-white px-4 py-3 shadow-sm">
      <div className="text-sm text-slate-700">
        <span className="font-medium">Deliver to:</span>{" "}
        {address.label || address.recipientName} —{" "}
        <span className="text-slate-500">{address.town}</span>
      </div>

      <Link
        href="/account/addresses"
        className="text-sm font-medium text-orange-600 hover:underline"
      >
        Change
      </Link>
    </div>
  );
}
