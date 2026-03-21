"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, KeyRound, Lock, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";

type RequestResponse = {
  ok: boolean;
  message: string;
  devResetCode?: string;
  expiresAt?: string;
};

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<1 | 2>(1);

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [devResetCode, setDevResetCode] = useState("");

  async function requestCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const data: RequestResponse = await apiFetch(
        "/customer-auth/forgot-password/request",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ phone }),
        },
      );

      setMessage(data?.message || "Reset code requested.");
      setDevResetCode(data?.devResetCode || "");
      setStep(2);
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const data: any = await apiFetch("/customer-auth/forgot-password/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone,
          code,
          newPassword,
        }),
      });

      setMessage(data?.message || "Password reset successful.");
      setStep(1);
      setCode("");
      setNewPassword("");
      setDevResetCode("");
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-white px-6 py-10">
      <div className="mx-auto max-w-xl">
        <Card className="overflow-hidden rounded-[32px] border-orange-100 shadow-xl shadow-orange-100/40">
          <CardContent className="p-0">
            <div className="bg-gradient-to-r from-orange-500 to-orange-400 px-8 py-8 text-white">
              <div className="text-sm font-medium uppercase tracking-[0.2em] text-orange-100">
                Somame
              </div>
              <h1 className="mt-3 text-3xl font-bold">Forgot password</h1>
              <p className="mt-2 text-sm text-orange-50">
                Reset your password using your phone number.
              </p>
            </div>

            <div className="px-8 py-8">
              {step === 1 ? (
                <form onSubmit={requestCode} className="grid gap-5">
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

                  {error ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                      {error}
                    </div>
                  ) : null}

                  {message ? (
                    <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                      {message}
                    </div>
                  ) : null}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-12 rounded-2xl bg-orange-500 text-base font-semibold text-white hover:bg-orange-600"
                  >
                    {loading ? "Requesting..." : "Send reset code"}
                    {!loading ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
                  </Button>
                </form>
              ) : (
                <form onSubmit={resetPassword} className="grid gap-5">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Phone number
                    </label>
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <Phone className="h-5 w-5 text-orange-500" />
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        className="w-full border-none bg-transparent text-base outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Reset code
                    </label>
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-orange-300">
                      <KeyRound className="h-5 w-5 text-orange-500" />
                      <input
                        type="text"
                        placeholder="Enter 6-digit code"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        required
                        className="w-full border-none bg-transparent text-base outline-none placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      New password
                    </label>
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-orange-300">
                      <Lock className="h-5 w-5 text-orange-500" />
                      <input
                        type="password"
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        className="w-full border-none bg-transparent text-base outline-none placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  {devResetCode ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      Dev reset code: <span className="font-bold">{devResetCode}</span>
                    </div>
                  ) : null}

                  {error ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                      {error}
                    </div>
                  ) : null}

                  {message ? (
                    <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                      {message}
                    </div>
                  ) : null}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-12 rounded-2xl bg-orange-500 text-base font-semibold text-white hover:bg-orange-600"
                  >
                    {loading ? "Resetting..." : "Reset password"}
                    {!loading ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
                  </Button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setError("");
                      setMessage("");
                    }}
                    className="text-sm font-medium text-orange-600 hover:text-orange-700"
                  >
                    ← Back
                  </button>
                </form>
              )}

              <p className="mt-6 text-sm text-slate-600">
                Back to{" "}
                <Link
                  href="/auth/login"
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