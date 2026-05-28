"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  MapPin,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";

type Town = {
  id: string;
  name: string;
  slug: string;
  isActive?: boolean;
};

type CustomerMe = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  defaultTownId?: string | null;
  defaultTown?: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

const features = [
  {
    title: "Choose your town",
    description: "Find your local market area and discover nearby sellers.",
    icon: MapPin,
  },
  {
    title: "Browse local products",
    description:
      "Shop fresh groceries and everyday essentials from trusted sellers.",
    icon: Store,
  },
  {
    title: "Place your order",
    description:
      "Add items to cart and checkout with a smooth mobile-friendly experience.",
    icon: ShoppingBag,
  },
  {
    title: "Get it delivered",
    description: "Your order is picked, packed and delivered with care.",
    icon: Truck,
  },
];

const trustItems = [
  {
    title: "Trusted local sellers",
    description: "Fresh everyday items from nearby businesses.",
    icon: Store,
  },
  {
    title: "Fast town delivery",
    description: "Built around local fulfilment and convenience.",
    icon: Truck,
  },
  {
    title: "Secure checkout",
    description: "A simple, smoother ordering experience.",
    icon: ShieldCheck,
  },
];

export default function Page() {
  const [towns, setTowns] = useState<Town[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const [customer, setCustomer] = useState<CustomerMe | null>(null);
  const [customerLoading, setCustomerLoading] = useState(true);

  const [lastTownSlug, setLastTownSlug] = useState("");
  const [hydrated, setHydrated] = useState(false);

  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setHydrated(true);

    try {
      const saved = window.localStorage.getItem("somame:lastTownSlug") || "";
      setLastTownSlug(saved);
    } catch {
      setLastTownSlug("");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCustomer() {
      try {
        setCustomerLoading(true);

        const data: any = await apiFetch("/customer-auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!cancelled) {
          setCustomer(data?.customer ?? null);
        }
      } catch {
        if (!cancelled) {
          setCustomer(null);
        }
      } finally {
        if (!cancelled) {
          setCustomerLoading(false);
        }
      }
    }

    loadCustomer();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadTowns() {
      try {
        setLoading(true);
        setError("");

        const data: any = await apiFetch("/towns", {
          cache: "no-store",
        });

        const rows = Array.isArray(data)
          ? data
          : Array.isArray(data?.rows)
            ? data.rows
            : Array.isArray(data?.data)
              ? data.data
              : [];

        const activeTowns = rows.filter((town: Town) => town?.isActive !== false);

        if (!cancelled) {
          setTowns(activeTowns);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Could not load towns");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTowns();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const filteredTowns = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return towns;

    return towns.filter((town) => {
      return (
        town.name.toLowerCase().includes(q) ||
        town.slug.toLowerCase().includes(q)
      );
    });
  }, [towns, query]);

  const featuredTowns = useMemo(() => filteredTowns.slice(0, 9), [filteredTowns]);

  const rememberedTown = useMemo(() => {
    if (!lastTownSlug) return null;
    return towns.find((t) => t.slug === lastTownSlug) ?? null;
  }, [towns, lastTownSlug]);

  const preferredTown = customer?.defaultTown ?? rememberedTown ?? null;
  const customerName =
    customer?.firstName?.trim() ||
    customer?.lastName?.trim() ||
    (customer?.email ? customer.email.split("@")[0] : null) ||
    customer?.phone?.trim() ||
    null;

  return (
    <main className="min-h-screen bg-[#fffaf5] text-slate-900">
      <section className="relative overflow-hidden border-b border-orange-100 bg-gradient-to-b from-[#fff7ed] via-[#fffaf5] to-white">
        <div className="absolute -left-20 top-10 h-64 w-64 rounded-full bg-orange-100/70 blur-3xl" />
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-orange-200/30 blur-3xl" />
        <div className="absolute bottom-10 right-1/3 h-44 w-44 rounded-full bg-amber-100/60 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 md:px-8 md:py-20">
          <div className="grid items-center gap-8 sm:gap-10 lg:grid-cols-2 lg:gap-12">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-4 py-2 text-xs font-semibold text-orange-700 shadow-sm sm:text-sm">
                <Sparkles className="h-4 w-4" />
                Local market delivery, reimagined
              </div>

              <div className="mb-4 mt-2">
                <Image
                  src="/brand/kostoma-logo.png"
                  alt="KOSTOMA"
                  width={700}
                  height={220}
                  priority
                  className="h-auto w-full max-w-[700px]"
                />
              </div>

              <h1 className="max-w-2xl text-4xl font-black tracking-tight text-[#0f172a] sm:text-5xl md:text-6xl">
                Shop your local town market.
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-700 sm:text-base md:text-lg">
                Fresh everyday items from trusted local sellers and nearby
                businesses — delivered quickly to your doorstep. Shop your local
                town market in a simpler, more connected way.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:gap-4">
                <a href="#towns" className="w-full sm:w-auto">
                  <Button className="h-12 w-full rounded-2xl bg-[#0f172a] px-6 text-base font-semibold text-white hover:bg-[#1e293b] sm:w-auto">
                    Choose Your Town
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </a>

                <a href="#how-it-works" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    className="h-12 w-full rounded-2xl border-[#0f172a]/20 bg-white px-6 text-base font-semibold text-[#0f172a] hover:bg-[#0f172a]/5 sm:w-auto"
                  >
                    Learn More
                  </Button>
                </a>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <div className="rounded-full border border-orange-100 bg-white px-3 py-1 shadow-sm">
                  Trusted local sellers
                </div>
                <div className="rounded-full border border-orange-100 bg-white px-3 py-1 shadow-sm">
                  Fast town delivery
                </div>
                <div className="rounded-full border border-orange-100 bg-white px-3 py-1 shadow-sm">
                  Simple checkout
                </div>
              </div>

              {!customerLoading && hydrated && preferredTown ? (
                <div className="mt-6 rounded-3xl border border-orange-200 bg-white p-4 shadow-sm">
                  <div className="text-sm font-medium text-slate-600">
                    {customer?.defaultTown
                      ? customerName
                        ? `Welcome back, ${customerName}`
                        : "Your default town"
                      : "Continue where you left off"}
                  </div>

                  <div className="mt-1 break-words text-xl font-bold text-[#0f172a]">
                    {preferredTown.name}
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <Link
                      href={`/${preferredTown.slug}`}
                      className="w-full sm:w-auto"
                    >
                      <Button className="h-11 w-full rounded-2xl bg-orange-500 px-5 font-semibold text-white hover:bg-orange-600 sm:w-auto">
                        Continue in {preferredTown.name}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>

                    <a href="#towns" className="w-full sm:w-auto">
                      <Button
                        variant="outline"
                        className="h-11 w-full rounded-2xl border-orange-200 bg-white px-5 font-semibold text-[#0f172a] hover:bg-orange-50 sm:w-auto"
                      >
                        Choose another town
                      </Button>
                    </a>
                  </div>
                </div>
              ) : null}

              <div className="mt-8 grid max-w-xl grid-cols-1 gap-4 sm:mt-10 sm:grid-cols-3">
                <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
                  <div className="text-2xl font-bold text-orange-500">Local</div>
                  <div className="mt-1 text-sm text-slate-600">
                    Town-based shopping experience
                  </div>
                </div>

                <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
                  <div className="text-2xl font-bold text-orange-500">Fast</div>
                  <div className="mt-1 text-sm text-slate-600">
                    Quick order pickup and delivery
                  </div>
                </div>

                <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
                  <div className="text-2xl font-bold text-orange-500">Simple</div>
                  <div className="mt-1 text-sm text-slate-600">
                    Easy checkout and smooth navigation
                  </div>
                </div>
              </div>
            </div>

           <div className="lg:justify-self-end">
  <div className="overflow-hidden rounded-[32px] border border-orange-100 bg-white p-3 shadow-2xl shadow-orange-100/40">
    <Image
      src="/hero/kostoma-hero-collage.png"
      alt="KOSTOMA local market delivery experience"
      width={1400}
      height={1100}
      priority
      className="h-auto w-full rounded-[24px] object-cover"
    />
  </div>
</div>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {trustItems.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-3xl border border-orange-100 bg-white/90 p-5 shadow-sm"
                >
                  <div className="mb-3 inline-flex rounded-2xl bg-orange-50 p-3 text-orange-500">
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="font-bold text-[#0f172a]">{item.title}</div>

                  <div className="mt-1 text-sm leading-6 text-slate-600">
                    {item.description}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 md:px-8"
      >
        <div className="mb-8 max-w-2xl sm:mb-10">
          <div className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-orange-500">
            How KOSTOMA works
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-[#0f172a] sm:text-3xl md:text-4xl">
            Local shopping made simpler
          </h2>

          <p className="mt-4 text-sm text-slate-600 sm:text-base">
            Choose your town, browse trusted local sellers and get everyday
            essentials delivered quickly and conveniently.
          </p>
        </div>

        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <Card
                key={feature.title}
                className="rounded-3xl border-orange-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <CardContent className="p-5 sm:p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="inline-flex rounded-2xl bg-orange-50 p-3 text-orange-500">
                      <Icon className="h-6 w-6" />
                    </div>

                    <div className="text-3xl font-black text-orange-100">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-[#0f172a]">
                    {feature.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section
        id="towns"
        className="border-t border-orange-100 bg-[#fff7ed]/50 px-4 py-12 sm:px-6 sm:py-16 md:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 max-w-2xl sm:mb-10">
            <div className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-orange-500">
              Choose your town
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-[#0f172a] sm:text-3xl md:text-4xl">
              Enter your local market
            </h2>

            <p className="mt-4 text-sm text-slate-600 sm:text-base">
              Start typing to see suggested towns. KOSTOMA is expanding town by
              town, making local shopping simpler for every community.
            </p>
          </div>

          <div ref={wrapperRef} className="relative mb-8 max-w-2xl">
            <div className="flex items-center gap-3 rounded-3xl border border-orange-200 bg-white px-4 py-3 shadow-sm">
              <Search className="h-5 w-5 shrink-0 text-orange-500" />

              <input
                type="text"
                placeholder="Search for your town..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                className="w-full border-none bg-transparent text-base outline-none placeholder:text-slate-400"
              />
            </div>

            {open && query.trim().length > 0 ? (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-xl">
                {filteredTowns.length > 0 ? (
                  filteredTowns.slice(0, 8).map((town) => (
                    <Link
                      key={town.id}
                      href={`/${town.slug}`}
                      className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 transition hover:bg-orange-50 last:border-b-0"
                      onClick={() => setOpen(false)}
                    >
                      <div className="inline-flex shrink-0 rounded-xl bg-orange-50 p-2 text-orange-500">
                        <MapPin className="h-4 w-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="truncate font-medium text-[#0f172a]">
                          {town.name}
                        </div>

                        <div className="text-xs text-slate-500">
                          /{town.slug}
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="px-4 py-4 text-sm text-slate-500">
                    We could not find that town yet. KOSTOMA is expanding into
                    more towns soon.
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {loading ? (
            <div className="rounded-3xl border border-orange-100 bg-white p-5 text-slate-600 shadow-sm sm:p-6">
              <div className="font-medium text-[#0f172a]">
                Finding available towns...
              </div>

              <div className="mt-2 text-sm text-slate-500">
                KOSTOMA is expanding town by town across the UK.
              </div>
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-red-200 bg-white p-5 text-red-600 shadow-sm sm:p-6">
              {error}
            </div>
          ) : featuredTowns.length === 0 ? (
            <div className="rounded-3xl border border-orange-100 bg-white p-5 text-slate-600 shadow-sm sm:p-6">
              KOSTOMA is expanding into more towns soon.
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
              {featuredTowns.map((town) => (
                <Card
                  key={town.id}
                  className="overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="h-2 w-full bg-gradient-to-r from-[#0f172a] to-orange-500" />

                  <CardContent className="p-5 sm:p-6">
                    <div className="mb-4 inline-flex rounded-2xl bg-orange-50 p-3 text-orange-500">
                      <MapPin className="h-5 w-5" />
                    </div>

                    <h3 className="break-words text-xl font-bold text-[#0f172a] sm:text-2xl">
                      {town.name}
                    </h3>

                    <p className="mt-3 min-h-[48px] text-sm leading-6 text-slate-600">
                      Shop fresh everyday items from local sellers in{" "}
                      {town.name}.
                    </p>

                    <Link href={`/${town.slug}`} className="mt-5 block">
                      <Button className="h-11 w-full rounded-2xl bg-orange-500 font-semibold text-white hover:bg-orange-600">
                        Enter {town.name}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      <footer className="border-t border-orange-100 bg-white px-4 py-8 sm:px-6 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="font-semibold text-orange-500">KOSTOMA</span>{" "}
            <span className="text-[#0f172a]">— Yɛ bɛto ama wo.</span>
          </div>

          <div>Local shopping made simple.</div>
        </div>
      </footer>
    </main>
  );
}