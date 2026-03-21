"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

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

export default function NewPromoPage() {
  const router = useRouter();

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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload: Record<string, any> = {
        code: code.trim().toUpperCase(),
        type,
        isActive,
      };

      if (showValue && value.trim() !== "") {
        payload.value = Number(value);
      }

      if (townId.trim()) {
        payload.townId = townId.trim();
      }

      if (expiresAt) {
        payload.expiresAt = new Date(expiresAt).toISOString();
      }

      const created = await apiFetch<CreatePromoResponse>("/admin/promos", {
        method: "POST",
        body: JSON.stringify(payload),
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

        <form onSubmit={onSubmit}>
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
              <label style={label}>Town ID (optional)</label>
              <input
                value={townId}
                onChange={(e) => setTownId(e.target.value)}
                placeholder="Leave empty for all towns"
                style={input}
              />
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

          {error ? (
            <div
              style={{
                marginTop: 16,
                padding: 12,
                borderRadius: 10,
                background: "#fef2f2",
                color: "#b91c1c",
                border: "1px solid #fecaca",
              }}
            >
              {error}
            </div>
          ) : null}

          {success ? (
            <div
              style={{
                marginTop: 16,
                padding: 12,
                borderRadius: 10,
                background: "#ecfdf5",
                color: "#166534",
                border: "1px solid #bbf7d0",
              }}
            >
              {success}
            </div>
          ) : null}

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
              disabled={saving}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                border: "1px solid #111",
                background: "#111",
                color: "#fff",
                fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
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
