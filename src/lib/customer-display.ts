export const CUSTOMER_DISPLAY_CHANNEL = 'customer-display';

export interface CustomerDisplayItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export type CustomerDisplayMessage =
  | {
      type: 'cart-update';
      storeName: string;
      items: CustomerDisplayItem[];
      subtotal: number;
      discount: number;
      tax: number;
      total: number;
      customerName?: string;
    }
  | {
      type: 'sale-complete';
      invoiceNumber: string;
      total: number;
      paid: number;
      change: number;
    }
  | {
      type: 'request-sync';
    };
