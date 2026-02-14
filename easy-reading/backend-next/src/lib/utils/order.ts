/**
 * Generates a unique order ID with timestamp and random string
 */
export function generateOrderId(): string {
  return `ORDER_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
} 