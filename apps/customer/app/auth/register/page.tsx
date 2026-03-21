"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Lock, Mail, MapPin, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
            (town: Town) => town.slug === redirectSlug,
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
    <main className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-white px-6 py-10">
      <div className="mx-auto grid min-h-[80vh] max-w-6xl items-center gap-8 lg:grid-cols-2">
        <div className="hidden lg:block">
          <div className="max-w-xl">
            <div className="mb-4 inline-flex items-center rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-700 shadow-sm">
              Join Somame today
            </div>

            <h1 className="text-5xl font-extrabold tracking-tight text-slate-900">
              <span className="text-orange-500">Somame</span>
            </h1>

            <p className="mt-3 text-xl font-medium text-slate-700">
              Send for it. Shop your town with ease.
            </p>

            <p className="mt-6 max-w-lg text-base leading-7 text-slate-600">
              Create your Somame account to shop local markets, track your orders,
              and enjoy a smoother experience across towns.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
                <div className="mb-3 inline-flex rounded-2xl bg-orange-50 p-3 text-orange-500">
                  <User className="h-5 w-5" />
                </div>
                <div className="font-semibold text-slate-900">Quick sign-up</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Register in a few simple steps and start shopping in your chosen
                  town immediately.
                </p>
              </div>

              <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
                <div className="mb-3 inline-flex rounded-2xl bg-orange-50 p-3 text-orange-500">
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="font-semibold text-slate-900">Your default town</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Choose your usual town now and change it later from your customer
                  account.
                </p>
              </div>
            </div>
          </div>
        </div>

        <Card className="overflow-hidden rounded-[32px] border-orange-100 shadow-xl shadow-orange-100/40">
          <CardContent className="p-0">
            <div className="bg-gradient-to-r from-orange-500 to-orange-400 px-8 py-8 text-white">
              <div className="text-sm font-medium uppercase tracking-[0.2em] text-orange-100">
                Somame
              </div>
              <h2 className="mt-3 text-3xl font-bold">Create Account</h2>
              <p className="mt-2 text-sm text-orange-50">
                Register and start shopping in your local market.
              </p>
            </div>

            <div className="px-8 py-8">
              <form onSubmit={handleSubmit} className="grid gap-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Phone
                  </label>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-orange-300">
                    <Phone className="h-5 w-5 text-orange-500" />
                    <input
                      type="text"
                      placeholder="Enter phone number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="w-full border-none bg-transparent text-base outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    First name
                  </label>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-orange-300">
                    <User className="h-5 w-5 text-orange-500" />
                    <input
                      type="text"
                      placeholder="Enter first name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="w-full border-none bg-transparent text-base outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Last name
                  </label>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-orange-300">
                    <User className="h-5 w-5 text-orange-500" />
                    <input
                      type="text"
                      placeholder="Enter last name (optional)"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full border-none bg-transparent text-base outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Email
                  </label>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-orange-300">
                    <Mail className="h-5 w-5 text-orange-500" />
                    <input
                      type="email"
                      placeholder="Enter email (optional)"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full border-none bg-transparent text-base outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Default town
                  </label>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-orange-300">
                    <MapPin className="h-5 w-5 text-orange-500" />
                    <select
                      value={defaultTownId}
                      onChange={(e) => setDefaultTownId(e.target.value)}
                      className="w-full border-none bg-transparent text-base outline-none"
                    >
                      <option value="">
                        {townsLoading ? "Loading towns..." : "Select your default town"}
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
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-orange-300">
                    <Lock className="h-5 w-5 text-orange-500" />
                    <input
                      type="password"
                      placeholder="Create password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full border-none bg-transparent text-base outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {error ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                ) : null}

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 rounded-2xl bg-orange-500 text-base font-semibold text-white hover:bg-orange-600"
                >
                  {loading ? "Creating account..." : "Register"}
                  {!loading ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
                </Button>
              </form>

              <p className="mt-6 text-sm text-slate-600">
                Already have an account?{" "}
                <Link
                  href={`/auth/login?redirect=${encodeURIComponent(redirect)}`}
                  className="font-semibold text-orange-600 hover:text-orange-700"
                >
                  Login
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-white px-6 py-10">
          <div className="mx-auto max-w-6xl rounded-[32px] border-orange-100 bg-white p-8 shadow-xl shadow-orange-100/40">
            Loading...
          </div>
        </main>
      }
    >
      <RegisterPageInner />
    </Suspense>
  );
}