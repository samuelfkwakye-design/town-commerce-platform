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

const howItWorks = [
  {
    title: "Choose your town",
    description: "Find your local market area and discover nearby sellers.",
    icon: MapPin,
  },
  {
    title: "Browse local products",
    description: "Shop groceries and everyday essentials from trusted sellers.",
    icon: Store,
  },
  {
    title: "Place your order",
    description: "Add items to cart and checkout in a few simple steps.",
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
    title: "Local sellers",
    description: "Fresh everyday items from nearby businesses.",
    icon: Store,
  },
  {
    title: "Careful packing",
    description: "Orders are handled neatly before delivery.",
    icon: CheckCircle2,
  },
  {
    title: "Fast delivery",
    description: "Built around convenient local fulfilment.",
    icon: Truck,
  },
  {
    title: "Simple checkout",
    description: "A smoother way to shop your local market.",
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

  const HeroImage = () => (
    <div className="relative">
      <div className="absolute -inset-3 rounded-[34px] bg-gradient-to-br from-orange-200/60 via-white to-slate-100 blur-2xl" />

      <div className="relative overflow-hidden rounded-[30px] border border-orange-100 bg-white p-2 shadow-2xl shadow-orange-100/50 sm:rounded-[34px] sm:p-3">
        <Image
          src="/hero/kostoma-hero-collage.png"
          alt="KOSTOMA local market delivery experience"
          width={1400}
          height={1100}
          priority
          className="aspect-[5/4] w-full rounded-[22px] object-cover sm:aspect-[4/3] sm:rounded-[26px] lg:aspect-[1.12/1]"
        />
      </div>

      
    </div>
  );

  const HeroActions = () => (
    <>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <a href="#towns" className="w-full sm:w-auto">
          <Button className="h-14 w-full rounded-2xl bg-[#0f172a] px-7 text-base font-bold text-white shadow-xl shadow-slate-900/10 hover:bg-[#1e293b] sm:w-auto">
            Choose Your Town
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </a>

        <a href="#how-it-works" className="w-full sm:w-auto">
          <Button
            variant="outline"
            className="h-14 w-full rounded-2xl border-slate-200 bg-white/90 px-7 text-base font-bold text-[#0f172a] shadow-sm hover:bg-white sm:w-auto"
          >
            Learn More
          </Button>
        </a>
      </div>

      <div className="mt-4 flex flex-wrap gap-2.5 text-sm text-slate-600">
        <div className="rounded-full border border-orange-100 bg-white/90 px-3.5 py-1.5 shadow-sm">
          Trusted local sellers
        </div>
        <div className="rounded-full border border-orange-100 bg-white/90 px-3.5 py-1.5 shadow-sm">
          Carefully packed
        </div>
        <div className="rounded-full border border-orange-100 bg-white/90 px-3.5 py-1.5 shadow-sm">
          Fast town delivery
        </div>
      </div>
    </>
  );

  return (
    <main className="min-h-screen overflow-hidden bg-[#fffaf5] text-[#0f172a]">
      <section className="relative border-b border-orange-100 bg-[radial-gradient(circle_at_top_left,#ffedd5_0,#fffaf5_34%,#ffffff_100%)]">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-orange-200/50 blur-3xl" />
        <div className="absolute -right-20 top-28 h-72 w-72 rounded-full bg-amber-100/80 blur-3xl" />
        <div className="absolute bottom-8 left-1/2 h-52 w-52 rounded-full bg-orange-100/70 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 pb-32 pt-10 sm:px-6 sm:pb-32 sm:pt-12 md:px-8 lg:pb-20">
          {/* MOBILE HERO */}
          <div className="lg:hidden">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-4 py-2 text-xs font-bold text-orange-700 shadow-sm backdrop-blur">
              <Sparkles className="h-4 w-4" />
              Local market delivery, reimagined
            </div>

            <div className="mt-5">
              <Image
                src="/brand/kostoma-logo.png"
                alt="KOSTOMA"
                width={700}
                height={220}
                priority
                className="h-auto w-full max-w-[440px] mix-blend-multiply"
              />
            </div>

            <h1 className="mt-7 text-[2.65rem] font-black leading-[0.96] tracking-tight text-[#0f172a]">
              Shop your local town market.
            </h1>

            <div className="mt-7">
              <HeroImage />
            </div>

            <p className="mt-6 text-[15px] leading-7 text-slate-700">
              Fresh everyday items from trusted local sellers and nearby
              businesses — carefully packed and delivered quickly to your
              doorstep.
            </p>

            <HeroActions />

            {!customerLoading && hydrated && preferredTown ? (
              <div className="mt-6 rounded-[28px] border border-orange-200 bg-white/90 p-4 shadow-sm backdrop-blur">
                <div className="text-sm font-semibold text-slate-600">
                  {customer?.defaultTown
                    ? customerName
                      ? `Welcome back, ${customerName}`
                      : "Your default town"
                    : "Continue where you left off"}
                </div>

                <div className="mt-1 break-words text-xl font-black text-[#0f172a]">
                  {preferredTown.name}
                </div>

                <div className="mt-4 flex flex-col gap-3">
                  <Link href={`/${preferredTown.slug}`} className="w-full">
                    <Button className="h-12 w-full rounded-2xl bg-orange-500 px-5 font-bold text-white hover:bg-orange-600">
                      Continue in {preferredTown.name}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>

                  <a href="#towns" className="w-full">
                    <Button
                      variant="outline"
                      className="h-12 w-full rounded-2xl border-orange-200 bg-white px-5 font-bold text-[#0f172a] hover:bg-orange-50"
                    >
                      Choose another town
                    </Button>
                  </a>
                </div>
              </div>
            ) : null}
          </div>

          {/* DESKTOP HERO */}
          <div className="hidden items-center gap-12 lg:grid lg:grid-cols-[0.95fr_1.05fr]">
            <div className="flex flex-col">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-4 py-2 text-sm font-bold text-orange-700 shadow-sm backdrop-blur">
                <Sparkles className="h-4 w-4" />
                Local market delivery, reimagined
              </div>

              <div className="mt-5">
                <Image
                  src="/brand/kostoma-logo.png"
                  alt="KOSTOMA"
                  width={700}
                  height={220}
                  priority
                  className="h-auto w-full max-w-[520px] mix-blend-multiply"
                />
              </div>

              <h1 className="mt-7 max-w-2xl text-7xl font-black leading-[0.96] tracking-tight text-[#0f172a]">
                Shop your local town market.
              </h1>

              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-700">
                Fresh everyday items from trusted local sellers and nearby
                businesses — carefully packed and delivered quickly to your
                doorstep.
              </p>

              <HeroActions />

              {!customerLoading && hydrated && preferredTown ? (
                <div className="mt-6 rounded-[28px] border border-orange-200 bg-white/90 p-4 shadow-sm backdrop-blur">
                  <div className="text-sm font-semibold text-slate-600">
                    {customer?.defaultTown
                      ? customerName
                        ? `Welcome back, ${customerName}`
                        : "Your default town"
                      : "Continue where you left off"}
                  </div>

                  <div className="mt-1 break-words text-xl font-black text-[#0f172a]">
                    {preferredTown.name}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link href={`/${preferredTown.slug}`}>
                      <Button className="h-12 rounded-2xl bg-orange-500 px-5 font-bold text-white hover:bg-orange-600">
                        Continue in {preferredTown.name}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>

                    <a href="#towns">
                      <Button
                        variant="outline"
                        className="h-12 rounded-2xl border-orange-200 bg-white px-5 font-bold text-[#0f172a] hover:bg-orange-50"
                      >
                        Choose another town
                      </Button>
                    </a>
                  </div>
                </div>
              ) : null}
            </div>

            <HeroImage />
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:mt-10 sm:grid-cols-3">
            <div className="rounded-3xl border border-orange-100 bg-white/90 p-5 shadow-sm backdrop-blur">
              <div className="text-2xl font-black text-orange-500">Local</div>
              <div className="mt-1 text-sm leading-6 text-slate-600">
                Town-based shopping
              </div>
            </div>

            <div className="rounded-3xl border border-orange-100 bg-white/90 p-5 shadow-sm backdrop-blur">
              <div className="text-2xl font-black text-orange-500">Fast</div>
              <div className="mt-1 text-sm leading-6 text-slate-600">
                Quick local delivery
              </div>
            </div>

            <div className="rounded-3xl border border-orange-100 bg-white/90 p-5 shadow-sm backdrop-blur">
              <div className="text-2xl font-black text-orange-500">Simple</div>
              <div className="mt-1 text-sm leading-6 text-slate-600">
                Smooth checkout
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {trustItems.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-[28px] border border-orange-100 bg-white/90 p-5 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="mb-4 inline-flex rounded-2xl bg-orange-50 p-3 text-orange-500">
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="font-black text-[#0f172a]">{item.title}</div>

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
        className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-18 md:px-8"
      >
        <div className="mb-8 max-w-2xl sm:mb-10">
          <div className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-orange-500">
            How KOSTOMA works
          </div>

          <h2 className="text-3xl font-black tracking-tight text-[#0f172a] sm:text-4xl md:text-5xl">
            Local shopping made simpler
          </h2>

          <p className="mt-4 text-base leading-7 text-slate-600">
            Choose your town, browse trusted local sellers and get everyday
            essentials delivered quickly and conveniently.
          </p>
        </div>

        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-4">
          {howItWorks.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <Card
                key={feature.title}
                className="rounded-[30px] border-orange-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <CardContent className="p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <div className="inline-flex rounded-2xl bg-orange-50 p-3 text-orange-500">
                      <Icon className="h-6 w-6" />
                    </div>

                    <div className="text-4xl font-black text-orange-100">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                  </div>

                  <h3 className="text-xl font-black text-[#0f172a]">
                    {feature.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
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
        className="border-t border-orange-100 bg-[#fff7ed]/60 px-4 py-14 sm:px-6 sm:py-18 md:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 max-w-2xl sm:mb-10">
            <div className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-orange-500">
              Choose your town
            </div>

            <h2 className="text-3xl font-black tracking-tight text-[#0f172a] sm:text-4xl md:text-5xl">
              Enter your local market
            </h2>

            <p className="mt-4 text-base leading-7 text-slate-600">
              Start typing to see suggested towns. KOSTOMA is expanding town by
              town, making local shopping simpler for every community.
            </p>
          </div>

          <div ref={wrapperRef} className="relative mb-8 max-w-2xl">
            <div className="flex items-center gap-3 rounded-[28px] border border-orange-200 bg-white px-4 py-3.5 shadow-sm">
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
                className="w-full border-none bg-transparent text-base font-medium outline-none placeholder:font-normal placeholder:text-slate-400"
              />
            </div>

            {open && query.trim().length > 0 ? (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-xl">
                {filteredTowns.length > 0 ? (
                  filteredTowns.slice(0, 8).map((town) => (
                    <Link
                      key={town.id}
                      href={`/${town.slug}`}
                      className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5 transition hover:bg-orange-50 last:border-b-0"
                      onClick={() => setOpen(false)}
                    >
                      <div className="inline-flex shrink-0 rounded-2xl bg-orange-50 p-2.5 text-orange-500">
                        <MapPin className="h-4 w-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="truncate font-bold text-[#0f172a]">
                          {town.name}
                        </div>

                        <div className="text-xs text-slate-500">
                          /{town.slug}
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="px-4 py-4 text-sm leading-6 text-slate-500">
                    We could not find that town yet. KOSTOMA is expanding into
                    more towns soon.
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {loading ? (
            <div className="rounded-[30px] border border-orange-100 bg-white p-6 text-slate-600 shadow-sm">
              <div className="font-black text-[#0f172a]">
                Finding available towns...
              </div>

              <div className="mt-2 text-sm text-slate-500">
                KOSTOMA is expanding town by town across the UK.
              </div>
            </div>
          ) : error ? (
            <div className="rounded-[30px] border border-red-200 bg-white p-6 text-red-600 shadow-sm">
              {error}
            </div>
          ) : featuredTowns.length === 0 ? (
            <div className="rounded-[30px] border border-orange-100 bg-white p-6 text-slate-600 shadow-sm">
              KOSTOMA is expanding into more towns soon.
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
              {featuredTowns.map((town) => (
                <Card
                  key={town.id}
                  className="overflow-hidden rounded-[30px] border border-orange-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="h-2 w-full bg-gradient-to-r from-[#0f172a] to-orange-500" />

                  <CardContent className="p-6">
                    <div className="mb-4 inline-flex rounded-2xl bg-orange-50 p-3 text-orange-500">
                      <MapPin className="h-5 w-5" />
                    </div>

                    <h3 className="break-words text-2xl font-black text-[#0f172a]">
                      {town.name}
                    </h3>

                    <p className="mt-3 min-h-[48px] text-sm leading-6 text-slate-600">
                      Shop fresh everyday items from local sellers in{" "}
                      {town.name}.
                    </p>

                    <Link href={`/${town.slug}`} className="mt-5 block">
                      <Button className="h-12 w-full rounded-2xl bg-orange-500 font-bold text-white hover:bg-orange-600">
                        Enter {town.name}
                        <ArrowRight className="ml-2 h-4 w-4" />
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
            <span className="font-black text-orange-500">KOSTOMA</span>{" "}
            <span className="text-[#0f172a]">— Yɛ bɛto ama wo.</span>
          </div>

          <div>Local shopping made simple.</div>
        </div>
      </footer>
    </main>
  );
}