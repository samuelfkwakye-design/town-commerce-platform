export default function TrustSignals({ town }: { town: string }) {
  return (
    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">

      <div className="rounded-xl border p-4 bg-white">
        <div className="font-semibold">
          Delivery today in {town}
        </div>
        <div className="text-sm text-gray-500">
          Orders are picked from local market vendors.
        </div>
      </div>

      <div className="rounded-xl border p-4 bg-white">
        <div className="font-semibold">
          Fresh market produce
        </div>
        <div className="text-sm text-gray-500">
          Items are sourced from trusted market sellers.
        </div>
      </div>

      <div className="rounded-xl border p-4 bg-white">
        <div className="font-semibold">
          Pay on delivery
        </div>
        <div className="text-sm text-gray-500">
          Cash or MoMo accepted when your order arrives.
        </div>
      </div>

    </div>
  );
}
