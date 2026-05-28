"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Lock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

type Town = {
  id: string;
  name: string;
  slug: string;
  isActive?: boolean;
};

function RegisterPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirect = searchParams.get("redirect") || "/asamankese";

  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [defaultTownId, setDefaultTownId] = useState("");

  const [towns, setTowns] = useState<Town[]>([]);
  const [townsLoading, setTownsLoading] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadTowns() {
      try {
        setTownsLoading(true);

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

          const redirectSlug = redirect.replace(/^\//, "");
          const matchedTown = activeTowns.find(
            (town: Town) => town.slug === redirectSlug
          );

          if (matchedTown) {
            setDefaultTownId(matchedTown.id);
          }
        }
      } catch {
        if (!cancelled) {
          setTowns([]);
        }
      } finally {
        if (!cancelled) {
          setTownsLoading(false);
        }
      }
    }

    loadTowns();

    return () => {
      cancelled = true;
    };
  }, [redirect]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await apiFetch("/customer-auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          phone: phone.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim() || undefined,
          email: email.trim() || undefined,
          password,
          defaultTownId: defaultTownId || undefined,
        }),
      });

      router.push(`/auth/login?redirect=${encodeURIComponent(redirect)}`);
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#fffaf5] text-[#0f172a]">
      <section className="relative min-h-screen bg-[radial-gradient(circle_at_top_left,#ffedd5_0,#fffaf5_35%,#ffffff_100%)] px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-orange-200/50 blur-3xl" />
        <div className="absolute -right-20 top-28 h-72 w-72 rounded-full bg-amber-100/70 blur-3xl" />

        <div className="relative mx-auto grid min-h-[88vh] max-w-7xl items-center gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
          <div className="order-2 lg:order-1">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-4 py-2 text-sm font-bold text-orange-700 shadow-sm backdrop-blur"
            >
              <Sparkles className="h-4 w-4" />
              Back to KOSTOMA
            </Link>

            <div className="mt-6">
              <Image
                src="/brand/kostoma-logo.png"
                alt="KOSTOMA"
                width={700}
                height={220}
                priority
                className="h-auto w-full max-w-[430px] mix-blend-multiply"
              />
            </div>

            <h1 className="mt-7 max-w-xl text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Create your account and start shopping local.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              Join KOSTOMA to shop your local town market, save your preferred
              town, track orders, and enjoy carefully packed local delivery.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-3 lg:max-w-xl">
              <div className="rounded-3xl border border-orange-100 bg-white/90 p-4 shadow-sm">
                <CheckCircle2 className="h-5 w-5 text-orange-500" />
                <div className="mt-3 font-black">Quick sign-up</div>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Create your account in minutes.
                </p>
              </div>

              <div className="rounded-3xl border border-orange-100 bg-white/90 p-4 shadow-sm">
                <MapPin className="h-5 w-5 text-orange-500" />
                <div className="mt-3 font-black">Choose town</div>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Save your local market area.
                </p>
              </div>

              <div className="rounded-3xl border border-orange-100 bg-white/90 p-4 shadow-sm">
                <ShieldCheck className="h-5 w-5 text-orange-500" />
                <div className="mt-3 font-black">Shop easily</div>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Checkout and track orders.
                </p>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="overflow-hidden rounded-[34px] border border-orange-100 bg-white shadow-2xl shadow-orange-100/50">
              <div className="bg-gradient-to-br from-orange-500 via-orange-500 to-orange-400 px-6 py-7 text-white sm:px-8">
                <div className="text-xs font-black uppercase tracking-[0.25em] text-orange-100">
                  KOSTOMA
                </div>

                <h2 className="mt-3 text-3xl font-black">Create Account</h2>

                <p className="mt-2 text-sm leading-6 text-orange-50">
                  Register and start shopping in your local market.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="grid gap-5 px-5 py-6 sm:px-8 sm:py-8">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Phone
                  </label>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 focus-within:border-orange-300">
                    <Phone className="h-5 w-5 shrink-0 text-orange-500" />
                    <input
                      type="text"
                      placeholder="Enter phone number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="w-full border-none bg-transparent text-base font-semibold outline-none placeholder:font-normal placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      First name
                    </label>
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 focus-within:border-orange-300">
                      <User className="h-5 w-5 shrink-0 text-orange-500" />
                      <input
                        type="text"
                        placeholder="First name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        className="w-full border-none bg-transparent text-base font-semibold outline-none placeholder:font-normal placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Last name
                    </label>
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 focus-within:border-orange-300">
                      <User className="h-5 w-5 shrink-0 text-orange-500" />
                      <input
                        type="text"
                        placeholder="Optional"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full border-none bg-transparent text-base font-semibold outline-none placeholder:font-normal placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Email
                  </label>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 focus-within:border-orange-300">
                    <Mail className="h-5 w-5 shrink-0 text-orange-500" />
                    <input
                      type="email"
                      placeholder="Enter email (optional)"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full border-none bg-transparent text-base font-semibold outline-none placeholder:font-normal placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Default town
                  </label>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 focus-within:border-orange-300">
                    <MapPin className="h-5 w-5 shrink-0 text-orange-500" />
                    <select
                      value={defaultTownId}
                      onChange={(e) => setDefaultTownId(e.target.value)}
                      className="w-full border-none bg-transparent pr-6 text-base font-semibold outline-none"
                    >
                      <option value="">
                        {townsLoading
                          ? "Finding available towns..."
                          : "Select your default town"}
                      </option>
                      {towns.map((town) => (
                        <option key={town.id} value={town.id}>
                          {town.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Password
                  </label>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 focus-within:border-orange-300">
                    <Lock className="h-5 w-5 shrink-0 text-orange-500" />
                    <input
                      type="password"
                      placeholder="Create password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full border-none bg-transparent text-base font-semibold outline-none placeholder:font-normal placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {error ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                    {error}
                  </div>
                ) : null}

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-14 rounded-2xl bg-[#0f172a] text-base font-black text-white shadow-xl shadow-slate-900/10 hover:bg-[#1e293b]"
                >
                  {loading ? "Creating account..." : "Create Account"}
                  {!loading ? <ArrowRight className="ml-2 h-5 w-5" /> : null}
                </Button>

                <p className="text-center text-sm text-slate-600">
                  Already have an account?{" "}
                  <Link
                    href={`/auth/login?redirect=${encodeURIComponent(redirect)}`}
                    className="font-black text-orange-600 hover:text-orange-700"
                  >
                    Login
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#fffaf5] px-4 py-6">
          <div className="mx-auto max-w-3xl rounded-3xl border border-orange-100 bg-white p-6 shadow-xl shadow-orange-100/40">
            Loading...
          </div>
        </main>
      }
    >
      <RegisterPageInner />
    </Suspense>
  );
}