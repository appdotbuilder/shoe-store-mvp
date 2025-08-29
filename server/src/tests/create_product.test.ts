import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type CreateProductInput } from '../schema';
import { createProduct } from '../handlers/create_product';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateProductInput = {
  name: 'Nike Air Max 90',
  description: 'Classic Nike sneaker with Air cushioning technology',
  brand: 'Nike',
  category: 'Running Shoes',
  base_price: 119.99,
  image_url: 'https://example.com/nike-air-max-90.jpg'
};

// Test input with minimal required fields (nullable fields as null)
const minimalInput: CreateProductInput = {
  name: 'Basic Sneaker',
  description: null,
  brand: 'Generic',
  category: 'Casual',
  base_price: 49.99,
  image_url: null
};

describe('createProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a product with all fields', async () => {
    const result = await createProduct(testInput);

    // Basic field validation
    expect(result.name).toEqual('Nike Air Max 90');
    expect(result.description).toEqual('Classic Nike sneaker with Air cushioning technology');
    expect(result.brand).toEqual('Nike');
    expect(result.category).toEqual('Running Shoes');
    expect(result.base_price).toEqual(119.99);
    expect(typeof result.base_price).toBe('number');
    expect(result.image_url).toEqual('https://example.com/nike-air-max-90.jpg');
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a product with minimal fields', async () => {
    const result = await createProduct(minimalInput);

    // Basic field validation
    expect(result.name).toEqual('Basic Sneaker');
    expect(result.description).toBeNull();
    expect(result.brand).toEqual('Generic');
    expect(result.category).toEqual('Casual');
    expect(result.base_price).toEqual(49.99);
    expect(typeof result.base_price).toBe('number');
    expect(result.image_url).toBeNull();
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save product to database correctly', async () => {
    const result = await createProduct(testInput);

    // Query using proper drizzle syntax
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(products).toHaveLength(1);
    expect(products[0].name).toEqual('Nike Air Max 90');
    expect(products[0].description).toEqual('Classic Nike sneaker with Air cushioning technology');
    expect(products[0].brand).toEqual('Nike');
    expect(products[0].category).toEqual('Running Shoes');
    expect(parseFloat(products[0].base_price)).toEqual(119.99);
    expect(products[0].image_url).toEqual('https://example.com/nike-air-max-90.jpg');
    expect(products[0].is_active).toBe(true);
    expect(products[0].created_at).toBeInstanceOf(Date);
    expect(products[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle decimal prices correctly', async () => {
    const decimalPriceInput: CreateProductInput = {
      name: 'Expensive Shoe',
      description: 'A very expensive shoe',
      brand: 'Luxury Brand',
      category: 'Designer',
      base_price: 1299.95,
      image_url: 'https://example.com/expensive.jpg'
    };

    const result = await createProduct(decimalPriceInput);

    // Verify decimal price is handled correctly
    expect(result.base_price).toEqual(1299.95);
    expect(typeof result.base_price).toBe('number');

    // Verify in database
    const dbProducts = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(parseFloat(dbProducts[0].base_price)).toEqual(1299.95);
  });

  it('should create multiple products independently', async () => {
    const product1Input: CreateProductInput = {
      name: 'Product 1',
      description: 'First product',
      brand: 'Brand A',
      category: 'Category 1',
      base_price: 100.00,
      image_url: 'https://example.com/1.jpg'
    };

    const product2Input: CreateProductInput = {
      name: 'Product 2',
      description: 'Second product',
      brand: 'Brand B',
      category: 'Category 2',
      base_price: 200.00,
      image_url: 'https://example.com/2.jpg'
    };

    const result1 = await createProduct(product1Input);
    const result2 = await createProduct(product2Input);

    // Verify both products were created with different IDs
    expect(result1.id).not.toEqual(result2.id);
    expect(result1.name).toEqual('Product 1');
    expect(result2.name).toEqual('Product 2');
    expect(result1.base_price).toEqual(100.00);
    expect(result2.base_price).toEqual(200.00);

    // Verify both exist in database
    const allProducts = await db.select()
      .from(productsTable)
      .execute();

    expect(allProducts).toHaveLength(2);
  });

  it('should set default values correctly', async () => {
    const result = await createProduct(testInput);

    // is_active should default to true
    expect(result.is_active).toBe(true);

    // Timestamps should be automatically set
    const now = new Date();
    const timeDiff = now.getTime() - result.created_at.getTime();
    
    // Should be created within the last few seconds
    expect(timeDiff).toBeLessThan(5000);
    expect(result.created_at).toEqual(result.updated_at);
  });
});