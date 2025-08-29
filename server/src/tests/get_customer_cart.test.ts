import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, cartsTable, cartItemsTable, productsTable, productVariantsTable } from '../db/schema';
import { getCustomerCart } from '../handlers/get_customer_cart';
import { eq } from 'drizzle-orm';

describe('getCustomerCart', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a new cart if customer has no cart', async () => {
    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        phone: null
      })
      .returning()
      .execute();

    const customer = customerResult[0];

    // Get cart for customer (should create new cart)
    const result = await getCustomerCart(customer.id);

    expect(result.customer_id).toBe(customer.id);
    expect(result.items).toHaveLength(0);
    expect(result.id).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify cart was actually created in database
    const carts = await db.select()
      .from(cartsTable)
      .where(eq(cartsTable.customer_id, customer.id))
      .execute();

    expect(carts).toHaveLength(1);
    expect(carts[0].id).toBe(result.id);
  });

  it('should return existing cart if customer already has one', async () => {
    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        phone: null
      })
      .returning()
      .execute();

    const customer = customerResult[0];

    // Create cart manually
    const cartResult = await db.insert(cartsTable)
      .values({
        customer_id: customer.id
      })
      .returning()
      .execute();

    const existingCart = cartResult[0];

    // Get cart for customer (should return existing cart)
    const result = await getCustomerCart(customer.id);

    expect(result.id).toBe(existingCart.id);
    expect(result.customer_id).toBe(customer.id);
    expect(result.items).toHaveLength(0);
  });

  it('should return cart with items including product details', async () => {
    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        phone: null
      })
      .returning()
      .execute();

    const customer = customerResult[0];

    // Create test product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Sneaker',
        description: 'A test sneaker',
        brand: 'Nike',
        category: 'Running',
        base_price: '99.99',
        image_url: 'https://example.com/shoe.jpg',
        is_active: true
      })
      .returning()
      .execute();

    const product = productResult[0];

    // Create product variant
    const variantResult = await db.insert(productVariantsTable)
      .values({
        product_id: product.id,
        size: '10',
        color: 'black',
        stock_quantity: 50,
        price_adjustment: '5.00',
        sku: 'TEST-10-BLACK'
      })
      .returning()
      .execute();

    const variant = variantResult[0];

    // Create cart
    const cartResult = await db.insert(cartsTable)
      .values({
        customer_id: customer.id
      })
      .returning()
      .execute();

    const cart = cartResult[0];

    // Add item to cart
    await db.insert(cartItemsTable)
      .values({
        cart_id: cart.id,
        product_variant_id: variant.id,
        quantity: 2
      })
      .execute();

    // Get cart with items
    const result = await getCustomerCart(customer.id);

    expect(result.id).toBe(cart.id);
    expect(result.customer_id).toBe(customer.id);
    expect(result.items).toHaveLength(1);

    const item = result.items[0];
    expect(item.quantity).toBe(2);
    expect(item.product_variant.id).toBe(variant.id);
    expect(item.product_variant.size).toBe('10');
    expect(item.product_variant.color).toBe('black');
    expect(typeof item.product_variant.price_adjustment).toBe('number');
    expect(item.product_variant.price_adjustment).toBe(5.00);
    expect(item.product_variant.product.name).toBe('Test Sneaker');
    expect(item.product_variant.product.brand).toBe('Nike');
    expect(typeof item.product_variant.product.base_price).toBe('number');
    expect(item.product_variant.product.base_price).toBe(99.99);
    expect(item.product_variant.product.image_url).toBe('https://example.com/shoe.jpg');
  });

  it('should return cart with multiple items', async () => {
    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        phone: null
      })
      .returning()
      .execute();

    const customer = customerResult[0];

    // Create test products and variants
    const productResult1 = await db.insert(productsTable)
      .values({
        name: 'Sneaker A',
        description: 'First sneaker',
        brand: 'Nike',
        category: 'Running',
        base_price: '99.99',
        image_url: null,
        is_active: true
      })
      .returning()
      .execute();

    const productResult2 = await db.insert(productsTable)
      .values({
        name: 'Sneaker B',
        description: 'Second sneaker',
        brand: 'Adidas',
        category: 'Casual',
        base_price: '79.99',
        image_url: 'https://example.com/shoe2.jpg',
        is_active: true
      })
      .returning()
      .execute();

    const variant1Result = await db.insert(productVariantsTable)
      .values({
        product_id: productResult1[0].id,
        size: '9',
        color: 'white',
        stock_quantity: 25,
        price_adjustment: '0.00',
        sku: 'TEST-A-9-WHITE'
      })
      .returning()
      .execute();

    const variant2Result = await db.insert(productVariantsTable)
      .values({
        product_id: productResult2[0].id,
        size: '11',
        color: 'blue',
        stock_quantity: 10,
        price_adjustment: '-10.00',
        sku: 'TEST-B-11-BLUE'
      })
      .returning()
      .execute();

    // Create cart
    const cartResult = await db.insert(cartsTable)
      .values({
        customer_id: customer.id
      })
      .returning()
      .execute();

    const cart = cartResult[0];

    // Add items to cart
    await db.insert(cartItemsTable)
      .values([
        {
          cart_id: cart.id,
          product_variant_id: variant1Result[0].id,
          quantity: 1
        },
        {
          cart_id: cart.id,
          product_variant_id: variant2Result[0].id,
          quantity: 3
        }
      ])
      .execute();

    // Get cart with items
    const result = await getCustomerCart(customer.id);

    expect(result.items).toHaveLength(2);
    
    // Sort items by product name for consistent testing
    const sortedItems = result.items.sort((a, b) => 
      a.product_variant.product.name.localeCompare(b.product_variant.product.name)
    );

    // Check first item (Sneaker A)
    expect(sortedItems[0].quantity).toBe(1);
    expect(sortedItems[0].product_variant.size).toBe('9');
    expect(sortedItems[0].product_variant.color).toBe('white');
    expect(sortedItems[0].product_variant.price_adjustment).toBe(0.00);
    expect(sortedItems[0].product_variant.product.name).toBe('Sneaker A');
    expect(sortedItems[0].product_variant.product.brand).toBe('Nike');

    // Check second item (Sneaker B)
    expect(sortedItems[1].quantity).toBe(3);
    expect(sortedItems[1].product_variant.size).toBe('11');
    expect(sortedItems[1].product_variant.color).toBe('blue');
    expect(sortedItems[1].product_variant.price_adjustment).toBe(-10.00);
    expect(sortedItems[1].product_variant.product.name).toBe('Sneaker B');
    expect(sortedItems[1].product_variant.product.brand).toBe('Adidas');
  });

  it('should throw error for non-existent customer', async () => {
    await expect(getCustomerCart(999)).rejects.toThrow(/Customer with id 999 not found/i);
  });
});