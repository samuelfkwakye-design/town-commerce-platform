export type StockMovementLiteDto = {
  id: string;
  createdAt: string;

  townProductId: string;

  type: string; // keep generic; you may have enum in schema
  reason: string | null;

  deltaQty: number | null;
  deltaWeightGrams: number | null;

  orderId: string | null;
  orderItemId: string | null;
  refundId: string | null;
  refundItemId: string | null;

  note: string | null;
};

export type CursorPageInfoDto = {
  limit: number;
  hasNextPage: boolean;
  nextCursor: string | null;
};

export type StockMovementsPageDto = {
  items: StockMovementLiteDto[];
  pageInfo: CursorPageInfoDto;
};
