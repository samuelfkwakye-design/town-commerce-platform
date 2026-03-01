"use client";

export function ExportOrdersCsvButton() {
  const adminKey = process.env.NEXT_PUBLIC_ADMIN_KEY;
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

  function download() {
    const url = new URL("/api/v1/admin/exports/orders.csv", apiBase);

    // keep current filters from the URL
    const params = new URLSearchParams(window.location.search);
    params.forEach((v, k) => url.searchParams.set(k, v));

    if (adminKey) url.searchParams.set("adminKey", adminKey);

    window.location.href = url.toString();
  }

  return (
    <button
      type="button"
      onClick={download}
      className="px-3 py-2 rounded bg-black text-white text-sm"
    >
      Export Orders CSV
    </button>
  );
}

