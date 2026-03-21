import Link from "next/link";
import { apiFetch } from "@/lib/api";
import CheckoutProgress from "@/components/CheckoutProgress";

function money(v: any) {
  const n = Number(v ?? 0);
  return n.toFixed(2);
}

function normalizeStatus(status?: string) {
  return String(status ?? "").toUpperCase();
}

function customerStatus(status?: string) {
  const s = normalizeStatus(status);

  switch (s) {
    case "DRAFT":
      return {
        label: "Order received",
        description:
          "We’ve received your order and our team will review it shortly.",
        step: 1,
      };
    case "CONFIRMED":
      return {
        label: "Being reviewed",
        description:
          "Your order has been accepted and item confirmation is in progress.",
        step: 2,
      };
    case "FULFILLED":
      return {
        label: "Prepared",
        description:
          "Your items have been picked and prepared for delivery.",
        step: 3,
      };
    case "SETTLED":
      return {
        label: "Delivered",
        description:
          "Your order has been completed successfully.",
        step: 4,
      };
    case "CANCELLED":
      return {
        label: "Cancelled",
        description:
          "This order was cancelled. Please contact support if you need help.",
        step: 0,
      };
    case "REFUNDED":
    case "PARTIALLY_REFUNDED":
      return {
        label: s === "REFUNDED" ? "Refunded" : "Partially refunded",
        description:
          "A refund has been processed for this order.",
        step: 0,
      };
    default:
      return {
        label: s || "Pending",
        description: "Your order status will update as processing continues.",
        step: 1,
      };
  }
}

function statusTone(status?: string) {
  const s = normalizeStatus(status);

  if (s === "DRAFT") {
    return { bg: "#fff7ed", border: "#fdba74", text: "#c2410c" };
  }

  if (s === "CONFIRMED") {
    return { bg: "#eff6ff", border: "#93c5fd", text: "#1d4ed8" };
  }

  if (s === "FULFILLED" || s === "SETTLED") {
    return { bg: "#ecfdf5", border: "#86efac", text: "#166534" };
  }

  if (s === "CANCELLED" || s.includes("REFUND")) {
    return { bg: "#fef2f2", border: "#fca5a5", text: "#b91c1c" };
  }

  return { bg: "#f8fafc", border: "#cbd5e1", text: "#334155" };
}

export default async function OrderPage({
  params,
}: {
  params: Promise<{ townSlug: string; orderId: string }>;
}) {
  const { townSlug, orderId } = await params;

  const order = await apiFetch<any>(`/orders/${encodeURIComponent(orderId)}`);
  const tone = statusTone(order?.status);
  const customer = customerStatus(order?.status);

  const progressSteps = [
    "Order received",
    "Being reviewed",
    "Prepared",
    "Delivered",
  ];

  const showProgress =
    !["CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"].includes(
      normalizeStatus(order?.status)
    );

  return (
    <main

      style={{
        maxWidth: 980,
        margin: "0 auto",
        padding: 16,
        paddingBottom: 40,
      }}
    >
            <div style={{ marginBottom: 18 }}>
        <CheckoutProgress step="confirmation" />
      </div>
      <style>{`
        @keyframes tc-pop-in {
          0% { opacity: 0; transform: scale(0.82); }
          70% { opacity: 1; transform: scale(1.06); }
          100% { opacity: 1; transform: scale(1); }
        }

        @keyframes tc-pulse-ring {
          0% { transform: scale(0.9); opacity: 0.55; }
          100% { transform: scale(1.35); opacity: 0; }
        }

        @keyframes tc-fade-up {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <Link
          href={`/${townSlug}`}
          style={{ textDecoration: "none", color: "#0f172a", fontWeight: 500 }}
        >
          ← Back to market
        </Link>

        <Link
          href={`/${townSlug}/cart`}
          style={{ textDecoration: "none", color: "#0f172a", fontWeight: 500 }}
        >
          Cart
        </Link>
      </header>

      <section
        style={{
          marginTop: 20,
          border: "1px solid #fed7aa",
          borderRadius: 24,
          padding: 24,
          background:
            "linear-gradient(135deg, #fff7ed 0%, #ffffff 55%, #fffbeb 100%)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
          animation: "tc-fade-up 0.45s ease-out",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 18,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              position: "relative",
              width: 72,
              height: 72,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "999px",
                background: "rgba(34,197,94,0.18)",
                animation: "tc-pulse-ring 1.6s ease-out infinite",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "999px",
                background:
                  normalizeStatus(order?.status) === "CANCELLED" ||
                  normalizeStatus(order?.status).includes("REFUND")
                    ? "#dc2626"
                    : "#16a34a",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 34,
                fontWeight: 900,
                boxShadow: "0 8px 20px rgba(22,163,74,0.28)",
                animation: "tc-pop-in 0.45s ease-out",
              }}
            >
              {normalizeStatus(order?.status) === "CANCELLED" ||
              normalizeStatus(order?.status).includes("REFUND")
                ? "!"
                : "✓"}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 240 }}>
            <div
              style={{
                fontSize: 13,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: tone.text,
                fontWeight: 700,
              }}
            >
              Order update
            </div>

            <h1
              style={{
                marginTop: 6,
                marginBottom: 0,
                fontSize: 34,
                lineHeight: 1.1,
                color: "#0f172a",
              }}
            >
              {customer.label}
            </h1>

            <p
              style={{
                marginTop: 10,
                marginBottom: 0,
                color: "#475569",
                fontSize: 16,
                lineHeight: 1.6,
                maxWidth: 700,
              }}
            >
              {customer.description}
            </p>
          </div>
        </div>
      </section>

      <section
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 14,
          animation: "tc-fade-up 0.5s ease-out",
        }}
      >
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 18,
            padding: 16,
            background: "white",
          }}
        >
          <div style={{ color: "#64748b", fontSize: 13, marginBottom: 6 }}>
            Order ID
          </div>
          <div
            style={{
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              fontSize: 16,
              fontWeight: 700,
              color: "#0f172a",
              wordBreak: "break-all",
            }}
          >
            {order.id}
          </div>
        </div>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 18,
            padding: 16,
            background: "white",
          }}
        >
          <div style={{ color: "#64748b", fontSize: 13, marginBottom: 6 }}>
            Current status
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              borderRadius: 999,
              padding: "8px 12px",
              fontWeight: 800,
              fontSize: 14,
              background: tone.bg,
              border: `1px solid ${tone.border}`,
              color: tone.text,
            }}
          >
            {customer.label}
          </div>
        </div>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 18,
            padding: 16,
            background: "white",
          }}
        >
          <div style={{ color: "#64748b", fontSize: 13, marginBottom: 6 }}>
            Amount to pay
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 900,
              color: "#0f172a",
            }}
          >
            {money(order.total)} GHS
          </div>
          <div style={{ marginTop: 6, color: "#64748b", fontSize: 13 }}>
            Payment method:{" "}
            <b style={{ color: "#0f172a" }}>
              {order.goodsPaymentMethod === "COD"
  ? "Cash on delivery"
  : order.goodsPaymentMethod === "MOMO"
  ? "MoMo on delivery"
  : order.goodsPaymentMethod}
            </b>
          </div>
        </div>
      </section>

      {showProgress ? (
        <section
          style={{
            marginTop: 18,
            border: "1px solid #e5e7eb",
            borderRadius: 18,
            padding: 18,
            background: "white",
            animation: "tc-fade-up 0.55s ease-out",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 20, color: "#0f172a" }}>
            Order progress
          </h2>

          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            {progressSteps.map((step, index) => {
              const active = customer.step >= index + 1;

              return (
                <div key={step} style={{ minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 999,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        fontWeight: 800,
                        background: active ? "#16a34a" : "#e2e8f0",
                        color: active ? "white" : "#475569",
                        flexShrink: 0,
                      }}
                    >
                      {index + 1}
                    </div>

                    <div
                      style={{
                        height: 3,
                        flex: 1,
                        background: active ? "#86efac" : "#e2e8f0",
                        borderRadius: 999,
                        display: index === progressSteps.length - 1 ? "none" : "block",
                      }}
                    />
                  </div>

                  <div
                    style={{
                      fontWeight: active ? 800 : 600,
                      color: active ? "#0f172a" : "#64748b",
                      fontSize: 14,
                      lineHeight: 1.4,
                    }}
                  >
                    {step}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section
        style={{
          marginTop: 18,
          border: "1px solid #e5e7eb",
          borderRadius: 18,
          padding: 18,
          background: "white",
          animation: "tc-fade-up 0.55s ease-out",
        }}
      >
        <h2 style={{ margin: 0, fontSize: 20, color: "#0f172a" }}>
          What happens next
        </h2>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          {[
            {
              title: "1. Order review",
              text: "Our operations team checks your order and confirms availability.",
            },
            {
              title: "2. Picking & packing",
              text: "Items are picked from market sellers and prepared for delivery.",
            },
            {
              title: "3. Delivery update",
              text: "Your order status moves forward as fulfilment progresses.",
            },
            {
              title: "4. Delivery",
              text: "Your order is delivered and payment is collected if applicable.",
            },
          ].map((step) => (
            <div
              key={step.title}
              style={{
                border: "1px solid #f1f5f9",
                borderRadius: 16,
                padding: 14,
                background: "#fafaf9",
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  color: "#0f172a",
                  marginBottom: 6,
                }}
              >
                {step.title}
              </div>
              <div
                style={{
                  color: "#64748b",
                  fontSize: 14,
                  lineHeight: 1.5,
                }}
              >
                {step.text}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 14,
            color: "#64748b",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          You can refresh this page any time to see the latest order status.
        </div>
      </section>
      <h2 style={{ marginTop: 22, marginBottom: 10, color: "#0f172a" }}>
  Delivery address
</h2>

<div
  style={{
    border: "1px solid #e5e7eb",
    borderRadius: 18,
    padding: 18,
    background: "white",
  }}
>
  {order.deliveryAddress ? (
    <div style={{ display: "grid", gap: 6, color: "#0f172a" }}>
      <div style={{ fontWeight: 800 }}>
        {order.deliveryAddress.recipientName || "Recipient"}
      </div>

      {order.deliveryAddress.phone ? (
        <div style={{ color: "#475569" }}>{order.deliveryAddress.phone}</div>
      ) : null}

      <div>{order.deliveryAddress.line1}</div>

      {order.deliveryAddress.line2 ? <div>{order.deliveryAddress.line2}</div> : null}

      {order.deliveryAddress.area ? <div>{order.deliveryAddress.area}</div> : null}

      {order.deliveryAddress.town ? (
        <div style={{ fontWeight: 600 }}>{order.deliveryAddress.town}</div>
      ) : null}

      {order.deliveryAddress.landmark ? (
        <div style={{ color: "#475569" }}>
          Landmark: {order.deliveryAddress.landmark}
        </div>
      ) : null}

      {order.deliveryAddress.notes ? (
        <div style={{ color: "#475569" }}>
          Notes: {order.deliveryAddress.notes}
        </div>
      ) : null}
    </div>
  ) : (
    <div style={{ color: "#64748b", fontSize: 14 }}>
      Delivery address will appear here once available.
    </div>
  )}
</div>

      <h2 style={{ marginTop: 22, marginBottom: 10, color: "#0f172a" }}>
        Items
      </h2>

      <div style={{ display: "grid", gap: 12 }}>
        {(order.items ?? []).map((it: any) => (
          <div
            key={it.id}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 18,
              padding: 16,
              background: "white",
            }}
          >
            <div
              style={{
                fontWeight: 900,
                fontSize: 18,
                color: "#0f172a",
              }}
            >
              {it.townProduct?.product?.name ?? "Item"}
            </div>

            {it.variant?.label ? (
              <div style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>
                Variant: {it.variant.label}
              </div>
            ) : null}

            <div style={{ marginTop: 10, fontSize: 15, color: "#0f172a" }}>
              {it.quantity != null ? (
                <>Qty: {it.quantity}</>
              ) : (
                <>Weight: {it.weightGrams}g</>
              )}
            </div>

            <div
              style={{
                marginTop: 8,
                color: "#64748b",
                fontSize: 14,
              }}
            >
              Unit price: {money(it.unitPrice)} GHS
            </div>

            <div
              style={{
                marginTop: 10,
                fontWeight: 900,
                fontSize: 18,
                color: "#0f172a",
              }}
            >
              Line total: {money(it.lineTotal)} GHS
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: 22, marginBottom: 10, color: "#0f172a" }}>
        Summary
      </h2>

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 18,
          padding: 18,
          background: "white",
        }}
      >
        <div style={{ display: "grid", gap: 10 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              color: "#0f172a",
            }}
          >
            <div>Items subtotal</div>
            <div>{money(order.itemsSubtotal)} GHS</div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              color: "#0f172a",
            }}
          >
            <div>Delivery fee</div>
            <div>{money(order.deliveryFee)} GHS</div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              color: "#0f172a",
            }}
          >
            <div>Service fee</div>
            <div>{money(order.serviceFee)} GHS</div>
          </div>
        </div>

        <hr
          style={{
            margin: "14px 0",
            border: 0,
            borderTop: "1px solid #e5e7eb",
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "baseline",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
            Total
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#0f172a" }}>
            {money(order.total)} GHS
          </div>
        </div>

        <div
          style={{
            marginTop: 12,
            color: "#64748b",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          Payment method (goods):{" "}
          <b style={{ color: "#0f172a" }}>
            {order.goodsPaymentMethod === "COD"
  ? "Cash on delivery"
  : order.goodsPaymentMethod === "MOMO"
  ? "MoMo on delivery"
  : order.goodsPaymentMethod}
          </b>
        </div>
      </div>
{!order.customerId ? (
  <section
    style={{
      marginTop: 18,
      border: "1px solid #fed7aa",
      borderRadius: 18,
      padding: 18,
      background: "#fff7ed",
    }}
  >
    <h2 style={{ margin: 0, fontSize: 20, color: "#0f172a" }}>
      Save your details for next time
    </h2>

    <div
      style={{
        marginTop: 10,
        color: "#475569",
        fontSize: 15,
        lineHeight: 1.6,
      }}
    >
      Create an account to save your phone number and delivery details for faster
      checkout on your next order.
    </div>

    <div
      style={{
        marginTop: 14,
        display: "flex",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <Link
        href={`/auth/register?redirect=${encodeURIComponent(`/${townSlug}`)}`}
        style={{
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 12,
          padding: "12px 16px",
          background: "#f97316",
          color: "white",
          fontWeight: 700,
        }}
      >
        Create account
      </Link>

      <Link
        href={`/${townSlug}`}
        style={{
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 12,
          padding: "12px 16px",
          border: "1px solid #cbd5e1",
          color: "#0f172a",
          fontWeight: 700,
          background: "white",
        }}
      >
        Continue shopping as guest
      </Link>
    </div>
  </section>
) : null}
      <div
        style={{
          marginTop: 18,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <Link
          href={`/${townSlug}`}
          style={{
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 12,
            padding: "12px 16px",
            background: "#f97316",
            color: "white",
            fontWeight: 700,
          }}
        >
          Start another order
        </Link>

        <a
          href={`/${townSlug}/order/${orderId}`}
          style={{
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 12,
            padding: "12px 16px",
            border: "1px solid #cbd5e1",
            color: "#0f172a",
            fontWeight: 700,
            background: "white",
          }}
        >
          Refresh status
        </a>
      </div>
    </main>
  );
}