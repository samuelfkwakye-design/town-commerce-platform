"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

type PromoRow = {
  id: string;
  code: string;
  type: "DELIVERY_FREE" | "SERVICE_FREE" | "PERCENTAGE" | "FIXED";
  value: string | null;
  isActive: boolean;
  expiresAt: string | null;
  townId: string | null;
  createdAt: string;
  updatedAt: string;
  town: {
    id: string;
    name: string;
    slug: string;
  } | null;
  _count?: {
    usages: number;
  };
};

type PromosResponse = {
  rows: PromoRow[];
};

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function isTownScopedRole(role?: AdminRole | null) {
  return role === "TOWN_SUPER_ADMIN" || role === "WAREHOUSE_ADMIN";
}

function canEditPromo(admin: CurrentAdmin | null, promo: PromoRow) {
  if (!admin) return false;

  if (admin.role === "GLOBAL_SUPER_ADMIN") {
    return true;
  }

  if (admin.role === "TOWN_SUPER_ADMIN") {
    return Boolean(admin.townId && promo.townId === admin.townId);
  }

  return false;
}

export default function OpsPromosPage() {
  const [admin, setAdmin] = useState<CurrentAdmin | null>(null);
  const [rows, setRows] = useState<PromoRow[]>([]);
  const [towns, setTowns] = useState<TownOption[]>([]);

  const [bootstrapping, setBootstrapping] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const [q, setQ] = useState("");
  const [isActive, setIsActive] = useState("all");
  const [selectedTownId, setSelectedTownId] = useState("");

  async function loadPromos(nextAdmin?: CurrentAdmin | null) {
    const currentAdmin = nextAdmin ?? admin;
    if (!currentAdmin) return;

    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (q.trim()) params.set("q", q.trim());
      if (isActive === "true" || isActive === "false") {
        params.set("isActive", isActive);
      }

      if (currentAdmin.role === "GLOBAL_SUPER_ADMIN") {
        if (selectedTownId) {
          params.set("townId", selectedTownId);
        }
      } else if (currentAdmin.townId) {
        params.set("townId", currentAdmin.townId);
      }

      const query = params.toString();
      const data = await apiFetch<PromosResponse>(
        `/admin/promos${query ? `?${query}` : ""}`,
      );

      setRows(data.rows || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load promos");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        setBootstrapping(true);
        setError("");

        const me = await apiFetch<CurrentAdmin>("/admin/auth/me");
        if (cancelled) return;

        setAdmin(me);

        if (me.role === "GLOBAL_SUPER_ADMIN") {
          try {
            const townsResp = await apiFetch<TownsResponse>("/towns");
            if (!cancelled) {
              setTowns(townsResp.rows || []);
            }
          } catch {
            if (!cancelled) {
              setTowns([]);
            }
          }
        } else if (me.town) {
          setSelectedTownId(me.town.id);
        } else if (me.townId) {
          setSelectedTownId(me.townId);
        }

        await loadPromos(me);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Failed to load promos");
          setRows([]);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => r.isActive).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [rows]);

  const role = admin?.role ?? null;
  const townScoped = isTownScopedRole(role);
  const canCreatePromo =
    role === "GLOBAL_SUPER_ADMIN" || role === "TOWN_SUPER_ADMIN";

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>Promos</h1>
          <p style={{ marginTop: 8, color: "#666" }}>
            Manage promo codes used by customers at checkout.
          </p>
          {admin && (
            <div style={{ marginTop: 8, fontSize: 13, color: "#666" }}>
              Role: <strong>{admin.role}</strong>
              {townScoped && admin.town ? (
                <>
                  {" "}
                  · Town-scoped to <strong>{admin.town.name}</strong>
                </>
              ) : null}
            </div>
          )}
        </div>

        {canCreatePromo ? (
          <Link
            href={
              role === "TOWN_SUPER_ADMIN" && admin?.townId
                ? `/ops/promos/new?townId=${encodeURIComponent(admin.townId)}`
                : "/ops/promos/new"
            }
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              background: "#111",
              color: "#fff",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            + New Promo
          </Link>
        ) : null}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            border: "1px solid #e5e5e5",
            borderRadius: 12,
            padding: 16,
            background: "#fff",
          }}
        >
          <div style={{ fontSize: 13, color: "#666" }}>Total Promos</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{summary.total}</div>
        </div>

        <div
          style={{
            border: "1px solid #e5e5e5",
            borderRadius: 12,
            padding: 16,
            background: "#fff",
          }}
        >
          <div style={{ fontSize: 13, color: "#666" }}>Active</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{summary.active}</div>
        </div>

        <div
          style={{
            border: "1px solid #e5e5e5",
            borderRadius: 12,
            padding: 16,
            background: "#fff",
          }}
        >
          <div style={{ fontSize: 13, color: "#666" }}>Inactive</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{summary.inactive}</div>
        </div>
      </div>

      <div
        style={{
          border: "1px solid #e5e5e5",
          borderRadius: 12,
          background: "#fff",
          padding: 16,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              role === "GLOBAL_SUPER_ADMIN"
                ? "2fr 1fr 1fr auto"
                : "2fr 1fr auto",
            gap: 12,
            alignItems: "end",
          }}
        >
          <div>
            <label
              style={{ display: "block", fontSize: 13, marginBottom: 6, color: "#444" }}
            >
              Search
            </label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={
                role === "GLOBAL_SUPER_ADMIN"
                  ? "Search code or town"
                  : "Search code"
              }
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #d4d4d4",
              }}
            />
          </div>

          <div>
            <label
              style={{ display: "block", fontSize: 13, marginBottom: 6, color: "#444" }}
            >
              Status
            </label>
            <select
              value={isActive}
              onChange={(e) => setIsActive(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #d4d4d4",
                background: "#fff",
              }}
            >
              <option value="all">All</option>
              <option value="true">Active only</option>
              <option value="false">Inactive only</option>
            </select>
          </div>

          {role === "GLOBAL_SUPER_ADMIN" ? (
            <div>
              <label
                style={{ display: "block", fontSize: 13, marginBottom: 6, color: "#444" }}
              >
                Town
              </label>
              <select
                value={selectedTownId}
                onChange={(e) => setSelectedTownId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #d4d4d4",
                  background: "#fff",
                }}
              >
                <option value="">All towns</option>
                {towns.map((town) => (
                  <option key={town.id} value={town.id}>
                    {town.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label
                style={{ display: "block", fontSize: 13, marginBottom: 6, color: "#444" }}
              >
                Town
              </label>
              <div
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #e5e5e5",
                  background: "#f8f8f8",
                  color: "#333",
                  minHeight: 42,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {admin?.town?.name ?? "Assigned town only"}
              </div>
            </div>
          )}

          <button
            onClick={() => loadPromos()}
            disabled={bootstrapping || loading || !admin}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #111",
              background: "#111",
              color: "#fff",
              fontWeight: 600,
              cursor: bootstrapping || loading || !admin ? "not-allowed" : "pointer",
              opacity: bootstrapping || loading || !admin ? 0.6 : 1,
            }}
          >
            Apply Filters
          </button>
        </div>
      </div>

      <div
        style={{
          border: "1px solid #e5e5e5",
          borderRadius: 12,
          background: "#fff",
          overflow: "hidden",
        }}
      >
        {bootstrapping ? (
          <div style={{ padding: 20 }}>Loading admin access...</div>
        ) : loading ? (
          <div style={{ padding: 20 }}>Loading promos...</div>
        ) : error ? (
          <div style={{ padding: 20, color: "crimson" }}>{error}</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 20 }}>No promos found.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "#fafafa" }}>
                <tr>
                  <th style={th}>Code</th>
                  <th style={th}>Type</th>
                  <th style={th}>Value</th>
                  <th style={th}>Town</th>
                  <th style={th}>Status</th>
                  <th style={th}>Expires</th>
                  <th style={th}>Usages</th>
                  <th style={th}>Created</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const editable = canEditPromo(admin, row);

                  return (
                    <tr key={row.id} style={{ borderTop: "1px solid #eee" }}>
                      <td style={td}>
                        <div style={{ fontWeight: 700 }}>{row.code}</div>
                      </td>
                      <td style={td}>{row.type}</td>
                      <td style={td}>{row.value ?? "—"}</td>
                      <td style={td}>
                        {row.town ? (
                          <div>
                            <div>{row.town.name}</div>
                            <div style={{ fontSize: 12, color: "#666" }}>{row.town.slug}</div>
                          </div>
                        ) : row.townId ? (
                          row.townId
                        ) : (
                          "All towns"
                        )}
                      </td>
                      <td style={td}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 10px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 700,
                            background: row.isActive ? "#e8f7e8" : "#f4f4f5",
                            color: row.isActive ? "#166534" : "#52525b",
                          }}
                        >
                          {row.isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </td>
                      <td style={td}>{fmtDate(row.expiresAt)}</td>
                      <td style={td}>{row._count?.usages ?? 0}</td>
                      <td style={td}>{fmtDate(row.createdAt)}</td>
                      <td style={td}>
                        {editable ? (
                          <Link
                            href={`/ops/promos/${encodeURIComponent(row.id)}/edit`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "6px 10px",
                              borderRadius: 8,
                              border: "1px solid #d4d4d4",
                              textDecoration: "none",
                              color: "#111",
                              fontWeight: 600,
                              background: "#fff",
                            }}
                          >
                            Edit
                          </Link>
                        ) : (
                          <span style={{ color: "#999", fontSize: 13 }}>View only</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 14px",
  fontSize: 13,
  fontWeight: 700,
  color: "#444",
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 14px",
  fontSize: 14,
  verticalAlign: "top",
  whiteSpace: "nowrap",
};