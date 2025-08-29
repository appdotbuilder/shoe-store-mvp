import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, productVariantsTable } from '../db/schema';
import { getProducts, getProductById } from '../handlers/get_products';

// Test data
const testProduct1 = {
  name: 'Nike Air Max 90',
  description: 'Classic running shoe with Air Max technology',
  brand: 'Nike',
  category: 'Running',
  base_price: '129.99',
  image_url: 'https://example.com/nike-air-max-90.jpg',
  is_active: true
};

const testProduct2 = {
  name: 'Adidas Stan Smith',
  description: 'Iconic white leather tennis shoe',
  brand: 'Adidas',
  category: 'Tennis',
  base_price: '89.99',
  image_url: 'https://example.com/adidas-stan-smith.jpg',
  is_active: true
};

const testInactiveProduct = {
  name: 'Old Shoe',
  description: 'Discontinued model',
  brand: 'Generic',
  category: 'Casual',
  base_price: '49.99',
  image_url: null,
  is_active: false
};

describe('getProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no products exist', async () => {
    const result = await getProducts();
    expect(result).toEqual([]);
  });

  it('should return products with converted numeric fields', async () => {
    // Create a product
    const [product] = await db.insert(productsTable)
      .values(testProduct1)
      .returning()
      .execute();

    const result = await getProducts();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(product.id);
    expect(result[0].name).toBe('Nike Air Max 90');
    expect(result[0].brand).toBe('Nike');
    expect(result[0].category).toBe('Running');
    expect(result[0].base_price).toBe(129.99);
    expect(typeof result[0].base_price).toBe('number');
    expect(result[0].image_url).toBe('https://example.com/nike-air-max-90.jpg');
    expect(result[0].is_active).toBe(true);
    expect(result[0].variants).toEqual([]);
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should return only active products', async () => {
    // Create active and inactive products
    await db.insert(productsTable)
      .values([testProduct1, testInactiveProduct])
      .execute();

    const result = await getProducts();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Nike Air Max 90');
    expect(result[0].is_active).toBe(true);
  });

  it('should return products with their variants', async () => {
    // Create product
    const [product] = await db.insert(productsTable)
      .values(testProduct1)
      .returning()
      .execute();

    // Create variants
    const variants = await db.insert(productVariantsTable)
      .values([
        {
          product_id: product.id,
          size: '9',
          color: 'black',
          stock_quantity: 10,
          price_adjustment: '0.00',
          sku: 'NIKE-AM90-9-BLK'
        },
        {
          product_id: product.id,
          size: '10',
          color: 'white',
          stock_quantity: 5,
          price_adjustment: '10.00',
          sku: 'NIKE-AM90-10-WHT'
        }
      ])
      .returning()
      .execute();

    const result = await getProducts();

    expect(result).toHaveLength(1);
    expect(result[0].variants).toHaveLength(2);
    
    // Check first variant with numeric conversion
    const variant1 = result[0].variants.find(v => v.size === '9');
    expect(variant1).toBeDefined();
    expect(variant1!.color).toBe('black');
    expect(variant1!.stock_quantity).toBe(10);
    expect(variant1!.price_adjustment).toBe(0.00);
    expect(typeof variant1!.price_adjustment).toBe('number');
    expect(variant1!.sku).toBe('NIKE-AM90-9-BLK');

    // Check second variant with numeric conversion
    const variant2 = result[0].variants.find(v => v.size === '10');
    expect(variant2).toBeDefined();
    expect(variant2!.color).toBe('white');
    expect(variant2!.stock_quantity).toBe(5);
    expect(variant2!.price_adjustment).toBe(10.00);
    expect(typeof variant2!.price_adjustment).toBe('number');
    expect(variant2!.sku).toBe('NIKE-AM90-10-WHT');
  });

  it('should return multiple products correctly', async () => {
    // Create multiple products
    await db.insert(productsTable)
      .values([testProduct1, testProduct2])
      .execute();

    const result = await getProducts();

    expect(result).toHaveLength(2);
    
    const nikeProduct = result.find(p => p.brand === 'Nike');
    const adidasProduct = result.find(p => p.brand === 'Adidas');
    
    expect(nikeProduct).toBeDefined();
    expect(nikeProduct!.name).toBe('Nike Air Max 90');
    expect(nikeProduct!.base_price).toBe(129.99);
    
    expect(adidasProduct).toBeDefined();
    expect(adidasProduct!.name).toBe('Adidas Stan Smith');
    expect(adidasProduct!.base_price).toBe(89.99);
  });

  it('should handle products without variants', async () => {
    // Create product without variants
    await db.insert(productsTable)
      .values(testProduct1)
      .execute();

    const result = await getProducts();

    expect(result).toHaveLength(1);
    expect(result[0].variants).toEqual([]);
  });
});

describe('getProductById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null when product does not exist', async () => {
    const result = await getProductById(999);
    expect(result).toBeNull();
  });

  it('should return product by id with converted numeric fields', async () => {
    // Create product
    const [product] = await db.insert(productsTable)
      .values(testProduct1)
      .returning()
      .execute();

    const result = await getProductById(product.id);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(product.id);
    expect(result!.name).toBe('Nike Air Max 90');
    expect(result!.brand).toBe('Nike');
    expect(result!.base_price).toBe(129.99);
    expect(typeof result!.base_price).toBe('number');
    expect(result!.variants).toEqual([]);
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should return inactive product by id', async () => {
    // Create inactive product
    const [product] = await db.insert(productsTable)
      .values(testInactiveProduct)
      .returning()
      .execute();

    const result = await getProductById(product.id);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(product.id);
    expect(result!.name).toBe('Old Shoe');
    expect(result!.is_active).toBe(false);
    expect(result!.base_price).toBe(49.99);
  });

  it('should return product with variants', async () => {
    // Create product
    const [product] = await db.insert(productsTable)
      .values(testProduct2)
      .returning()
      .execute();

    // Create variants
    await db.insert(productVariantsTable)
      .values([
        {
          product_id: product.id,
          size: '8',
          color: 'white',
          stock_quantity: 15,
          price_adjustment: '0.00',
          sku: 'ADIDAS-SS-8-WHT'
        },
        {
          product_id: product.id,
          size: '9',
          color: 'green',
          stock_quantity: 8,
          price_adjustment: '5.00',
          sku: 'ADIDAS-SS-9-GRN'
        }
      ])
      .execute();

    const result = await getProductById(product.id);

    expect(result).not.toBeNull();
    expect(result!.name).toBe('Adidas Stan Smith');
    expect(result!.variants).toHaveLength(2);
    
    // Check variants with numeric conversion
    const whiteVariant = result!.variants.find(v => v.color === 'white');
    expect(whiteVariant).toBeDefined();
    expect(whiteVariant!.size).toBe('8');
    expect(whiteVariant!.stock_quantity).toBe(15);
    expect(whiteVariant!.price_adjustment).toBe(0.00);
    expect(typeof whiteVariant!.price_adjustment).toBe('number');
    
    const greenVariant = result!.variants.find(v => v.color === 'green');
    expect(greenVariant).toBeDefined();
    expect(greenVariant!.size).toBe('9');
    expect(greenVariant!.stock_quantity).toBe(8);
    expect(greenVariant!.price_adjustment).toBe(5.00);
    expect(typeof greenVariant!.price_adjustment).toBe('number');
  });

  it('should handle product with nullable fields', async () => {
    // Create product with null description and image_url
    const productWithNulls = {
      ...testProduct1,
      description: null,
      image_url: null
    };
    
    const [product] = await db.insert(productsTable)
      .values(productWithNulls)
      .returning()
      .execute();

    const result = await getProductById(product.id);

    expect(result).not.toBeNull();
    expect(result!.description).toBeNull();
    expect(result!.image_url).toBeNull();
    expect(result!.name).toBe('Nike Air Max 90');
  });

  it('should return correct product when multiple products exist', async () => {
    // Create multiple products
    const [product1, product2] = await db.insert(productsTable)
      .values([testProduct1, testProduct2])
      .returning()
      .execute();

    const result = await getProductById(product2.id);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(product2.id);
    expect(result!.name).toBe('Adidas Stan Smith');
    expect(result!.brand).toBe('Adidas');
    expect(result!.base_price).toBe(89.99);
  });
});