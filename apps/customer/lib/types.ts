export type CatalogResponse = {
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

  filters: {
    townSlug: string;
    search: string | null;
    categorySlug: string | null;
  };

  categories: Array<{
    id: string | null;
    name: string;
    slug: string | null;
    sortOrder: number;

    products: Array<{
      townProductId: string;
      productId: string;
      name: string;
      description: string | null;
      pricingModel: "UNIT" | "WEIGHT" | "VARIANT";
      pricePerUnit: string | null;
      pricePerKg: string | null;

      variants: Array<{
        id: string;
        label: string;
        unitPrice: string;
        packWeightGrams: number | null;
      }>;
    }>;
  }>;
};

export type CartItem =
  | {
      pricingModel: "UNIT";
      townProductId: string;
      name: string;
      unitPrice: string;
      quantity: number;
    }
  | {
      pricingModel: "WEIGHT";
      townProductId: string;
      name: string;
      pricePerKg: string;
      weightGrams: number;
    }
  | {
      pricingModel: "VARIANT";
      townProductId: string;
      townProductVariantId: string;
      name: string;
      variantLabel: string;
      unitPrice: string;
      quantity: number;
    };

export type CreateOrderPayload = {
  townId: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  goodsPaymentMethod?: "COD" | "MOMO";
  items: Array<
    | { townProductId: string; quantity: number }
    | { townProductId: string; weightGrams: number }
    | { townProductId: string; townProductVariantId: string; quantity: number }
  >;
};

export type SearchableProduct = {
  id: string;
  name: string;
  categorySlug?: string | null;
  categoryName?: string | null;
  imageUrl?: string | null;
  pricingModel: "UNIT" | "WEIGHT" | "VARIANT";
  priceLabel: string;
};

export type SearchableCategory = {
  id: string;
  name: string;
  slug: string;
};

export type MiniCartItemAddedDetail = {
  townSlug: string;
  townProductId: string;
  name: string;
  pricingModel: "UNIT" | "WEIGHT" | "VARIANT";
  quantity?: number;
  weightGrams?: number;
  variantLabel?: string;
};