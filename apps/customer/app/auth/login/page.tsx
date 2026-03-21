"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Lock, Phone, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirect = searchParams.get("redirect") || "/asamankese";

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await apiFetch("/customer-auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          phone: phone.trim(),
          password,
        }),
      });

      if (!data) {
        throw new Error(
          "Login failed. Please check your phone number and password.",
        );
      }

      router.push(redirect || "/asamankese");
      router.refresh();
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
              Welcome back to Somame
            </div>

            <h1 className="text-5xl font-extrabold tracking-tight text-slate-900">
              <span className="text-orange-500">Somame</span>
            </h1>

            <p className="mt-3 text-xl font-medium text-slate-700">
              Send for it. Shop your town with ease.
            </p>

            <p className="mt-6 max-w-lg text-base leading-7 text-slate-600">
              Sign in with your phone number to continue shopping in your local
              market, manage your orders, and enjoy a smoother Somame
              experience.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
                <div className="mb-3 inline-flex rounded-2xl bg-orange-50 p-3 text-orange-500">
                  <Phone className="h-5 w-5" />
                </div>
                <div className="font-semibold text-slate-900">
                  Phone number login
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Use the phone number you registered with and return straight
                  to your town market.
                </p>
              </div>

              <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
                <div className="mb-3 inline-flex rounded-2xl bg-orange-50 p-3 text-orange-500">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="font-semibold text-slate-900">
                  Secure access
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Your session stays connected so you can continue checkout
                  without losing your place.
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
              <h2 className="mt-3 text-3xl font-bold">Login</h2>
              <p className="mt-2 text-sm text-orange-50">
                Sign in with your phone number to continue shopping.
              </p>
            </div>

            <div className="px-8 py-8">
              <form onSubmit={handleSubmit} className="grid gap-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Phone number
                  </label>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-orange-300">
                    <Phone className="h-5 w-5 text-orange-500" />
                    <input
                      type="text"
                      placeholder="e.g. 0241234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="w-full border-none bg-transparent text-base outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="block text-sm font-medium text-slate-700">
                      Password
                    </label>

                    <Link
                      href="/auth/forgot-password"
                      className="text-sm font-medium text-orange-600 hover:text-orange-700"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-orange-300">
                    <Lock className="h-5 w-5 text-orange-500" />
                    <input
                      type="password"
                      placeholder="Enter password"
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
                  {loading ? "Logging in..." : "Login"}
                  {!loading ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
                </Button>
              </form>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                If you forgot your password, use the reset option or contact
                support for help recovering your account.
              </div>

              <p className="mt-6 text-sm text-slate-600">
                Don&apos;t have an account?{" "}
                <Link
                  href={`/auth/register?redirect=${encodeURIComponent(redirect)}`}
                  className="font-semibold text-orange-600 hover:text-orange-700"
                >
                  Register
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function LoginPage() {
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
      <LoginPageInner />
    </Suspense>
  );
}