import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  customersTable,
  addressesTable,
  productsTable,
  productVariantsTable,
  cartsTable,
  cartItemsTable,
  ordersTable,
  orderItemsTable
} from '../db/schema';
import { type CreateOrderInput } from '../schema';
import { createOrder } from '../handlers/create_order';
import { eq } from 'drizzle-orm';

describe('createOrder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test data
  const createTestData = async () => {
    // Create customer
    const customer = await db.insert(customersTable)
      .values({
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'Customer',
        phone: '555-0123'
      })
      .returning()
      .execute();

    // Create addresses
    const billingAddress = await db.insert(addressesTable)
      .values({
        customer_id: customer[0].id,
        type: 'billing',
        street_address: '123 Main St',
        apartment: null,
        city: 'Test City',
        state: 'TS',
        postal_code: '12345',
        country: 'USA',
        is_default: true
      })
      .returning()
      .execute();

    const shippingAddress = await db.insert(addressesTable)
      .values({
        customer_id: customer[0].id,
        type: 'shipping',
        street_address: '456 Oak Ave',
        apartment: 'Apt 2',
        city: 'Test City',
        state: 'TS',
        postal_code: '12345',
        country: 'USA',
        is_default: false
      })
      .returning()
      .execute();

    // Create products
    const product1 = await db.insert(productsTable)
      .values({
        name: 'Running Shoe',
        description: 'Comfortable running shoe',
        brand: 'Nike',
        category: 'Athletic',
        base_price: '100.00',
        image_url: 'https://example.com/shoe1.jpg',
        is_active: true
      })
      .returning()
      .execute();

    const product2 = await db.insert(productsTable)
      .values({
        name: 'Casual Sneaker',
        description: 'Stylish casual sneaker',
        brand: 'Adidas',
        category: 'Casual',
        base_price: '80.00',
        image_url: 'https://example.com/shoe2.jpg',
        is_active: true
      })
      .returning()
      .execute();

    // Create product variants
    const variant1 = await db.insert(productVariantsTable)
      .values({
        product_id: product1[0].id,
        size: '9',
        color: 'black',
        stock_quantity: 10,
        price_adjustment: '0.00',
        sku: 'NIKE-RUN-9-BLACK'
      })
      .returning()
      .execute();

    const variant2 = await db.insert(productVariantsTable)
      .values({
        product_id: product2[0].id,
        size: '10',
        color: 'white',
        stock_quantity: 5,
        price_adjustment: '10.00',
        sku: 'ADIDAS-CASUAL-10-WHITE'
      })
      .returning()
      .execute();

    // Create cart
    const cart = await db.insert(cartsTable)
      .values({
        customer_id: customer[0].id
      })
      .returning()
      .execute();

    // Create cart items
    await db.insert(cartItemsTable)
      .values([
        {
          cart_id: cart[0].id,
          product_variant_id: variant1[0].id,
          quantity: 2
        },
        {
          cart_id: cart[0].id,
          product_variant_id: variant2[0].id,
          quantity: 1
        }
      ])
      .execute();

    return {
      customer: customer[0],
      billingAddress: billingAddress[0],
      shippingAddress: shippingAddress[0],
      product1: product1[0],
      product2: product2[0],
      variant1: variant1[0],
      variant2: variant2[0],
      cart: cart[0]
    };
  };

  it('should create order successfully with all items', async () => {
    const testData = await createTestData();

    const input: CreateOrderInput = {
      customer_id: testData.customer.id,
      billing_address_id: testData.billingAddress.id,
      shipping_address_id: testData.shippingAddress.id,
      items: [
        {
          product_variant_id: testData.variant1.id,
          quantity: 2
        },
        {
          product_variant_id: testData.variant2.id,
          quantity: 1
        }
      ]
    };

    const result = await createOrder(input);

    // Verify order basic fields
    expect(result.id).toBeDefined();
    expect(result.customer_id).toEqual(testData.customer.id);
    expect(result.status).toEqual('pending');
    expect(result.order_date).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);

    // Verify calculated amounts
    // Expected: (100 * 2) + (80 + 10) = 290, tax = 290 * 0.08 = 23.2, shipping = 0 (over $100), total = 313.2
    expect(result.total_amount).toBeCloseTo(313.2, 2);
    expect(result.tax_amount).toBeCloseTo(23.2, 2);
    expect(result.shipping_amount).toEqual(0);

    // Verify items
    expect(result.items).toHaveLength(2);
    
    const item1 = result.items.find(item => 
      item.product_variant.product.name === 'Running Shoe'
    );
    expect(item1).toBeDefined();
    expect(item1!.quantity).toEqual(2);
    expect(item1!.unit_price).toEqual(100);
    expect(item1!.total_price).toEqual(200);

    const item2 = result.items.find(item => 
      item.product_variant.product.name === 'Casual Sneaker'
    );
    expect(item2).toBeDefined();
    expect(item2!.quantity).toEqual(1);
    expect(item2!.unit_price).toEqual(90); // 80 + 10 adjustment
    expect(item2!.total_price).toEqual(90);

    // Verify addresses
    expect(result.billing_address.id).toEqual(testData.billingAddress.id);
    expect(result.shipping_address.id).toEqual(testData.shippingAddress.id);
  });

  it('should update stock quantities correctly', async () => {
    const testData = await createTestData();

    const input: CreateOrderInput = {
      customer_id: testData.customer.id,
      billing_address_id: testData.billingAddress.id,
      shipping_address_id: testData.shippingAddress.id,
      items: [
        {
          product_variant_id: testData.variant1.id,
          quantity: 2
        }
      ]
    };

    await createOrder(input);

    // Check stock was reduced
    const updatedVariant = await db.select()
      .from(productVariantsTable)
      .where(eq(productVariantsTable.id, testData.variant1.id))
      .execute();

    expect(updatedVariant[0].stock_quantity).toEqual(8); // 10 - 2
  });

  it('should clear cart items after order creation', async () => {
    const testData = await createTestData();

    const input: CreateOrderInput = {
      customer_id: testData.customer.id,
      billing_address_id: testData.billingAddress.id,
      shipping_address_id: testData.shippingAddress.id,
      items: [
        {
          product_variant_id: testData.variant1.id,
          quantity: 2 // Full quantity from cart
        }
      ]
    };

    await createOrder(input);

    // Check cart item was removed
    const cartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.cart_id, testData.cart.id))
      .execute();

    // Should only have variant2 left
    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].product_variant_id).toEqual(testData.variant2.id);
  });

  it('should reduce cart item quantity when partial order', async () => {
    const testData = await createTestData();

    const input: CreateOrderInput = {
      customer_id: testData.customer.id,
      billing_address_id: testData.billingAddress.id,
      shipping_address_id: testData.shippingAddress.id,
      items: [
        {
          product_variant_id: testData.variant1.id,
          quantity: 1 // Partial quantity from cart (cart has 2)
        }
      ]
    };

    await createOrder(input);

    // Check cart item quantity was reduced
    const cartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.product_variant_id, testData.variant1.id))
      .execute();

    expect(cartItems[0].quantity).toEqual(1); // 2 - 1
  });

  it('should apply free shipping for orders over $100', async () => {
    const testData = await createTestData();

    // Update product price to make total over $100 after tax
    await db.update(productsTable)
      .set({ base_price: '120.00' })
      .where(eq(productsTable.id, testData.product1.id))
      .execute();

    const input: CreateOrderInput = {
      customer_id: testData.customer.id,
      billing_address_id: testData.billingAddress.id,
      shipping_address_id: testData.shippingAddress.id,
      items: [
        {
          product_variant_id: testData.variant1.id,
          quantity: 1
        }
      ]
    };

    const result = await createOrder(input);

    expect(result.shipping_amount).toEqual(0);
    // Expected: 120 + (120 * 0.08) + 0 = 129.6
    expect(result.total_amount).toBeCloseTo(129.6, 2);
  });

  it('should throw error for invalid billing address', async () => {
    const testData = await createTestData();

    const input: CreateOrderInput = {
      customer_id: testData.customer.id,
      billing_address_id: 999, // Invalid ID
      shipping_address_id: testData.shippingAddress.id,
      items: [
        {
          product_variant_id: testData.variant1.id,
          quantity: 1
        }
      ]
    };

    await expect(createOrder(input)).rejects.toThrow(/billing address not found/i);
  });

  it('should throw error for insufficient stock', async () => {
    const testData = await createTestData();

    const input: CreateOrderInput = {
      customer_id: testData.customer.id,
      billing_address_id: testData.billingAddress.id,
      shipping_address_id: testData.shippingAddress.id,
      items: [
        {
          product_variant_id: testData.variant1.id,
          quantity: 20 // More than available stock (10)
        }
      ]
    };

    await expect(createOrder(input)).rejects.toThrow(/insufficient stock/i);
  });

  it('should throw error for empty cart', async () => {
    const testData = await createTestData();

    // Clear cart items
    await db.delete(cartItemsTable)
      .where(eq(cartItemsTable.cart_id, testData.cart.id))
      .execute();

    const input: CreateOrderInput = {
      customer_id: testData.customer.id,
      billing_address_id: testData.billingAddress.id,
      shipping_address_id: testData.shippingAddress.id,
      items: [
        {
          product_variant_id: testData.variant1.id,
          quantity: 1
        }
      ]
    };

    await expect(createOrder(input)).rejects.toThrow(/cart is empty/i);
  });

  it('should throw error for variant not in cart', async () => {
    const testData = await createTestData();

    // Create another variant not in cart
    const extraVariant = await db.insert(productVariantsTable)
      .values({
        product_id: testData.product1.id,
        size: '8',
        color: 'red',
        stock_quantity: 5,
        price_adjustment: '0.00',
        sku: 'NIKE-RUN-8-RED'
      })
      .returning()
      .execute();

    const input: CreateOrderInput = {
      customer_id: testData.customer.id,
      billing_address_id: testData.billingAddress.id,
      shipping_address_id: testData.shippingAddress.id,
      items: [
        {
          product_variant_id: extraVariant[0].id,
          quantity: 1
        }
      ]
    };

    await expect(createOrder(input)).rejects.toThrow(/not found in cart/i);
  });

  it('should throw error when requested quantity exceeds cart quantity', async () => {
    const testData = await createTestData();

    const input: CreateOrderInput = {
      customer_id: testData.customer.id,
      billing_address_id: testData.billingAddress.id,
      shipping_address_id: testData.shippingAddress.id,
      items: [
        {
          product_variant_id: testData.variant1.id,
          quantity: 5 // Cart only has 2
        }
      ]
    };

    await expect(createOrder(input)).rejects.toThrow(/exceeds cart quantity/i);
  });

  it('should save order to database correctly', async () => {
    const testData = await createTestData();

    const input: CreateOrderInput = {
      customer_id: testData.customer.id,
      billing_address_id: testData.billingAddress.id,
      shipping_address_id: testData.shippingAddress.id,
      items: [
        {
          product_variant_id: testData.variant1.id,
          quantity: 1
        }
      ]
    };

    const result = await createOrder(input);

    // Verify order in database
    const orders = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, result.id))
      .execute();

    expect(orders).toHaveLength(1);
    expect(orders[0].customer_id).toEqual(testData.customer.id);
    expect(orders[0].status).toEqual('pending');
    expect(parseFloat(orders[0].total_amount)).toBeCloseTo(108, 2); // 100 + 8 tax + 0 shipping (over $100)

    // Verify order items in database
    const orderItems = await db.select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.order_id, result.id))
      .execute();

    expect(orderItems).toHaveLength(1);
    expect(orderItems[0].product_variant_id).toEqual(testData.variant1.id);
    expect(orderItems[0].quantity).toEqual(1);
    expect(parseFloat(orderItems[0].unit_price)).toEqual(100);
    expect(parseFloat(orderItems[0].total_price)).toEqual(100);
  });
});