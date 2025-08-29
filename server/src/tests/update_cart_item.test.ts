import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, cartsTable, productsTable, productVariantsTable, cartItemsTable } from '../db/schema';
import { type UpdateCartItemInput } from '../schema';
import { updateCartItemQuantity } from '../handlers/update_cart_item';
import { eq } from 'drizzle-orm';

describe('updateCartItemQuantity', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testCustomerId: number;
  let testCartId: number;
  let testProductId: number;
  let testVariantId: number;
  let testCartItemId: number;

  const setupTestData = async () => {
    // Create test customer
    const customers = await db.insert(customersTable)
      .values({
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        phone: '555-1234'
      })
      .returning()
      .execute();
    testCustomerId = customers[0].id;

    // Create test cart
    const carts = await db.insert(cartsTable)
      .values({
        customer_id: testCustomerId
      })
      .returning()
      .execute();
    testCartId = carts[0].id;

    // Create test product
    const products = await db.insert(productsTable)
      .values({
        name: 'Test Shoe',
        description: 'A test shoe',
        brand: 'Test Brand',
        category: 'Sneakers',
        base_price: '99.99'
      })
      .returning()
      .execute();
    testProductId = products[0].id;

    // Create test product variant with stock
    const variants = await db.insert(productVariantsTable)
      .values({
        product_id: testProductId,
        size: '9',
        color: 'black',
        stock_quantity: 10,
        price_adjustment: '0.00',
        sku: 'TEST-9-BLACK'
      })
      .returning()
      .execute();
    testVariantId = variants[0].id;

    // Create test cart item
    const cartItems = await db.insert(cartItemsTable)
      .values({
        cart_id: testCartId,
        product_variant_id: testVariantId,
        quantity: 2
      })
      .returning()
      .execute();
    testCartItemId = cartItems[0].id;
  };

  it('should update cart item quantity successfully', async () => {
    await setupTestData();

    const input: UpdateCartItemInput = {
      id: testCartItemId,
      quantity: 5
    };

    const result = await updateCartItemQuantity(input);

    expect(result.id).toEqual(testCartItemId);
    expect(result.cart_id).toEqual(testCartId);
    expect(result.product_variant_id).toEqual(testVariantId);
    expect(result.quantity).toEqual(5);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save updated quantity to database', async () => {
    await setupTestData();

    const input: UpdateCartItemInput = {
      id: testCartItemId,
      quantity: 3
    };

    await updateCartItemQuantity(input);

    // Verify the quantity was updated in the database
    const cartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.id, testCartItemId))
      .execute();

    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].quantity).toEqual(3);
    expect(cartItems[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when cart item does not exist', async () => {
    const input: UpdateCartItemInput = {
      id: 99999, // Non-existent cart item ID
      quantity: 5
    };

    await expect(updateCartItemQuantity(input)).rejects.toThrow(/cart item not found/i);
  });

  it('should throw error when quantity exceeds available stock', async () => {
    await setupTestData();

    const input: UpdateCartItemInput = {
      id: testCartItemId,
      quantity: 15 // Exceeds stock_quantity of 10
    };

    await expect(updateCartItemQuantity(input)).rejects.toThrow(/insufficient stock/i);
  });

  it('should allow quantity equal to available stock', async () => {
    await setupTestData();

    const input: UpdateCartItemInput = {
      id: testCartItemId,
      quantity: 10 // Equals stock_quantity
    };

    const result = await updateCartItemQuantity(input);

    expect(result.quantity).toEqual(10);
  });

  it('should throw error when cart item is deleted due to variant removal', async () => {
    await setupTestData();

    // Create another product variant first
    const secondVariant = await db.insert(productVariantsTable)
      .values({
        product_id: testProductId,
        size: '10',
        color: 'white',
        stock_quantity: 5,
        price_adjustment: '0.00',
        sku: 'TEST-10-WHITE'
      })
      .returning()
      .execute();

    const secondVariantId = secondVariant[0].id;

    // Create a cart item for this second variant
    const secondCartItem = await db.insert(cartItemsTable)
      .values({
        cart_id: testCartId,
        product_variant_id: secondVariantId,
        quantity: 1
      })
      .returning()
      .execute();

    const secondCartItemId = secondCartItem[0].id;

    // Delete the second variant (this will cascade and delete the cart item due to FK constraint)
    await db.delete(productVariantsTable)
      .where(eq(productVariantsTable.id, secondVariantId))
      .execute();

    // Try to update the cart item that was deleted due to cascade
    const input: UpdateCartItemInput = {
      id: secondCartItemId,
      quantity: 5
    };

    // This should fail with "cart item not found" because the cascade delete removed it
    await expect(updateCartItemQuantity(input)).rejects.toThrow(/cart item not found/i);
  });

  it('should handle minimum quantity of 1', async () => {
    await setupTestData();

    const input: UpdateCartItemInput = {
      id: testCartItemId,
      quantity: 1
    };

    const result = await updateCartItemQuantity(input);

    expect(result.quantity).toEqual(1);

    // Verify in database
    const cartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.id, testCartItemId))
      .execute();

    expect(cartItems[0].quantity).toEqual(1);
  });

  it('should update updated_at timestamp while preserving created_at', async () => {
    await setupTestData();

    // Get the original created_at timestamp
    const originalCartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.id, testCartItemId))
      .execute();
    const originalCreatedAt = originalCartItems[0].created_at;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdateCartItemInput = {
      id: testCartItemId,
      quantity: 7
    };

    const result = await updateCartItemQuantity(input);

    expect(result.created_at).toEqual(originalCreatedAt);
    expect(result.updated_at > originalCreatedAt).toBe(true);
  });
});