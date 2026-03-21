"use client";

import { useEffect, useState } from "react";

type CategoryItem = {
  id: string;
  name: string;
  slug: string;
};

type Props = {
  categories: CategoryItem[];
  topClassName?: string;
};

export default function StickyCategoryNav({
  categories,
  topClassName = "top-[72px]",
}: Props) {
  const [activeSlug, setActiveSlug] = useState<string | null>(categories[0]?.slug ?? null);

  useEffect(() => {
    const sections = categories
      .map((category) => document.getElementById(`category-${category.slug}`))
      .filter(Boolean) as HTMLElement[];

    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible[0]?.target?.id) {
          const slug = visible[0].target.id.replace("category-", "");
          setActiveSlug(slug);
        }
      },
      {
        rootMargin: "-120px 0px -55% 0px",
        threshold: [0.1, 0.25, 0.4, 0.6],
      }
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [categories]);

  const scrollToCategory = (slug: string) => {
    const el = document.getElementById(`category-${slug}`);
    if (!el) return;

    el.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  if (!categories.length) return null;

  return (
    <div className={`sticky z-30 ${topClassName} border-b bg-white/95 backdrop-blur`}>
      <div className="no-scrollbar overflow-x-auto">
        <div className="flex min-w-max gap-2 px-4 py-3">
          {categories.map((category) => {
            const active = activeSlug === category.slug;

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => scrollToCategory(category.slug)}
                className={[
                  "whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition",
                  active
                    ? "border-black bg-black text-white"
                    : "border-border bg-white text-foreground hover:bg-muted",
                ].join(" ")}
              >
                {category.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
