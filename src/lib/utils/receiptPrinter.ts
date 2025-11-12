/**
 * Receipt Printer Utility
 * Handles fetching order data and preparing it for receipt printing
 */

/**
 * Fetch complete order details for receipt printing
 * @param orderId - The order ID to fetch
 * @returns Promise with complete order data including items, customer, cashier, and table
 */
export async function fetchOrderForReceipt(orderId: string) {
  try {
    // Fetch order with summary to get all related data
    const response = await fetch(`/api/orders/${orderId}?includeSummary=true`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch order details');
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch order details');
    }

    // Extract order from nested structure (getOrderSummary returns { order, summary })
    const data = result.data;
    
    // If the response has an 'order' property, extract it (from getOrderSummary)
    // Otherwise, return the data as-is (from getById)
    return data.order || data;
  } catch (error) {
    console.error('Error fetching order for receipt:', error);
    throw error;
  }
}

/**
 * Auto-print receipt using browser's print dialog
 * This function waits for the receipt component to render before triggering print
 */
export function autoPrintReceipt() {
  // Small delay to ensure component is fully rendered
  setTimeout(() => {
    window.print();
  }, 500);
}

/**
 * Check if browser supports printing
 */
export function isPrintSupported(): boolean {
  return typeof window !== 'undefined' && 'print' in window;
}
