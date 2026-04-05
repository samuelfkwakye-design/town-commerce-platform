"use client";

import { useState } from "react";
import MobileCategoryDrawer from "@/components/MobileCategoryDrawer";

type CategoryItem = {
  id: string;
  name: string;
  slug?: string;
  productCount?: number;
};

export default function MobileCategoryDrawerWrapper({
  townSlug,
  search,
  currentCategorySlug,
  categories,
}: {
  townSlug: string;
  search?: string;
  currentCategorySlug?: string;
  categories: CategoryItem[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <MobileCategoryDrawer
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      townSlug={townSlug}
      search={search}
      currentCategorySlug={currentCategorySlug}
      categories={categories}
    />
  );
}