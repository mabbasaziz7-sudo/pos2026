export const PRICE_CHECK_CHANNEL = 'price-check';

export type PriceCheckMessage =
  | { type: 'product-found'; productId: number }
  | { type: 'not-found'; query: string }
  | { type: 'clear' };
