import type { CartItem, MiniCartItemAddedDetail } from "@/lib/types";

const CART_KEY = "town-commerce-cart";
const CART_UPDATED_EVENT = "town-commerce-cart-updated";
const CART_ITEM_ADDED_EVENT = "town-commerce-cart-item-added";

export function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  dispatchCartUpdated();
}

export function clearCart() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(CART_KEY);
  dispatchCartUpdated();
}

export function dispatchCartUpdated() {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT));
}

export function dispatchCartItemAdded(detail: MiniCartItemAddedDetail) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(CART_ITEM_ADDED_EVENT, {
      detail,
    })
  );
}

export function getCartUpdatedEventName() {
  return CART_UPDATED_EVENT;
}

export function getCartItemAddedEventName() {
  return CART_ITEM_ADDED_EVENT;
}

export function getCartItemCount(cart: CartItem[]) {
  return cart.reduce((sum, item) => {
    if (item.pricingModel === "WEIGHT") return sum + 1;

    return sum + Number((item as any).quantity ?? 0);
  }, 0);
}

export function getCartSubtotal(cart: CartItem[]) {
  return cart.reduce((sum, item) => {
    if (item.pricingModel === "WEIGHT") {
      return (
        sum +
        (Number((item as any).pricePerKg ?? 0) *
          Number((item as any).weightGrams ?? 0)) /
          1000
      );
    }

    return (
      sum +
      Number((item as any).unitPrice ?? 0) *
        Number((item as any).quantity ?? 0)
    );
  }, 0);
}
  export function addOrMergeCartItem(cart: CartItem[], item: CartItem): CartItem[] {
  const existingIndex = cart.findIndex((current) => {
    if (current.townProductId !== item.townProductId) return false;
    if (current.pricingModel !== item.pricingModel) return false;

    if (item.pricingModel === "VARIANT") {
      return (
        (current as any).townProductVariantId ===
        (item as any).townProductVariantId
      );
    }

    return true;
  });

  if (existingIndex === -1) {
    return [...cart, item];
  }

  const next = [...cart];
  const existing = next[existingIndex] as any;

  if (item.pricingModel === "WEIGHT") {
    existing.weightGrams =
      Number(existing.weightGrams || 0) + Number((item as any).weightGrams || 0);
  } else {
    existing.quantity =
      Number(existing.quantity || 0) + Number((item as any).quantity || 0);
  }

  next[existingIndex] = existing;

  return next;

}