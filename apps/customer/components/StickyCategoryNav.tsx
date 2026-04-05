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
  const [activeSlug, setActiveSlug] = useState<string | null>(
    categories[0]?.slug ?? null
  );

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
        rootMargin: "-110px 0px -55% 0px",
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
    <div
      className={`sticky z-30 ${topClassName} border-b border-orange-100 bg-white/95 backdrop-blur`}
    >
      <div className="no-scrollbar overflow-x-auto">
        <div className="flex min-w-max gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
          {categories.map((category) => {
            const active = activeSlug === category.slug;

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => scrollToCategory(category.slug)}
                className={[
                  "max-w-[70vw] truncate whitespace-nowrap rounded-full border px-3 py-2 text-xs font-medium transition sm:max-w-none sm:px-4 sm:text-sm",
                  active
                    ? "border-black bg-black text-white"
                    : "border-orange-200 bg-white text-slate-700 hover:bg-orange-50",
                ].join(" ")}
                title={category.name}
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