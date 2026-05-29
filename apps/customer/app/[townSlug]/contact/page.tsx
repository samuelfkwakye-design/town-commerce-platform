import Link from "next/link";
import { Mail, MapPin, MessageCircle, Phone, Store, Clock } from "lucide-react";
import { apiFetch } from "@/lib/api";

type CatalogResponse = {
  town: {
    id: string;
    name: string;
    slug: string;
    contactEmail?: string | null;
    contactPhone?: string | null;
    whatsappNumber?: string | null;
    supportName?: string | null;
    contactAddress?: string | null;
    openingHours?: string | null;
  };
};

function whatsappHref(number?: string | null, townName?: string) {
  if (!number) return null;

  const cleaned = number.replace(/[^\d]/g, "");
  if (!cleaned) return null;

  const text = encodeURIComponent(
    `Hello KOSTOMA, I need help with an order in ${townName ?? "my town"}.`,
  );

  return `https://wa.me/${cleaned}?text=${text}`;
}

export default async function TownContactPage({
  params,
}: {
  params: Promise<{ townSlug: string }>;
}) {
  const { townSlug } = await params;

  const data = await apiFetch<CatalogResponse>(
    `/catalog?townSlug=${encodeURIComponent(townSlug)}`,
  );

  const town = data.town;
  const supportName = town.supportName || `${town.name} Support Team`;
  const whatsAppLink = whatsappHref(town.whatsappNumber, town.name);

  return (
    <main className="min-h-screen bg-[#fff7ed] text-slate-950">
      <section className="mx-auto max-w-4xl px-5 py-8 sm:px-6 lg:px-8">
        <Link
          href={`/${town.slug}`}
          className="inline-flex items-center rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-orange-50"
        >
          ← Back to {town.name} market
        </Link>

        <div className="mt-8 rounded-[2rem] bg-gradient-to-br from-orange-500 to-amber-400 p-6 text-white shadow-xl sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-bold">
            <Store className="h-4 w-4" />
            KOSTOMA Local Support
          </div>

          <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
            Need help in {town.name}?
          </h1>

          <p className="mt-4 max-w-2xl text-lg font-medium text-white/90">
            Contact your local KOSTOMA support team for help with orders,
            delivery, sellers, payments, or anything about shopping in your town.
          </p>
        </div>

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          {whatsAppLink ? (
            <a
              href={whatsAppLink}
              target="_blank"
              rel="noreferrer"
              className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-orange-100 hover:shadow-md"
            >
              <MessageCircle className="h-7 w-7 text-orange-600" />
              <h2 className="mt-4 font-black">WhatsApp us</h2>
              <p className="mt-1 text-sm text-slate-600">
                Fastest way to reach local support.
              </p>
            </a>
          ) : null}

          {town.contactPhone ? (
            <a
              href={`tel:${town.contactPhone}`}
              className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-orange-100 hover:shadow-md"
            >
              <Phone className="h-7 w-7 text-orange-600" />
              <h2 className="mt-4 font-black">Call support</h2>
              <p className="mt-1 text-sm text-slate-600">
                {town.contactPhone}
              </p>
            </a>
          ) : null}

          {town.contactEmail ? (
            <a
              href={`mailto:${town.contactEmail}`}
              className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-orange-100 hover:shadow-md"
            >
              <Mail className="h-7 w-7 text-orange-600" />
              <h2 className="mt-4 font-black">Email us</h2>
              <p className="mt-1 break-words text-sm text-slate-600">
                {town.contactEmail}
              </p>
            </a>
          ) : null}
        </section>

        <section className="mt-6 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-orange-100">
          <h2 className="text-xl font-black">{supportName}</h2>

          <div className="mt-5 space-y-4">
            {town.contactAddress ? (
              <div className="flex gap-3">
                <MapPin className="mt-1 h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-bold">Address</p>
                  <p className="text-sm text-slate-600">{town.contactAddress}</p>
                </div>
              </div>
            ) : null}

            {town.openingHours ? (
              <div className="flex gap-3">
                <Clock className="mt-1 h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-bold">Opening hours</p>
                  <p className="text-sm text-slate-600">{town.openingHours}</p>
                </div>
              </div>
            ) : null}
          </div>

          {!whatsAppLink && !town.contactPhone && !town.contactEmail ? (
            <p className="mt-4 rounded-2xl bg-orange-50 p-4 text-sm font-medium text-slate-700">
              Contact details for this town have not been added yet. Please check
              back soon.
            </p>
          ) : null}
        </section>
      </section>
    </main>
  );
}
