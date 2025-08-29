import { db } from '../db';
import { ordersTable } from '../db/schema';
import { type UpdateOrderStatusInput, type Order } from '../schema';
import { eq } from 'drizzle-orm';

// Define valid status transitions
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  'pending': ['processing', 'cancelled'],
  'processing': ['shipped', 'cancelled'],
  'shipped': ['delivered', 'cancelled'],
  'delivered': [], // Final state - no transitions allowed
  'cancelled': [] // Final state - no transitions allowed
};

export const updateOrderStatus = async (input: UpdateOrderStatusInput): Promise<Order> => {
  try {
    // First, get the existing order to validate status transition
    const existingOrders = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, input.id))
      .execute();

    if (existingOrders.length === 0) {
      throw new Error(`Order with id ${input.id} not found`);
    }

    const existingOrder = existingOrders[0];
    
    // Validate status transition
    const allowedTransitions = VALID_STATUS_TRANSITIONS[existingOrder.status];
    if (!allowedTransitions.includes(input.status)) {
      throw new Error(`Invalid status transition from '${existingOrder.status}' to '${input.status}'`);
    }

    // Prepare update data
    const updateData: any = {
      status: input.status,
      updated_at: new Date()
    };

    // Set timestamps based on status
    if (input.status === 'shipped' && !existingOrder.shipped_date) {
      updateData.shipped_date = new Date();
    }
    
    if (input.status === 'delivered' && !existingOrder.delivered_date) {
      updateData.delivered_date = new Date();
    }

    // Update the order
    const result = await db.update(ordersTable)
      .set(updateData)
      .where(eq(ordersTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers
    const updatedOrder = result[0];
    return {
      ...updatedOrder,
      total_amount: parseFloat(updatedOrder.total_amount),
      tax_amount: parseFloat(updatedOrder.tax_amount),
      shipping_amount: parseFloat(updatedOrder.shipping_amount)
    };
  } catch (error) {
    console.error('Order status update failed:', error);
    throw error;
  }
};