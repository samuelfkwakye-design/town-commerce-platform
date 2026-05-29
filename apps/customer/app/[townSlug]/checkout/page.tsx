"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { loadCart, clearCart } from "@/lib/cart";
import { apiFetch } from "@/lib/api";
import type { CartItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import CheckoutProgress from "@/components/CheckoutProgress";

type TownSettingsResponse = {
  town?: {
    id: string;
    name: string;
    slug: string;
  };
  settings?: {
    townId?: string;
    deliveryFee?: string;
    serviceFee?: string;
    minimumOrder?: string;
    currency?: string;
  };
};

type QuoteResponse = {
  town?: {
    id: string;
    name: string;
    slug: string;
  };
  pricing?: {
    itemsSubtotal?: string | number;
    subtotal?: string | number;
    minimumOrder?: string | number;
    deliveryFee?: string | number;
    serviceFee?: string | number;
    discount?: string | number;
    total?: string | number;
    currency?: string;
  };
  promo?: {
    code: string;
    type: string;
    value?: string | number | null;
  } | null;
};

type MeResponse = {
  ok: boolean;
  customer?: {
    id: string;
    phone: string;
    firstName?: string | null;
    lastName?: string | null;
    defaultTown?: {
      id: string;
      name: string;
      slug: string;
    } | null;
  } | null;
};

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

type FieldErrors = {
  phone?: string;
  selectedAddressId?: string;
  recipientName?: string;
  line1?: string;
  town?: string;
};

function money(n: number) {
  return n.toFixed(2);
}

function normalizeTown(value?: string | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function toTownSlug(value?: string | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function inputClass(hasError?: boolean) {
  return `w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:border-primary ${
    hasError ? "border-red-400 bg-red-50" : "border-slate-200"
  }`;
}

export default function CheckoutPage() {
  const params = useParams<{ townSlug: string }>();
  const router = useRouter();
  const townSlug = params?.townSlug;
  const searchParams = useSearchParams();
  const [highlightPlaceOrder, setHighlightPlaceOrder] = useState(false);
  const summaryRef = useRef<HTMLDivElement | null>(null);

  const [items, setItems] = useState<CartItem[]>([]);
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deliveryFee, setDeliveryFee] = useState(0);
  const [serviceFee, setServiceFee] = useState(0);
  const [minimumOrder, setMinimumOrder] = useState(0);
  const [currency, setCurrency] = useState("GHS");

  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<QuoteResponse["promo"]>(null);
  const [discount, setDiscount] = useState(0);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [promoMessage, setPromoMessage] = useState("");
  const [promoError, setPromoError] = useState("");

  const [customer, setCustomer] = useState<MeResponse["customer"]>(null);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [useSavedAddress, setUseSavedAddress] = useState(true);

  const [recipientName, setRecipientName] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [area, setArea] = useState("");
  const [addressTown, setAddressTown] = useState("");
  const [landmark, setLandmark] = useState("");
  const [notes, setNotes] = useState("");

  const [checkoutError, setCheckoutError] = useState("");
  const [addressError, setAddressError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    setItems(loadCart());
  }, []);

  useEffect(() => {
    async function loadCustomerContext() {
      try {
        const me = await apiFetch<MeResponse>("/customer-auth/me");
        if (!me?.ok || !me.customer) {
          setCustomer(null);
          setAddresses([]);
          setUseSavedAddress(false);
          return;
        }

        setCustomer(me.customer);
        setPhone((prev) => prev || me.customer?.phone || "");
        setRecipientName(
          `${me.customer.firstName ?? ""} ${me.customer.lastName ?? ""}`.trim()
        );

        try {
          const rows = await apiFetch<CustomerAddress[]>("/customers/me/addresses");
          setAddresses(rows);

          const preferred = rows.find((a) => a.isDefault) || rows[0] || null;

          if (preferred) {
            setSelectedAddressId(preferred.id);
            setUseSavedAddress(true);
          } else {
            setUseSavedAddress(false);
          }
        } catch {
          setAddresses([]);
          setUseSavedAddress(false);
        }
      } catch {
        setCustomer(null);
        setAddresses([]);
        setUseSavedAddress(false);
      }
    }

    void loadCustomerContext();
  }, []);

  useEffect(() => {
    const updated = searchParams.get("addressUpdated");

    if (updated === "1") {
      setTimeout(() => {
        summaryRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        setHighlightPlaceOrder(true);

        setTimeout(() => {
          setHighlightPlaceOrder(false);
        }, 2200);
      }, 250);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!townSlug) return;

    async function loadTownSettings() {
      try {
        const json = await apiFetch<TownSettingsResponse>(
          `/town-settings/by-slug/${encodeURIComponent(townSlug)}`,
          { cache: "no-store" }
        );

        setDeliveryFee(Number(json?.settings?.deliveryFee ?? 0));
        setServiceFee(Number(json?.settings?.serviceFee ?? 0));
        setMinimumOrder(Number(json?.settings?.minimumOrder ?? 0));
        setCurrency(json?.settings?.currency || "GHS");

        if (!addressTown) {
          setAddressTown(json?.town?.name || townSlug);
        }
      } catch {
        setDeliveryFee(0);
        setServiceFee(0);
        setMinimumOrder(0);
        setCurrency("GHS");
      }
    }

    void loadTownSettings();
  }, [townSlug, addressTown]);

  const localTotals = useMemo(() => {
    let subtotal = 0;

    for (const it of items) {
      if (it.pricingModel === "UNIT") {
        subtotal += Number(it.unitPrice) * it.quantity;
      } else if (it.pricingModel === "WEIGHT") {
        subtotal += (Number(it.pricePerKg) * it.weightGrams) / 1000;
      } else {
        subtotal += Number(it.unitPrice) * it.quantity;
      }
    }

    const preDiscountTotal = subtotal + serviceFee + deliveryFee;
    const total = Math.max(0, preDiscountTotal - discount);
    const belowMinimum = subtotal > 0 && subtotal < minimumOrder;

    return {
      subtotal,
      serviceFee,
      deliveryFee,
      discount,
      preDiscountTotal,
      total,
      belowMinimum,
    };
  }, [items, serviceFee, deliveryFee, minimumOrder, discount]);

  const selectedAddress = useMemo(
    () => addresses.find((a) => a.id === selectedAddressId) || null,
    [addresses, selectedAddressId]
  );

  const usingSavedAddress = useMemo(
    () => !!(customer && useSavedAddress && addresses.length > 0),
    [customer, useSavedAddress, addresses.length]
  );

  const effectiveTown = useMemo(() => {
    if (usingSavedAddress && selectedAddress) {
      return selectedAddress.town;
    }
    return addressTown;
  }, [usingSavedAddress, selectedAddress, addressTown]);

  const townMismatch = useMemo(() => {
    if (!townSlug) return false;
    if (!effectiveTown?.trim()) return false;
    return normalizeTown(effectiveTown) !== normalizeTown(townSlug);
  }, [effectiveTown, townSlug]);

  const canSubmit = useMemo(() => {
    if (items.length === 0) return false;
    if (isSubmitting) return false;
    if (localTotals.belowMinimum) return false;
    if (!phone.trim()) return false;
    if (townMismatch) return false;

    if (usingSavedAddress) {
      return !!selectedAddressId;
    }

    return !!recipientName.trim() && !!line1.trim() && !!addressTown.trim();
  }, [
    items.length,
    isSubmitting,
    localTotals.belowMinimum,
    phone,
    townMismatch,
    usingSavedAddress,
    selectedAddressId,
    recipientName,
    line1,
    addressTown,
  ]);

  useEffect(() => {
    if (canSubmit && highlightPlaceOrder) {
      setHighlightPlaceOrder(false);
    }
  }, [canSubmit, highlightPlaceOrder]);

  async function fetchQuote(code?: string) {
    if (!townSlug || items.length === 0) return null;

    const json = await apiFetch<QuoteResponse>("/orders/quote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        townSlug,
        promoCode: code?.trim() ? code.trim() : undefined,
        items: items.map((it) => ({
          townProductId: it.townProductId,
          townProductVariantId:
            it.pricingModel === "VARIANT" ? it.townProductVariantId : undefined,
          quantity:
            it.pricingModel === "UNIT" || it.pricingModel === "VARIANT"
              ? it.quantity
              : undefined,
          weightGrams: it.pricingModel === "WEIGHT" ? it.weightGrams : undefined,
        })),
      }),
    });

    return json;
  }

  async function applyPromo() {
    if (!townSlug) {
      setPromoError("Town not found.");
      setPromoMessage("");
      return;
    }

    if (items.length === 0) {
      setPromoError("Your cart is empty.");
      setPromoMessage("");
      setAppliedPromo(null);
      setDiscount(0);
      return;
    }

    if (!promoCode.trim()) {
      setPromoError("Enter a promo code.");
      setPromoMessage("");
      setAppliedPromo(null);
      setDiscount(0);
      return;
    }

    try {
      setIsApplyingPromo(true);
      setPromoError("");
      setPromoMessage("");

      const quote = await fetchQuote(promoCode.trim());

      if (!quote?.pricing) {
        throw new Error("Invalid quote response");
      }

      setDeliveryFee(Number(quote.pricing.deliveryFee ?? 0));
      setServiceFee(Number(quote.pricing.serviceFee ?? 0));
      setMinimumOrder(Number(quote.pricing.minimumOrder ?? 0));
      setCurrency(quote.pricing.currency || "GHS");
      setDiscount(Number(quote.pricing.discount ?? 0));
      setAppliedPromo(quote.promo ?? null);

      if (quote.promo?.code) {
        setPromoMessage(`Promo applied: ${quote.promo.code}`);
        setPromoError("");
      } else {
        setPromoError("Promo code is invalid or not applicable.");
        setPromoMessage("");
        setAppliedPromo(null);
        setDiscount(0);
      }
    } catch (err: any) {
      console.error("Apply promo failed:", err);
      setPromoError(err?.message || "Promo code is invalid or expired.");
      setPromoMessage("");
      setAppliedPromo(null);
      setDiscount(0);

      try {
        const quote = await fetchQuote();
        if (quote?.pricing) {
          setDeliveryFee(Number(quote.pricing.deliveryFee ?? 0));
          setServiceFee(Number(quote.pricing.serviceFee ?? 0));
          setMinimumOrder(Number(quote.pricing.minimumOrder ?? 0));
          setCurrency(quote.pricing.currency || "GHS");
        }
      } catch {
        // keep current values
      }
    } finally {
      setIsApplyingPromo(false);
    }
  }

  function validateForm() {
    const nextErrors: FieldErrors = {};

    if (!phone.trim()) {
      nextErrors.phone = "Phone number is required";
    }

    if (usingSavedAddress) {
      if (!selectedAddressId) {
        nextErrors.selectedAddressId = "Please select a saved address";
      }
    } else {
      if (!recipientName.trim()) {
        nextErrors.recipientName = "Recipient name is required";
      }
      if (!line1.trim()) {
        nextErrors.line1 = "Address line 1 is required";
      }
      if (!addressTown.trim()) {
        nextErrors.town = "Town is required";
      }
    }

    setFieldErrors(nextErrors);

    if (townMismatch) {
      setAddressError(
        `Your delivery address town (${effectiveTown}) does not match the selected market (${townSlug}). Please update the address or switch town.`
      );
    } else if (Object.keys(nextErrors).length > 0) {
      setAddressError("Please complete the highlighted fields.");
    } else {
      setAddressError("");
    }

    return Object.keys(nextErrors).length === 0 && !townMismatch;
  }

  async function placeOrder() {
    if (!townSlug) return;
    if (!items.length) return;
    if (localTotals.belowMinimum) return;

    setCheckoutError("");
    setAddressError("");

    const isValid = validateForm();

    if (!isValid) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setIsSubmitting(true);

      let finalPricing = {
        subtotal: localTotals.subtotal,
        serviceFee: localTotals.serviceFee,
        deliveryFee: localTotals.deliveryFee,
        total: localTotals.total,
        currency,
      };

      try {
        const quote = await fetchQuote(appliedPromo?.code || promoCode || undefined);
        if (quote?.pricing) {
          finalPricing = {
            subtotal: Number(quote.pricing.subtotal ?? 0),
            serviceFee: Number(quote.pricing.serviceFee ?? 0),
            deliveryFee: Number(quote.pricing.deliveryFee ?? 0),
            total: Number(quote.pricing.total ?? 0),
            currency: quote.pricing.currency || currency,
          };

          setDeliveryFee(Number(quote.pricing.deliveryFee ?? 0));
          setServiceFee(Number(quote.pricing.serviceFee ?? 0));
          setMinimumOrder(Number(quote.pricing.minimumOrder ?? 0));
          setCurrency(quote.pricing.currency || currency);
          setDiscount(Number(quote.pricing.discount ?? 0));
          setAppliedPromo(quote.promo ?? null);
        }
      } catch (err) {
        console.error("Quote refresh failed before placing order", err);
      }

      const body: any = {
        townSlug,
        phone,
        paymentMethod,
        items: items.map((it) => ({
          townProductId: it.townProductId,
          townProductVariantId:
            it.pricingModel === "VARIANT" ? it.townProductVariantId : undefined,
          quantity:
            it.pricingModel === "UNIT" || it.pricingModel === "VARIANT"
              ? it.quantity
              : undefined,
          weightGrams: it.pricingModel === "WEIGHT" ? it.weightGrams : undefined,
        })),
        promoCode: appliedPromo?.code || promoCode || undefined,
        pricing: {
          subtotal: finalPricing.subtotal,
          serviceFee: finalPricing.serviceFee,
          deliveryFee: finalPricing.deliveryFee,
          total: finalPricing.total,
          currency: finalPricing.currency,
        },
      };

      if (usingSavedAddress) {
        body.customerAddressId = selectedAddressId;
      } else {
        body.deliveryAddress = {
          recipientName: recipientName.trim(),
          phone: phone.trim(),
          line1: line1.trim(),
          line2: line2.trim() || undefined,
          area: area.trim() || undefined,
          town: addressTown.trim(),
          landmark: landmark.trim() || undefined,
          notes: notes.trim() || undefined,
        };
      }

      const json: any = await apiFetch("/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(body),
      });

      clearCart();

      if (json?.id) {
        router.push(`/${townSlug}/order/${json.id}`);
      } else {
        router.push(`/${townSlug}`);
      }
    } catch (err: any) {
      console.error(err);
      setCheckoutError(err?.message || "Failed to place order.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="pt-4 sm:pt-6">
      <CheckoutProgress step="checkout" />

      <div className="mt-5 flex items-center justify-between gap-3 sm:mt-6">
        <Link
          href={townSlug ? `/${townSlug}/cart` : "/"}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          ← Back to cart
        </Link>
      </div>

      <h1 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">
        Checkout
      </h1>

      {checkoutError ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {checkoutError}
        </div>
      ) : null}

      {addressError ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {addressError}
        </div>
      ) : null}

      <div className="mt-6 grid gap-5 sm:gap-6 lg:grid-cols-3">
        <div className="space-y-5 sm:space-y-6 lg:col-span-2">
          <Card className="rounded-2xl p-4 sm:p-6">
            <div className="text-xl font-semibold sm:text-2xl">Contact</div>
            <Separator className="my-4 sm:my-5" />

            {customer ? (
              <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                Logged in as {customer.firstName || customer.phone}
              </div>
            ) : (
              <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 px-4 py-4 text-sm text-slate-800">
                <div className="font-medium">Checking out as guest</div>

                <div className="mt-1 text-slate-600">
                  You can place your order without logging in, or sign in for a
                  faster experience.
                </div>

                {townSlug ? (
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Link
                      href={`/auth/login?redirect=${encodeURIComponent(`/${townSlug}/checkout`)}`}
                      className="w-full sm:w-auto"
                    >
                      <Button className="h-10 w-full rounded-xl bg-orange-500 text-white hover:bg-orange-600 sm:w-auto">
                        Login for faster checkout
                      </Button>
                    </Link>

                    <span className="text-xs text-slate-500">
                      Save addresses & checkout quicker
                    </span>
                  </div>
                ) : null}
              </div>
            )}

            <label className="mb-2 block text-sm font-medium">Phone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setCheckoutError("");
                setAddressError("");
                setFieldErrors((prev) => ({ ...prev, phone: undefined }));
              }}
              className={`max-w-xl ${inputClass(!!fieldErrors.phone)}`}
            />
            {fieldErrors.phone ? (
              <div className="mt-2 text-xs text-red-600">{fieldErrors.phone}</div>
            ) : null}

            <div className="mt-3 text-sm text-slate-500">
              Use a number the rider can reach you on.
            </div>
          </Card>

          <Card className="rounded-2xl p-4 sm:p-6">
            <div className="text-xl font-semibold sm:text-2xl">
              Delivery address
            </div>

            {customer && addresses.length > 0 ? (
              <div className="mb-4 mt-4 flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div>Using saved addresses for faster checkout</div>

                <Link
                  href="/account/addresses"
                  className="font-medium text-orange-600 hover:text-orange-700"
                >
                  Manage
                </Link>
              </div>
            ) : null}

            <Separator className="my-4 sm:my-5" />

            {customer && addresses.length > 0 ? (
              <div className="mb-5 space-y-3">
                <label className="flex items-start gap-2 text-sm sm:items-center">
                  <input
                    type="radio"
                    checked={useSavedAddress}
                    onChange={() => {
                      setUseSavedAddress(true);
                      setAddressError("");
                      setFieldErrors((prev) => ({
                        ...prev,
                        selectedAddressId: undefined,
                        recipientName: undefined,
                        line1: undefined,
                        town: undefined,
                      }));
                    }}
                  />
                  <span>Use a saved address</span>
                </label>

                <label className="flex items-start gap-2 text-sm sm:items-center">
                  <input
                    type="radio"
                    checked={!useSavedAddress}
                    onChange={() => {
                      setUseSavedAddress(false);
                      setAddressError("");
                      setFieldErrors((prev) => ({
                        ...prev,
                        selectedAddressId: undefined,
                      }));
                    }}
                  />
                  <span>Enter a new address</span>
                </label>
              </div>
            ) : null}

            {customer && useSavedAddress && addresses.length > 0 ? (
              <div className="space-y-4">
                <label className="mb-2 block text-sm font-medium">
                  Select saved address
                </label>

                <select
                  value={selectedAddressId}
                  onChange={(e) => {
                    setSelectedAddressId(e.target.value);
                    setAddressError("");
                    setFieldErrors((prev) => ({
                      ...prev,
                      selectedAddressId: undefined,
                    }));
                  }}
                  className={inputClass(!!fieldErrors.selectedAddressId)}
                >
                  <option value="">Select an address</option>
                  {addresses.map((addr) => (
                    <option key={addr.id} value={addr.id}>
                      {(addr.label || addr.recipientName) +
                        " — " +
                        addr.line1 +
                        ", " +
                        addr.town}
                    </option>
                  ))}
                </select>

                {fieldErrors.selectedAddressId ? (
                  <div className="text-xs text-red-600">
                    {fieldErrors.selectedAddressId}
                  </div>
                ) : null}

                {selectedAddress ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    <div className="font-medium">{selectedAddress.recipientName}</div>
                    <div>{selectedAddress.line1}</div>
                    {selectedAddress.line2 ? <div>{selectedAddress.line2}</div> : null}
                    {selectedAddress.area ? <div>{selectedAddress.area}</div> : null}
                    <div>{selectedAddress.town}</div>
                    {selectedAddress.landmark ? (
                      <div>Landmark: {selectedAddress.landmark}</div>
                    ) : null}
                    {selectedAddress.phone ? <div>Phone: {selectedAddress.phone}</div> : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="grid gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Recipient name
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => {
                      setRecipientName(e.target.value);
                      setAddressError("");
                      setFieldErrors((prev) => ({
                        ...prev,
                        recipientName: undefined,
                      }));
                    }}
                    className={inputClass(!!fieldErrors.recipientName)}
                  />
                  {fieldErrors.recipientName ? (
                    <div className="mt-2 text-xs text-red-600">
                      {fieldErrors.recipientName}
                    </div>
                  ) : null}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Address line 1
                  </label>
                  <input
                    type="text"
                    value={line1}
                    onChange={(e) => {
                      setLine1(e.target.value);
                      setAddressError("");
                      setFieldErrors((prev) => ({
                        ...prev,
                        line1: undefined,
                      }));
                    }}
                    className={inputClass(!!fieldErrors.line1)}
                  />
                  {fieldErrors.line1 ? (
                    <div className="mt-2 text-xs text-red-600">
                      {fieldErrors.line1}
                    </div>
                  ) : null}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Address line 2
                  </label>
                  <input
                    type="text"
                    value={line2}
                    onChange={(e) => {
                      setLine2(e.target.value);
                      setAddressError("");
                    }}
                    className={inputClass(false)}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Area</label>
                  <input
                    type="text"
                    value={area}
                    onChange={(e) => {
                      setArea(e.target.value);
                      setAddressError("");
                    }}
                    className={inputClass(false)}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Town</label>
                  <input
                    type="text"
                    value={addressTown}
                    onChange={(e) => {
                      setAddressTown(e.target.value);
                      setAddressError("");
                      setFieldErrors((prev) => ({
                        ...prev,
                        town: undefined,
                      }));
                    }}
                    className={inputClass(!!fieldErrors.town || townMismatch)}
                  />
                  {fieldErrors.town ? (
                    <div className="mt-2 text-xs text-red-600">{fieldErrors.town}</div>
                  ) : null}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Landmark
                  </label>
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => {
                      setLandmark(e.target.value);
                      setAddressError("");
                    }}
                    className={inputClass(false)}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => {
                      setNotes(e.target.value);
                      setAddressError("");
                    }}
                    className="min-h-[100px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>
            )}

            {townMismatch ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <div className="font-medium">Town mismatch detected</div>

                <div className="mt-1">
                  Your delivery address is in <strong>{effectiveTown}</strong>, but
                  you are shopping in <strong>{townSlug}</strong>.
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/account/addresses?redirect=${encodeURIComponent(`/${townSlug}/checkout`)}`
                      )
                    }
                    className="inline-flex items-center justify-center rounded-lg bg-amber-600 px-3 py-2 text-xs font-medium text-white hover:bg-amber-700"
                  >
                    Update address
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const nextTown = toTownSlug(effectiveTown);
                      if (nextTown) {
                        router.push(`/${nextTown}/checkout`);
                      }
                    }}
                    className="inline-flex items-center justify-center rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-100"
                  >
                    Switch to {effectiveTown}
                  </button>
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  After updating, you’ll be returned here automatically.
                </p>
              </div>
            ) : null}
          </Card>

          <Card className="rounded-2xl p-4 sm:p-6">
            <div className="text-xl font-semibold sm:text-2xl">
              Payment method (goods)
            </div>
            <Separator className="my-4 sm:my-5" />

            <label className="mb-2 block text-sm font-medium">
              Choose payment method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full max-w-xl rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary"
            >
              <option value="COD">COD (pay on delivery)</option>
              <option value="MOMO">MoMo on delivery</option>
            </select>

            <div className="mt-3 text-sm text-slate-500">
              Payment is collected on delivery.
            </div>
          </Card>

          <Card className="rounded-2xl p-4 sm:p-6">
            <div className="text-xl font-semibold sm:text-2xl">Promo code</div>
            <Separator className="my-4 sm:my-5" />

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => {
                  setPromoCode(e.target.value.toUpperCase());
                  setPromoError("");
                }}
                placeholder="Enter promo code"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary"
              />

              <Button
                type="button"
                onClick={() => void applyPromo()}
                disabled={isApplyingPromo}
                className="w-full sm:w-auto"
              >
                {isApplyingPromo ? "Applying..." : "Apply"}
              </Button>
            </div>

            {promoMessage ? (
              <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                {promoMessage}
              </div>
            ) : null}

            {promoError ? (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {promoError}
              </div>
            ) : null}

            {appliedPromo ? (
              <div className="mt-3 text-sm text-slate-600">
                Applied promo: <span className="font-medium">{appliedPromo.code}</span>{" "}
                ({appliedPromo.type})
              </div>
            ) : null}
          </Card>
        </div>

        <div className="lg:col-span-1" ref={summaryRef}>
          <Card className="rounded-2xl p-4 sm:p-6 lg:sticky lg:top-6">
            <div className="text-xl font-semibold sm:text-2xl">Summary</div>
            <Separator className="my-4 sm:my-5" />

            <div className="flex items-center justify-between text-sm text-slate-600">
              <div>Items</div>
              <div>{items.length}</div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-600">
              <div>Subtotal</div>
              <div className="text-right">
                {money(localTotals.subtotal)} {currency}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-600">
              <div>Service fee</div>
              <div className="text-right">
                {appliedPromo?.type === "SERVICE_FREE" ? (
                  <div className="font-medium text-green-700">FREE</div>
                ) : (
                  <div>
                    {money(localTotals.serviceFee)} {currency}
                  </div>
                )}
              </div>
            </div>

            {appliedPromo?.type === "SERVICE_FREE" ? (
              <div className="mt-2 text-xs text-green-600">
                Free service fee promo applied
              </div>
            ) : null}

            <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-600">
              <div>Delivery fee</div>
              <div className="text-right">
                {appliedPromo?.type === "DELIVERY_FREE" ? (
                  <div className="font-medium text-green-700">FREE</div>
                ) : (
                  <div>
                    {money(localTotals.deliveryFee)} {currency}
                  </div>
                )}
              </div>
            </div>

            {appliedPromo?.type === "DELIVERY_FREE" ? (
              <div className="mt-2 text-xs text-green-600">
                Free delivery promo applied
              </div>
            ) : null}

            {localTotals.discount > 0 ? (
              <>
                <div className="mt-4 flex items-center justify-between gap-3 text-sm text-green-700">
                  <div>Discount</div>
                  <div className="text-right">
                    -{money(localTotals.discount)} {currency}
                  </div>
                </div>

                <div className="mt-2 text-xs text-green-600">
                  You saved {money(localTotals.discount)} {currency}
                </div>
              </>
            ) : null}

            <Separator className="my-4 sm:my-5" />

            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-semibold sm:text-xl">Total</div>

              <div className="text-right">
                {localTotals.discount > 0 ? (
                  <div className="text-sm text-slate-400 line-through">
                    {money(localTotals.preDiscountTotal)} {currency}
                  </div>
                ) : null}

                <div className="text-xl font-extrabold sm:text-2xl">
                  {money(localTotals.total)} {currency}
                </div>
              </div>
            </div>

            {minimumOrder > 0 ? (
              <div className="mt-4 text-sm text-slate-500">
                Minimum order: {money(minimumOrder)} {currency}
              </div>
            ) : null}

            {localTotals.belowMinimum ? (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Your subtotal is below the minimum order for this town.
              </div>
            ) : null}

            {highlightPlaceOrder ? (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                Address updated successfully. You can now place your order.
              </div>
            ) : null}

            <Button
              className={`mt-6 w-full transition-all duration-300 ${
                highlightPlaceOrder ? "scale-[1.02] ring-4 ring-green-300 shadow-lg" : ""
              }`}
              onClick={placeOrder}
              disabled={!canSubmit}
            >
              {isSubmitting ? "Placing order..." : "Place order"}
            </Button>

           {!canSubmit ? (
  <div className="mt-3 text-xs text-slate-500">
    Complete the required fields before placing your order.
  </div>
) : null}

<div className="mt-4 text-sm text-slate-500">
  You’ll see your order confirmation immediately after placing the order.
</div>

<div className="mt-6 rounded-xl border border-orange-200 bg-orange-50 p-4">
  <div className="font-semibold text-slate-900">
    Need help before ordering?
  </div>

  <div className="mt-1 text-sm text-slate-600">
    Contact local support if you have questions about delivery,
    payments, products or your order.
  </div>

  <Link
    href={`/${townSlug}/contact`}
    className="mt-3 inline-flex items-center rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
  >
    Contact Support
  </Link>
</div>
          </Card>
        </div>
      </div>
    </div>
  );
}