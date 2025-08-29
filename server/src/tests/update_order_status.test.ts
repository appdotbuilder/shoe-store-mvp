import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { ordersTable, customersTable, addressesTable } from '../db/schema';
import { type UpdateOrderStatusInput } from '../schema';
import { updateOrderStatus } from '../handlers/update_order_status';
import { eq } from 'drizzle-orm';

describe('updateOrderStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test prerequisites
  const createTestPrerequisites = async () => {
    // Create customer
    const customerResult = await db.insert(customersTable)
      .values({
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'Customer',
        phone: '+1234567890'
      })
      .returning()
      .execute();
    const customer = customerResult[0];

    // Create addresses
    const addressResult = await db.insert(addressesTable)
      .values({
        customer_id: customer.id,
        type: 'billing',
        street_address: '123 Main St',
        apartment: null,
        city: 'Test City',
        state: 'CA',
        postal_code: '12345',
        country: 'USA',
        is_default: true
      })
      .returning()
      .execute();
    const address = addressResult[0];

    // Create order
    const orderResult = await db.insert(ordersTable)
      .values({
        customer_id: customer.id,
        status: 'pending',
        total_amount: '99.99',
        tax_amount: '8.99',
        shipping_amount: '5.99',
        billing_address_id: address.id,
        shipping_address_id: address.id
      })
      .returning()
      .execute();
    
    return { customer, address, order: orderResult[0] };
  };

  it('should update order status from pending to processing', async () => {
    const { order } = await createTestPrerequisites();
    
    const input: UpdateOrderStatusInput = {
      id: order.id,
      status: 'processing'
    };

    const result = await updateOrderStatus(input);

    expect(result.id).toEqual(order.id);
    expect(result.status).toEqual('processing');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(order.updated_at.getTime());
    
    // Verify numeric conversions
    expect(typeof result.total_amount).toBe('number');
    expect(typeof result.tax_amount).toBe('number');
    expect(typeof result.shipping_amount).toBe('number');
    expect(result.total_amount).toEqual(99.99);
  });

  it('should update order status to shipped and set shipped_date', async () => {
    const { order } = await createTestPrerequisites();
    
    // First update to processing
    await updateOrderStatus({ id: order.id, status: 'processing' });
    
    const input: UpdateOrderStatusInput = {
      id: order.id,
      status: 'shipped'
    };

    const result = await updateOrderStatus(input);

    expect(result.status).toEqual('shipped');
    expect(result.shipped_date).toBeInstanceOf(Date);
    expect(result.shipped_date).not.toBeNull();
    expect(result.delivered_date).toBeNull();
  });

  it('should update order status to delivered and set delivered_date', async () => {
    const { order } = await createTestPrerequisites();
    
    // Update through the workflow: pending -> processing -> shipped -> delivered
    await updateOrderStatus({ id: order.id, status: 'processing' });
    await updateOrderStatus({ id: order.id, status: 'shipped' });
    
    const input: UpdateOrderStatusInput = {
      id: order.id,
      status: 'delivered'
    };

    const result = await updateOrderStatus(input);

    expect(result.status).toEqual('delivered');
    expect(result.shipped_date).toBeInstanceOf(Date);
    expect(result.delivered_date).toBeInstanceOf(Date);
    expect(result.delivered_date).not.toBeNull();
  });

  it('should save status update to database', async () => {
    const { order } = await createTestPrerequisites();
    
    const input: UpdateOrderStatusInput = {
      id: order.id,
      status: 'processing'
    };

    await updateOrderStatus(input);

    // Verify in database
    const orders = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, order.id))
      .execute();

    expect(orders).toHaveLength(1);
    expect(orders[0].status).toEqual('processing');
    expect(orders[0].updated_at).toBeInstanceOf(Date);
    expect(orders[0].updated_at.getTime()).toBeGreaterThan(order.updated_at.getTime());
  });

  it('should cancel order from pending status', async () => {
    const { order } = await createTestPrerequisites();
    
    const input: UpdateOrderStatusInput = {
      id: order.id,
      status: 'cancelled'
    };

    const result = await updateOrderStatus(input);

    expect(result.status).toEqual('cancelled');
    expect(result.shipped_date).toBeNull();
    expect(result.delivered_date).toBeNull();
  });

  it('should cancel order from processing status', async () => {
    const { order } = await createTestPrerequisites();
    
    // First update to processing
    await updateOrderStatus({ id: order.id, status: 'processing' });
    
    const input: UpdateOrderStatusInput = {
      id: order.id,
      status: 'cancelled'
    };

    const result = await updateOrderStatus(input);

    expect(result.status).toEqual('cancelled');
  });

  it('should cancel order from shipped status', async () => {
    const { order } = await createTestPrerequisites();
    
    // Update through workflow to shipped
    await updateOrderStatus({ id: order.id, status: 'processing' });
    await updateOrderStatus({ id: order.id, status: 'shipped' });
    
    const input: UpdateOrderStatusInput = {
      id: order.id,
      status: 'cancelled'
    };

    const result = await updateOrderStatus(input);

    expect(result.status).toEqual('cancelled');
    // Should preserve existing shipped_date
    expect(result.shipped_date).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent order', async () => {
    const input: UpdateOrderStatusInput = {
      id: 99999,
      status: 'processing'
    };

    await expect(updateOrderStatus(input)).rejects.toThrow(/Order with id 99999 not found/i);
  });

  it('should throw error for invalid status transition from pending to shipped', async () => {
    const { order } = await createTestPrerequisites();
    
    const input: UpdateOrderStatusInput = {
      id: order.id,
      status: 'shipped'
    };

    await expect(updateOrderStatus(input)).rejects.toThrow(/Invalid status transition from 'pending' to 'shipped'/i);
  });

  it('should throw error for invalid status transition from pending to delivered', async () => {
    const { order } = await createTestPrerequisites();
    
    const input: UpdateOrderStatusInput = {
      id: order.id,
      status: 'delivered'
    };

    await expect(updateOrderStatus(input)).rejects.toThrow(/Invalid status transition from 'pending' to 'delivered'/i);
  });

  it('should throw error for invalid status transition from processing to delivered', async () => {
    const { order } = await createTestPrerequisites();
    
    // Update to processing first
    await updateOrderStatus({ id: order.id, status: 'processing' });
    
    const input: UpdateOrderStatusInput = {
      id: order.id,
      status: 'delivered'
    };

    await expect(updateOrderStatus(input)).rejects.toThrow(/Invalid status transition from 'processing' to 'delivered'/i);
  });

  it('should throw error for status transition from delivered', async () => {
    const { order } = await createTestPrerequisites();
    
    // Complete the full workflow to delivered
    await updateOrderStatus({ id: order.id, status: 'processing' });
    await updateOrderStatus({ id: order.id, status: 'shipped' });
    await updateOrderStatus({ id: order.id, status: 'delivered' });
    
    const input: UpdateOrderStatusInput = {
      id: order.id,
      status: 'cancelled'
    };

    await expect(updateOrderStatus(input)).rejects.toThrow(/Invalid status transition from 'delivered' to 'cancelled'/i);
  });

  it('should throw error for status transition from cancelled', async () => {
    const { order } = await createTestPrerequisites();
    
    // Cancel the order
    await updateOrderStatus({ id: order.id, status: 'cancelled' });
    
    const input: UpdateOrderStatusInput = {
      id: order.id,
      status: 'processing'
    };

    await expect(updateOrderStatus(input)).rejects.toThrow(/Invalid status transition from 'cancelled' to 'processing'/i);
  });

  it('should not update shipped_date if already set', async () => {
    const { order } = await createTestPrerequisites();
    
    // Update through workflow to shipped
    await updateOrderStatus({ id: order.id, status: 'processing' });
    const shippedResult = await updateOrderStatus({ id: order.id, status: 'shipped' });
    const originalShippedDate = shippedResult.shipped_date;
    
    // Wait a small amount to ensure timestamp difference would be detectable
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Update to delivered
    const deliveredResult = await updateOrderStatus({ id: order.id, status: 'delivered' });
    
    // Should preserve original shipped_date
    expect(deliveredResult.shipped_date).toBeInstanceOf(Date);
    expect(originalShippedDate).toBeInstanceOf(Date);
    expect(deliveredResult.shipped_date!.getTime()).toEqual(originalShippedDate!.getTime());
    expect(deliveredResult.delivered_date).toBeInstanceOf(Date);
  });
});