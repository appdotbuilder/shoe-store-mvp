import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  customersTable, 
  productsTable, 
  productVariantsTable, 
  cartsTable, 
  cartItemsTable 
} from '../db/schema';
import { type CreateCartItemInput } from '../schema';
import { addToCart, removeFromCart } from '../handlers/add_to_cart';
import { eq, and } from 'drizzle-orm';

describe('addToCart', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let customerId: number;
  let cartId: number;
  let productId: number;
  let variantId: number;

  beforeEach(async () => {
    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        phone: null
      })
      .returning()
      .execute();
    customerId = customerResult[0].id;

    // Create test cart
    const cartResult = await db.insert(cartsTable)
      .values({
        customer_id: customerId
      })
      .returning()
      .execute();
    cartId = cartResult[0].id;

    // Create test product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Shoe',
        description: 'A test shoe',
        brand: 'TestBrand',
        category: 'sneakers',
        base_price: '99.99',
        image_url: 'https://example.com/shoe.jpg',
        is_active: true
      })
      .returning()
      .execute();
    productId = productResult[0].id;

    // Create test product variant
    const variantResult = await db.insert(productVariantsTable)
      .values({
        product_id: productId,
        size: '9',
        color: 'black',
        stock_quantity: 10,
        price_adjustment: '0.00',
        sku: 'TEST-SHOE-9-BLACK'
      })
      .returning()
      .execute();
    variantId = variantResult[0].id;
  });

  it('should add new item to cart', async () => {
    const input: CreateCartItemInput = {
      cart_id: cartId,
      product_variant_id: variantId,
      quantity: 2
    };

    const result = await addToCart(input);

    expect(result.cart_id).toEqual(cartId);
    expect(result.product_variant_id).toEqual(variantId);
    expect(result.quantity).toEqual(2);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save cart item to database', async () => {
    const input: CreateCartItemInput = {
      cart_id: cartId,
      product_variant_id: variantId,
      quantity: 1
    };

    const result = await addToCart(input);

    const cartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.id, result.id))
      .execute();

    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].cart_id).toEqual(cartId);
    expect(cartItems[0].product_variant_id).toEqual(variantId);
    expect(cartItems[0].quantity).toEqual(1);
  });

  it('should update quantity when item already exists in cart', async () => {
    const input: CreateCartItemInput = {
      cart_id: cartId,
      product_variant_id: variantId,
      quantity: 2
    };

    // Add item first time
    const firstResult = await addToCart(input);
    
    // Add same item again
    const secondResult = await addToCart(input);

    // Should return same cart item with updated quantity
    expect(secondResult.id).toEqual(firstResult.id);
    expect(secondResult.quantity).toEqual(4); // 2 + 2
    expect(secondResult.updated_at.getTime()).toBeGreaterThan(firstResult.updated_at.getTime());

    // Verify in database
    const cartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.cart_id, cartId))
      .execute();

    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].quantity).toEqual(4);
  });

  it('should throw error when product variant not found', async () => {
    const input: CreateCartItemInput = {
      cart_id: cartId,
      product_variant_id: 99999, // Non-existent variant
      quantity: 1
    };

    expect(addToCart(input)).rejects.toThrow(/product variant not found/i);
  });

  it('should throw error when insufficient stock', async () => {
    const input: CreateCartItemInput = {
      cart_id: cartId,
      product_variant_id: variantId,
      quantity: 15 // More than available stock (10)
    };

    expect(addToCart(input)).rejects.toThrow(/insufficient stock/i);
  });

  it('should throw error when total quantity would exceed stock', async () => {
    // First add some items
    await addToCart({
      cart_id: cartId,
      product_variant_id: variantId,
      quantity: 8
    });

    // Try to add more that would exceed stock
    const input: CreateCartItemInput = {
      cart_id: cartId,
      product_variant_id: variantId,
      quantity: 5 // 8 + 5 = 13, which exceeds stock of 10
    };

    expect(addToCart(input)).rejects.toThrow(/total quantity would exceed/i);
  });

  it('should handle multiple different variants in same cart', async () => {
    // Create second variant
    const secondVariant = await db.insert(productVariantsTable)
      .values({
        product_id: productId,
        size: '10',
        color: 'white',
        stock_quantity: 5,
        price_adjustment: '5.00',
        sku: 'TEST-SHOE-10-WHITE'
      })
      .returning()
      .execute();

    // Add first variant
    await addToCart({
      cart_id: cartId,
      product_variant_id: variantId,
      quantity: 2
    });

    // Add second variant
    const result = await addToCart({
      cart_id: cartId,
      product_variant_id: secondVariant[0].id,
      quantity: 1
    });

    // Verify both items exist
    const cartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.cart_id, cartId))
      .execute();

    expect(cartItems).toHaveLength(2);
    
    const firstItem = cartItems.find(item => item.product_variant_id === variantId);
    const secondItem = cartItems.find(item => item.product_variant_id === secondVariant[0].id);
    
    expect(firstItem?.quantity).toEqual(2);
    expect(secondItem?.quantity).toEqual(1);
  });
});

describe('removeFromCart', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let customerId: number;
  let cartId: number;
  let productId: number;
  let variantId: number;
  let cartItemId: number;

  beforeEach(async () => {
    // Create test data
    const customerResult = await db.insert(customersTable)
      .values({
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        phone: null
      })
      .returning()
      .execute();
    customerId = customerResult[0].id;

    const cartResult = await db.insert(cartsTable)
      .values({
        customer_id: customerId
      })
      .returning()
      .execute();
    cartId = cartResult[0].id;

    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Shoe',
        description: 'A test shoe',
        brand: 'TestBrand',
        category: 'sneakers',
        base_price: '99.99',
        image_url: null,
        is_active: true
      })
      .returning()
      .execute();
    productId = productResult[0].id;

    const variantResult = await db.insert(productVariantsTable)
      .values({
        product_id: productId,
        size: '9',
        color: 'black',
        stock_quantity: 10,
        price_adjustment: '0.00',
        sku: 'TEST-SHOE-9-BLACK'
      })
      .returning()
      .execute();
    variantId = variantResult[0].id;

    // Create test cart item
    const cartItemResult = await db.insert(cartItemsTable)
      .values({
        cart_id: cartId,
        product_variant_id: variantId,
        quantity: 2
      })
      .returning()
      .execute();
    cartItemId = cartItemResult[0].id;
  });

  it('should remove cart item successfully', async () => {
    await removeFromCart(cartItemId);

    // Verify item was removed from database
    const cartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.id, cartItemId))
      .execute();

    expect(cartItems).toHaveLength(0);
  });

  it('should throw error when cart item not found', async () => {
    const nonExistentId = 99999;

    expect(removeFromCart(nonExistentId)).rejects.toThrow(/cart item not found/i);
  });

  it('should remove only specified item when multiple items exist', async () => {
    // Create second product variant for the second cart item
    const secondVariant = await db.insert(productVariantsTable)
      .values({
        product_id: productId,
        size: '10',
        color: 'white',
        stock_quantity: 5,
        price_adjustment: '0.00',
        sku: 'TEST-SHOE-10-WHITE-REMOVE'
      })
      .returning()
      .execute();

    // Create second cart item with different variant
    const secondItem = await db.insert(cartItemsTable)
      .values({
        cart_id: cartId,
        product_variant_id: secondVariant[0].id,
        quantity: 1
      })
      .returning()
      .execute();

    // Remove first item
    await removeFromCart(cartItemId);

    // Verify only first item was removed
    const remainingItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.cart_id, cartId))
      .execute();

    expect(remainingItems).toHaveLength(1);
    expect(remainingItems[0].id).toEqual(secondItem[0].id);
  });
});