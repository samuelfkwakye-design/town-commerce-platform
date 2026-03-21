"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import InstantSearchResults from "@/components/InstantSearchResults";
import {
  getCartItemCount,
  getCartUpdatedEventName,
  loadCart,
} from "@/lib/cart";
import { apiFetch } from "@/lib/api";
import type { SearchableCategory, SearchableProduct } from "@/lib/types";

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

type TownOption = {
  id: string;
  name: string;
  slug: string;
  isActive?: boolean;
};

function titleCaseFromSlug(slug?: string) {
  const safe = (slug ?? "").trim();
  if (!safe) return "Market";

  return safe
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function TownHeader({
  townSlug,
  categories = [],
  products = [],
  onCartClick,
}: {
  townSlug: string;
  categories?: SearchableCategory[];
  products?: SearchableProduct[];
  onCartClick?: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchWrapperRef = useRef<HTMLDivElement | null>(null);
  const townMenuRef = useRef<HTMLDivElement | null>(null);

  const currentSearch = searchParams.get("search") ?? "";
  const currentCategorySlug = searchParams.get("categorySlug") ?? "";

  const [search, setSearch] = useState(currentSearch);
  const [open, setOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  const [customer, setCustomer] = useState<CustomerMe | null>(null);
  const [customerLoading, setCustomerLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const [towns, setTowns] = useState<TownOption[]>([]);
  const [townsOpen, setTownsOpen] = useState(false);
  const [townQuery, setTownQuery] = useState("");

  const townLabel = useMemo(() => titleCaseFromSlug(townSlug), [townSlug]);

  useEffect(() => {
    setSearch(currentSearch);
  }, [currentSearch]);

  useEffect(() => {
    const refreshCart = () => {
      setCartCount(getCartItemCount(loadCart()));
    };

    refreshCart();

    const eventName = getCartUpdatedEventName();
    window.addEventListener(eventName, refreshCart);

    return () => {
      window.removeEventListener(eventName, refreshCart);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem("somame:lastTownSlug", townSlug);
    } catch {
      // ignore storage errors
    }
  }, [townSlug]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        searchWrapperRef.current &&
        !searchWrapperRef.current.contains(target)
      ) {
        setOpen(false);
      }

      if (townMenuRef.current && !townMenuRef.current.contains(target)) {
        setTownsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setTownsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
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

        const activeTowns = rows.filter(
          (town: TownOption) => town?.isActive !== false
        );

        if (!cancelled) {
          setTowns(activeTowns);
        }
      } catch {
        if (!cancelled) {
          setTowns([]);
        }
      }
    }

    loadTowns();

    return () => {
      cancelled = true;
    };
  }, []);

  function buildHref(nextSearch: string, keepCategory = true) {
    const params = new URLSearchParams();

    const trimmed = nextSearch.trim();
    if (trimmed) params.set("search", trimmed);

    if (keepCategory && currentCategorySlug) {
      params.set("categorySlug", currentCategorySlug);
    }

    const qs = params.toString();
    return qs ? `/${townSlug}?${qs}` : `/${townSlug}`;
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setOpen(false);
    router.push(buildHref(search, true));
  }

  function clearSearch() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("search");

    const qs = params.toString();

    setSearch("");
    setOpen(false);

    router.push(qs ? `/${townSlug}?${qs}` : `/${townSlug}`);
  }

  async function handleLogout() {
    try {
      setLogoutLoading(true);

      await apiFetch("/customer-auth/logout", {
        method: "POST",
        credentials: "include",
      });

      setCustomer(null);
      router.refresh();
      router.push(`/${townSlug}`);
    } finally {
      setLogoutLoading(false);
    }
  }

  async function handleTownSwitch(town: TownOption) {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("somame:lastTownSlug", town.slug);
      }

      if (customer?.id) {
        await apiFetch("/customers/me/default-town", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            defaultTownId: town.id,
          }),
        });

        setCustomer((prev) =>
          prev
            ? {
                ...prev,
                defaultTownId: town.id,
                defaultTown: {
                  id: town.id,
                  name: town.name,
                  slug: town.slug,
                },
              }
            : prev
        );
      }
    } catch {
      // ignore backend update failure and still navigate
    } finally {
      setTownsOpen(false);
      setTownQuery("");
      router.push(`/${town.slug}`);
      router.refresh();
    }
  }

  const hasInstantResults = search.trim().length > 0;

  const displayName =
    customer?.firstName?.trim() ||
    customer?.lastName?.trim() ||
    (customer?.email ? customer.email.split("@")[0] : null) ||
    customer?.phone?.trim() ||
    "Customer";

  const filteredTowns = useMemo(() => {
    const q = townQuery.trim().toLowerCase();

    if (!q) {
      return towns.filter((town) => town.slug !== townSlug).slice(0, 8);
    }

    return towns
      .filter((town) => {
        if (town.slug === townSlug) return false;
        return (
          town.name.toLowerCase().includes(q) ||
          town.slug.toLowerCase().includes(q)
        );
      })
      .slice(0, 8);
  }, [towns, townQuery, townSlug]);

  return (
    <nav className="sticky top-0 z-40 border-b border-black/10 bg-gradient-to-r from-[#111827] to-[#020617] text-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-4">
        <div className="shrink-0">
          <Link href={`/${townSlug}`}>
            <div className="text-2xl font-extrabold tracking-tight text-orange-500">
              Somame
            </div>
          </Link>

          <div ref={townMenuRef} className="relative mt-1">
            <button
              type="button"
              onClick={() => {
                setTownsOpen((v) => !v);
                setTownQuery("");
              }}
              className="text-sm text-slate-300 transition hover:text-white"
            >
              {townLabel === "Market" ? "Market" : `${townLabel} Market`} ▼
            </button>

            {townsOpen ? (
              <div className="absolute left-0 mt-2 w-72 rounded-2xl border border-slate-700 bg-slate-900 p-3 shadow-xl">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                  Switch town
                </div>

                <input
                  type="text"
                  value={townQuery}
                  onChange={(e) => setTownQuery(e.target.value)}
                  placeholder="Search town..."
                  className="mb-3 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-400 focus:border-orange-400"
                />

                <div className="mb-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2">
                  <div className="text-xs text-slate-400">Current town</div>
                  <div className="text-sm font-medium text-orange-400">
                    {townLabel === "Market" ? "Market" : `${townLabel} Market`}
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto rounded-xl">
                  {filteredTowns.length > 0 ? (
                    filteredTowns.map((town) => (
                      <button
                        key={town.id}
                        type="button"
                        onClick={() => handleTownSwitch(town)}
                        className="block w-full rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-slate-800"
                      >
                        <div className="font-medium">{town.name}</div>
                        <div className="text-xs text-slate-400">/{town.slug}</div>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-xl px-3 py-3 text-sm text-slate-400">
                      No matching towns found.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="relative mx-auto flex w-full max-w-3xl items-center gap-2"
          role="search"
        >
          <div ref={searchWrapperRef} className="relative flex-1">
            <input
              name="search"
              value={search}
              onChange={(e) => {
                const value = e.target.value;
                setSearch(value);

                if (value.trim().length > 0) {
                  setOpen(true);
                } else {
                  setOpen(false);
                }
              }}
              onFocus={() => {
                if (search.trim()) setOpen(true);
              }}
              placeholder="Search groceries, drinks, snacks..."
              className="w-full rounded-2xl border border-slate-600 bg-white px-5 py-3 text-slate-900 outline-none transition focus:border-orange-400"
              autoComplete="off"
            />

            {open && hasInstantResults ? (
              <InstantSearchResults
                townSlug={townSlug}
                query={search}
                products={products}
                categories={categories}
                onSelect={() => setOpen(false)}
              />
            ) : null}
          </div>

          <Button
            type="submit"
            className="rounded-2xl bg-orange-500 px-6 py-3 text-white transition hover:bg-orange-600"
          >
            Search
          </Button>

          {currentSearch ? (
            <button
              type="button"
              onClick={clearSearch}
              className="rounded-2xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-700"
            >
              Clear
            </button>
          ) : null}
        </form>

        <div className="flex shrink-0 items-center gap-2">
          {customerLoading ? null : customer ? (
            <>
              <div className="hidden rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm text-slate-100 md:block">
                Hello{" "}
                <span className="font-semibold text-orange-400">
                  {displayName}
                </span>{" "}
                👋
              </div>

              <button
                type="button"
                onClick={handleLogout}
                disabled={logoutLoading}
                className="hidden rounded-2xl border border-slate-600 bg-slate-800 px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-700 sm:inline"
              >
                {logoutLoading ? "Logging out..." : "Logout"}
              </button>
            </>
          ) : (
            <>
              <Link
                href={`/auth/login?redirect=/${townSlug}`}
                className="hidden sm:inline"
              >
                <Button variant="secondary" className="rounded-2xl px-5 py-3">
                  Login
                </Button>
              </Link>

              <Link
                href={`/auth/register?redirect=/${townSlug}`}
                className="hidden sm:inline"
              >
                <Button variant="secondary" className="rounded-2xl px-5 py-3">
                  Register
                </Button>
              </Link>
            </>
          )}

          {onCartClick ? (
            <Button
              type="button"
              onClick={onCartClick}
              className="rounded-2xl bg-orange-500 px-6 py-3 text-white transition hover:bg-orange-600"
            >
              Cart ({cartCount})
            </Button>
          ) : (
            <Link href={`/${townSlug}/cart`}>
              <Button className="rounded-2xl bg-orange-500 px-6 py-3 text-white transition hover:bg-orange-600">
                Cart ({cartCount})
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}