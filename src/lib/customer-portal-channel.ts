export const CUSTOMER_PORTAL_CHANNEL = 'customer-portal';

export type CustomerPortalMessage =
  | { type: 'customer-active'; customerId: number }
  | { type: 'transaction-update'; total: number; cashPaid: number; creditAmount: number; walletAmount: number; paymentType: string }
  | { type: 'sale-complete'; invoiceNumber: string; total: number; pointsEarned: number; newBalance: number; newWallet: number; newDebt: number }
  | { type: 'clear' };
