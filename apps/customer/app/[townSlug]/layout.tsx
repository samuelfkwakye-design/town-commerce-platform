import Link from "next/link";
import { Button } from "@/components/ui/button";

function titleCaseFromSlug(slug?: string) {
  const safe = (slug ?? "").trim();
  if (!safe) return "Market";

  return safe
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default async function TownLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { townSlug: string };
}) {
  const townSlug = params?.townSlug ?? "";
  const townLabel = titleCaseFromSlug(townSlug);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
          <Link href={`/${townSlug}`} className="shrink-0">
            <div className="text-xl font-extrabold tracking-tight text-primary">
              Town Commerce
            </div>
            <div className="text-xs text-slate-500">
  {townLabel === "Market" ? "Market" : `${townLabel} Market`}
</div>
          </Link>

          <form
            action={`/${townSlug}`}
            method="get"
            className="mx-auto flex w-full max-w-2xl gap-2"
            role="search"
          >
            <input
              name="search"
              placeholder="Search products..."
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 outline-none focus:border-primary"
            />
            <Button
              type="submit"
              className="transition hover:bg-primary/90 active:scale-[0.98]"
            >
              Search
            </Button>
          </form>

          <Link href={`/${townSlug}/cart`} className="shrink-0">
            <Button className="transition hover:bg-primary/90 active:scale-[0.98]">
              Cart
            </Button>
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 pb-10">{children}</main>
    </div>
  );
}