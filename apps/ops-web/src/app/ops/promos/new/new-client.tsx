"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

type AdminRole =
  | "GLOBAL_SUPER_ADMIN"
  | "TOWN_SUPER_ADMIN"
  | "WAREHOUSE_ADMIN";

type CurrentAdmin = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: AdminRole;
  townId: string | null;
  town: {
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

type TownsResponse = {
  rows: TownOption[];
};

type PromoType = "DELIVERY_FREE" | "SERVICE_FREE" | "PERCENTAGE" | "FIXED";

type CreatePromoResponse = {
  id: string;
  code: string;
  type: PromoType;
  value: string | null;
  isActive: boolean;
  expiresAt: string | null;
  townId: string | null;
};

export default function NewPromoClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [admin, setAdmin] = useState<CurrentAdmin | null>(null);
  const [towns, setTowns] = useState<TownOption[]>([]);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const [code, setCode] = useState("");
  const [type, setType] = useState<PromoType>("DELIVERY_FREE");
  const [value, setValue] = useState("");
  const [townId, setTownId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [expiresAt, setExpiresAt] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const showValue = useMemo(
    () => type === "PERCENTAGE" || type === "FIXED",
    [type],
  );

  const role = admin?.role ?? null;
  const isGlobal = role === "GLOBAL_SUPER_ADMIN";
  const isTownSuper = role === "TOWN_SUPER_ADMIN";
  const isWarehouse = role === "WAREHOUSE_ADMIN";

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        setBootstrapping(true);
        setError("");
        setAccessDenied(false);

        const me = await apiFetch<CurrentAdmin>("/admin-auth/me", { auth: true });
        if (cancelled) return;

        setAdmin(me);

        if (me.role === "WAREHOUSE_ADMIN") {
          setAccessDenied(true);
          return;
        }

        if (me.role === "GLOBAL_SUPER_ADMIN") {
          try {
            const townsResp = await apiFetch<TownsResponse>("/admin/towns", {
  auth: true,
});
            if (!cancelled) {
              setTowns(townsResp.rows || []);
            }
          } catch {
            if (!cancelled) {
              setTowns([]);
            }
          }

          const queryTownId = searchParams.get("townId")?.trim() ?? "";
          if (queryTownId) {
            setTownId(queryTownId);
          }
          return;
        }

        if (me.role === "TOWN_SUPER_ADMIN") {
          setTownId(me.townId ?? "");
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Failed to load admin access");
        }
      } finally {
        if (!cancelled) {
          setBootstrapping(false);
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();

    if (!admin) {
      setError("Admin session not loaded.");
      return;
    }

    if (isWarehouse) {
      setError("You do not have permission to create promos.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload: Record<string, any> = {
        code: code.trim().toUpperCase(),
        type,
        isActive,
      };

      if (!payload.code) {
        throw new Error("Promo code is required.");
      }

      if (showValue) {
        if (value.trim() === "") {
          throw new Error("Value is required for percentage and fixed promos.");
        }

        const numericValue = Number(value);
        if (!Number.isFinite(numericValue) || numericValue < 0) {
          throw new Error("Value must be a valid non-negative number.");
        }

        payload.value = numericValue;
      }

      if (isGlobal) {
        if (townId.trim()) {
          payload.townId = townId.trim();
        }
      } else if (isTownSuper) {
        if (!admin.townId) {
          throw new Error("Your admin account is not linked to a town.");
        }
        payload.townId = admin.townId;
      }

      if (expiresAt) {
        const parsed = new Date(expiresAt);
        if (Number.isNaN(parsed.getTime())) {
          throw new Error("Expires At must be a valid date/time.");
        }
        payload.expiresAt = parsed.toISOString();
      }

      const created = await apiFetch<CreatePromoResponse>("/admin/promos", {
  method: "POST",
  auth: true,
  body: payload,
});

      setSuccess(`Promo ${created.code} created successfully.`);

      setTimeout(() => {
        router.push("/ops/promos");
      }, 700);
    } catch (err: any) {
      setError(err?.message || "Failed to create promo");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <Link
          href="/ops/promos"
          style={{ textDecoration: "none", color: "#444", fontSize: 14 }}
        >
          ← Back to Promos
        </Link>
      </div>

      <div
        style={{
          border: "1px solid #e5e5e5",
          borderRadius: 14,
          background: "#fff",
          padding: 20,
        }}
      >
        <h1 style={{ marginTop: 0, marginBottom: 8, fontSize: 28, fontWeight: 700 }}>
          Create Promo
        </h1>
        <p style={{ marginTop: 0, color: "#666", marginBottom: 24 }}>
          Add a new promo code that customers can use at checkout.
        </p>

        {bootstrapping ? (
          <div style={noticeStyle}>Loading admin access...</div>
        ) : accessDenied ? (
          <div style={errorBoxStyle}>
            You do not have permission to create promos.
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            {admin ? (
              <div
                style={{
                  marginBottom: 20,
                  padding: 12,
                  borderRadius: 10,
                  background: "#fafafa",
                  border: "1px solid #e5e5e5",
                  fontSize: 14,
                  color: "#444",
                }}
              >
                Role: <strong>{admin.role}</strong>
                {isTownSuper && admin.town ? (
                  <>
                    {" "}
                    · Town locked to <strong>{admin.town.name}</strong>
                  </>
                ) : null}
              </div>
            ) : null}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={label}>Promo Code</label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. WELCOME10"
                  required
                  style={input}
                />
              </div>

              <div>
                <label style={label}>Promo Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as PromoType)}
                  style={input}
                >
                  <option value="DELIVERY_FREE">DELIVERY_FREE</option>
                  <option value="SERVICE_FREE">SERVICE_FREE</option>
                  <option value="PERCENTAGE">PERCENTAGE</option>
                  <option value="FIXED">FIXED</option>
                </select>
              </div>

              <div>
                <label style={label}>Value</label>
                <input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={showValue ? "Enter value" : "Not used for this promo type"}
                  disabled={!showValue}
                  type="number"
                  min="0"
                  step="0.01"
                  style={{
                    ...input,
                    background: showValue ? "#fff" : "#f5f5f5",
                  }}
                />
              </div>

              <div>
                <label style={label}>Town</label>
                {isGlobal ? (
                  <select
                    value={townId}
                    onChange={(e) => setTownId(e.target.value)}
                    style={input}
                  >
                    <option value="">All towns</option>
                    {towns.map((town) => (
                      <option key={town.id} value={town.id}>
                        {town.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div
                    style={{
                      ...input,
                      background: "#f5f5f5",
                      color: "#444",
                      minHeight: 42,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {admin?.town?.name ?? "Assigned town"}
                  </div>
                )}
              </div>

              <div>
                <label style={label}>Expires At (optional)</label>
                <input
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  type="datetime-local"
                  style={input}
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  Promo is active
                </label>
              </div>
            </div>

            {error ? <div style={errorBoxStyle}>{error}</div> : null}

            {success ? <div style={successBoxStyle}>{success}</div> : null}

            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 24,
                flexWrap: "wrap",
              }}
            >
              <button
                type="submit"
                disabled={saving || bootstrapping}
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: "1px solid #111",
                  background: "#111",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: saving || bootstrapping ? "not-allowed" : "pointer",
                  opacity: saving || bootstrapping ? 0.7 : 1,
                }}
              >
                {saving ? "Saving..." : "Create Promo"}
              </button>

              <Link
                href="/ops/promos"
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: "1px solid #d4d4d4",
                  background: "#fff",
                  color: "#111",
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                Cancel
              </Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

const label: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  marginBottom: 6,
  color: "#444",
  fontWeight: 600,
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #d4d4d4",
  background: "#fff",
};

const noticeStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 10,
  background: "#fafafa",
  color: "#444",
  border: "1px solid #e5e5e5",
};

const errorBoxStyle: React.CSSProperties = {
  marginTop: 16,
  padding: 12,
  borderRadius: 10,
  background: "#fef2f2",
  color: "#b91c1c",
  border: "1px solid #fecaca",
};

const successBoxStyle: React.CSSProperties = {
  marginTop: 16,
  padding: 12,
  borderRadius: 10,
  background: "#ecfdf5",
  color: "#166534",
  border: "1px solid #bbf7d0",
};
