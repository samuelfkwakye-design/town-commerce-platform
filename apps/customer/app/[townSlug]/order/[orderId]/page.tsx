import Link from 'next/link';
import { apiFetch } from '@/lib/api';

function money(v: any) {
  const n = Number(v ?? 0);
  return n.toFixed(2);
}

export default async function OrderPage({
  params,
}: {
  params: Promise<{ townSlug: string; orderId: string }>;
}) {
  const { townSlug, orderId } = await params;

  const order = await apiFetch<any>(`/orders/${encodeURIComponent(orderId)}`);

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Link href={`/${townSlug}`}>← Back to market</Link>
        <Link href={`/${townSlug}/cart`}>Cart</Link>
      </header>

      <h1 style={{ marginTop: 12 }}>Order received</h1>

      <div style={{ marginTop: 10, border: '1px solid #ddd', borderRadius: 12, padding: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ color: '#666', fontSize: 13 }}>Order ID</div>
            <div style={{ fontFamily: 'monospace' }}>{order.id}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#666', fontSize: 13 }}>Status</div>
            <div style={{ fontWeight: 800 }}>{order.status}</div>
          </div>
        </div>

        <div style={{ marginTop: 10, color: '#666', fontSize: 13 }}>
          Ops will confirm and fulfil this order. Refresh this page to see updates.
        </div>
      </div>

      <h3 style={{ marginTop: 16 }}>Items</h3>
      <div style={{ display: 'grid', gap: 10 }}>
        {(order.items ?? []).map((it: any) => (
          <div key={it.id} style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 800 }}>
              {it.townProduct?.product?.name ?? 'Item'}
            </div>

            {it.variant?.label ? (
              <div style={{ color: '#666', fontSize: 13 }}>Variant: {it.variant.label}</div>
            ) : null}

            <div style={{ marginTop: 6 }}>
              {it.quantity != null ? (
                <>Qty: {it.quantity}</>
              ) : (
                <>Weight: {it.weightGrams}g</>
              )}
            </div>

            <div style={{ marginTop: 6, color: '#666', fontSize: 13 }}>
              Unit price: {money(it.unitPrice)} GHS
            </div>

            <div style={{ marginTop: 6, fontWeight: 800 }}>
              Line total: {money(it.lineTotal)} GHS
            </div>
          </div>
        ))}
      </div>

      <h3 style={{ marginTop: 16 }}>Summary</h3>
      <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>Items subtotal</div>
          <div>{money(order.itemsSubtotal)} GHS</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>Delivery fee</div>
          <div>{money(order.deliveryFee)} GHS</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>Service fee</div>
          <div>{money(order.serviceFee)} GHS</div>
        </div>
        <hr style={{ margin: '12px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18 }}>
          <div style={{ fontWeight: 800 }}>Total</div>
          <div style={{ fontWeight: 900 }}>{money(order.total)} GHS</div>
        </div>

        <div style={{ marginTop: 10, color: '#666', fontSize: 13 }}>
          Payment method (goods): <b>{order.goodsPaymentMethod}</b> (collected on delivery)
        </div>
      </div>

      <div style={{ marginTop: 14, display: 'flex', gap: 12 }}>
        <Link href={`/${townSlug}`}>Start another order</Link>
        <a href={`/${townSlug}/order/${orderId}`}>Refresh status</a>
      </div>
    </main>
  );
}
