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

        .tc-order-topbar {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 12px;
          flex-wrap: wrap;
        }

        .tc-hero {
          margin-top: 20px;
          border: 1px solid #fed7aa;
          border-radius: 24px;
          padding: 20px;
          background: linear-gradient(135deg, #fff7ed 0%, #ffffff 55%, #fffbeb 100%);
          box-shadow: 0 10px 30px rgba(0,0,0,0.04);
          animation: tc-fade-up 0.45s ease-out;
        }

        .tc-hero-row {
          display: flex;
          gap: 18px;
          align-items: center;
          flex-wrap: wrap;
        }

        .tc-badge-circle-wrap {
          position: relative;
          width: 64px;
          height: 64px;
          flex-shrink: 0;
        }

        .tc-badge-ring {
          position: absolute;
          inset: 0;
          border-radius: 999px;
          background: rgba(34,197,94,0.18);
          animation: tc-pulse-ring 1.6s ease-out infinite;
        }

        .tc-badge-circle {
          position: absolute;
          inset: 0;
          border-radius: 999px;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 30px;
          font-weight: 900;
          animation: tc-pop-in 0.45s ease-out;
        }

        .tc-hero-copy {
          flex: 1;
          min-width: 0;
        }

        .tc-hero-kicker {
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 700;
        }

        .tc-hero-title {
          margin-top: 6px;
          margin-bottom: 0;
          font-size: 28px;
          line-height: 1.1;
          color: #0f172a;
          word-break: break-word;
        }

        .tc-hero-text {
          margin-top: 10px;
          margin-bottom: 0;
          color: #475569;
          font-size: 15px;
          line-height: 1.6;
          max-width: 700px;
        }

        .tc-grid-cards {
          margin-top: 18px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 14px;
          animation: tc-fade-up 0.5s ease-out;
        }

        .tc-card {
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 16px;
          background: white;
        }

        .tc-card-title {
          color: #64748b;
          font-size: 13px;
          margin-bottom: 6px;
        }

        .tc-status-pill {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 8px 12px;
          font-weight: 800;
          font-size: 14px;
        }

        .tc-amount {
          font-size: 24px;
          font-weight: 900;
          color: #0f172a;
          word-break: break-word;
        }

        .tc-section {
          margin-top: 18px;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 16px;
          background: white;
          animation: tc-fade-up 0.55s ease-out;
        }

        .tc-section h2 {
          margin: 0;
          font-size: 18px;
          color: #0f172a;
        }

        .tc-progress-grid {
          margin-top: 16px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }

        .tc-progress-item {
          min-width: 0;
        }

        .tc-progress-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .tc-progress-dot {
          width: 28px;
          height: 28px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 800;
          flex-shrink: 0;
        }

        .tc-progress-line {
          height: 3px;
          flex: 1;
          border-radius: 999px;
        }

        .tc-next-grid {
          margin-top: 14px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }

        .tc-next-card {
          border: 1px solid #f1f5f9;
          border-radius: 16px;
          padding: 14px;
          background: #fafaf9;
        }

        .tc-next-card-title {
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 6px;
        }

        .tc-next-card-text {
          color: #64748b;
          font-size: 14px;
          line-height: 1.5;
        }

        .tc-address-block {
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 16px;
          background: white;
        }

        .tc-address-grid {
          display: grid;
          gap: 6px;
          color: #0f172a;
          word-break: break-word;
        }

        .tc-items-grid {
          display: grid;
          gap: 12px;
        }

        .tc-item-name {
          font-weight: 900;
          font-size: 17px;
          color: #0f172a;
          word-break: break-word;
        }

        .tc-summary-row {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          color: #0f172a;
        }

        .tc-summary-row > div:last-child {
          text-align: right;
        }

        .tc-summary-total {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: baseline;
        }

        .tc-summary-total-label {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
        }

        .tc-summary-total-value {
          font-size: 24px;
          font-weight: 900;
          color: #0f172a;
          text-align: right;
          word-break: break-word;
        }

        .tc-guest-box {
          margin-top: 18px;
          border: 1px solid #fed7aa;
          border-radius: 18px;
          padding: 18px;
          background: #fff7ed;
        }

        .tc-actions {
          margin-top: 18px;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .tc-btn-primary,
        .tc-btn-secondary {
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          padding: 12px 16px;
          font-weight: 700;
        }

        .tc-btn-primary {
          background: #f97316;
          color: white;
        }

        .tc-btn-secondary {
          border: 1px solid #cbd5e1;
          color: #0f172a;
          background: white;
        }

        @media (min-width: 640px) {
          .tc-hero {
            padding: 24px;
          }

          .tc-badge-circle-wrap {
            width: 72px;
            height: 72px;
          }

          .tc-badge-circle {
            font-size: 34px;
          }

          .tc-hero-title {
            font-size: 34px;
          }

          .tc-amount {
            font-size: 28px;
          }

          .tc-section {
            padding: 18px;
          }

          .tc-section h2 {
            font-size: 20px;
          }

          .tc-progress-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 12px;
          }

          .tc-next-grid {
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          }

          .tc-summary-total-value {
            font-size: 28px;
          }

          .tc-grid-cards {
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          }
        }
      `}</style>

      <header className="tc-order-topbar">
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

      <section className="tc-hero">
        <div className="tc-hero-row">
          <div className="tc-badge-circle-wrap">
            <div className="tc-badge-ring" />
            <div
              className="tc-badge-circle"
              style={{
                background:
                  normalizeStatus(order?.status) === "CANCELLED" ||
                  normalizeStatus(order?.status).includes("REFUND")
                    ? "#dc2626"
                    : "#16a34a",
                boxShadow:
                  normalizeStatus(order?.status) === "CANCELLED" ||
                  normalizeStatus(order?.status).includes("REFUND")
                    ? "0 8px 20px rgba(220,38,38,0.28)"
                    : "0 8px 20px rgba(22,163,74,0.28)",
              }}
            >
              {normalizeStatus(order?.status) === "CANCELLED" ||
              normalizeStatus(order?.status).includes("REFUND")
                ? "!"
                : "✓"}
            </div>
          </div>

          <div className="tc-hero-copy">
            <div className="tc-hero-kicker" style={{ color: tone.text }}>
              Order update
            </div>

            <h1 className="tc-hero-title">{customer.label}</h1>

            <p className="tc-hero-text">{customer.description}</p>
          </div>
        </div>
      </section>

      <section className="tc-grid-cards">
        <div className="tc-card">
          <div className="tc-card-title">Order ID</div>
          <div
            style={{
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              fontSize: 15,
              fontWeight: 700,
              color: "#0f172a",
              wordBreak: "break-all",
            }}
          >
            {order.id}
          </div>
        </div>

        <div className="tc-card">
          <div className="tc-card-title">Current status</div>
          <div
            className="tc-status-pill"
            style={{
              background: tone.bg,
              border: `1px solid ${tone.border}`,
              color: tone.text,
            }}
          >
            {customer.label}
          </div>
        </div>

        <div className="tc-card">
          <div className="tc-card-title">Amount to pay</div>
          <div className="tc-amount">{money(order.total)} GHS</div>
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
        <section className="tc-section">
          <h2>Order progress</h2>

          <div className="tc-progress-grid">
            {progressSteps.map((step, index) => {
              const active = customer.step >= index + 1;

              return (
                <div key={step} className="tc-progress-item">
                  <div className="tc-progress-row">
                    <div
                      className="tc-progress-dot"
                      style={{
                        background: active ? "#16a34a" : "#e2e8f0",
                        color: active ? "white" : "#475569",
                      }}
                    >
                      {index + 1}
                    </div>

                    <div
                      className="tc-progress-line"
                      style={{
                        background: active ? "#86efac" : "#e2e8f0",
                        display:
                          index === progressSteps.length - 1 ? "none" : "block",
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

      <section className="tc-section">
        <h2>What happens next</h2>

        <div className="tc-next-grid">
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
            <div key={step.title} className="tc-next-card">
              <div className="tc-next-card-title">{step.title}</div>
              <div className="tc-next-card-text">{step.text}</div>
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

      <div className="tc-address-block">
        {order.deliveryAddress ? (
          <div className="tc-address-grid">
            <div style={{ fontWeight: 800 }}>
              {order.deliveryAddress.recipientName || "Recipient"}
            </div>

            {order.deliveryAddress.phone ? (
              <div style={{ color: "#475569" }}>{order.deliveryAddress.phone}</div>
            ) : null}

            <div>{order.deliveryAddress.line1}</div>

            {order.deliveryAddress.line2 ? (
              <div>{order.deliveryAddress.line2}</div>
            ) : null}

            {order.deliveryAddress.area ? (
              <div>{order.deliveryAddress.area}</div>
            ) : null}

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

      <div className="tc-items-grid">
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
            <div className="tc-item-name">
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
          <div className="tc-summary-row">
            <div>Items subtotal</div>
            <div>{money(order.itemsSubtotal)} GHS</div>
          </div>

          <div className="tc-summary-row">
            <div>Delivery fee</div>
            <div>{money(order.deliveryFee)} GHS</div>
          </div>

          <div className="tc-summary-row">
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

        <div className="tc-summary-total">
          <div className="tc-summary-total-label">Total</div>
          <div className="tc-summary-total-value">{money(order.total)} GHS</div>
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
        <section className="tc-guest-box">
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

          <div className="tc-actions" style={{ marginTop: 14 }}>
            <Link
              href={`/auth/register?redirect=${encodeURIComponent(`/${townSlug}`)}`}
              className="tc-btn-primary"
            >
              Create account
            </Link>

            <Link href={`/${townSlug}`} className="tc-btn-secondary">
              Continue shopping as guest
            </Link>
          </div>
        </section>
      ) : null}

      <div className="tc-actions">
        <Link href={`/${townSlug}`} className="tc-btn-primary">
          Start another order
        </Link>

        <a href={`/${townSlug}/order/${orderId}`} className="tc-btn-secondary">
          Refresh status
        </a>
      </div>
    </main>
  );
}