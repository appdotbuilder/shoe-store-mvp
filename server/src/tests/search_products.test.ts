import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, productVariantsTable } from '../db/schema';
import { searchProducts, getProductsByCategory, getProductsByBrand, getFeaturedProducts } from '../handlers/search_products';

// Test data setup
const createTestProduct = async (productData: any) => {
  const result = await db.insert(productsTable)
    .values({
      ...productData,
      base_price: productData.base_price.toString()
    })
    .returning()
    .execute();
  return result[0];
};

const createTestVariant = async (variantData: any) => {
  const result = await db.insert(productVariantsTable)
    .values({
      ...variantData,
      price_adjustment: variantData.price_adjustment.toString()
    })
    .returning()
    .execute();
  return result[0];
};

describe('searchProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should find products by name', async () => {
    // Create test product
    const product = await createTestProduct({
      name: 'Nike Air Max 90',
      brand: 'Nike',
      category: 'Running',
      base_price: 120.00,
      description: 'Classic running shoe'
    });

    // Create variant
    await createTestVariant({
      product_id: product.id,
      size: '9',
      color: 'black',
      stock_quantity: 10,
      price_adjustment: 0,
      sku: 'NIKE-AM90-9-BLK'
    });

    const results = await searchProducts('Air Max');

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Nike Air Max 90');
    expect(results[0].brand).toBe('Nike');
    expect(results[0].base_price).toBe(120.00);
    expect(typeof results[0].base_price).toBe('number');
    expect(results[0].variants).toHaveLength(1);
    expect(results[0].variants[0].size).toBe('9');
    expect(results[0].variants[0].color).toBe('black');
    expect(typeof results[0].variants[0].price_adjustment).toBe('number');
  });

  it('should find products by brand', async () => {
    const product = await createTestProduct({
      name: 'Running Shoe Pro',
      brand: 'Adidas',
      category: 'Running',
      base_price: 100.00,
      description: 'Professional running shoe'
    });

    await createTestVariant({
      product_id: product.id,
      size: '10',
      color: 'white',
      stock_quantity: 5,
      price_adjustment: 10,
      sku: 'ADIDAS-RSP-10-WHT'
    });

    const results = await searchProducts('adidas');

    expect(results).toHaveLength(1);
    expect(results[0].brand).toBe('Adidas');
    expect(results[0].variants[0].price_adjustment).toBe(10);
  });

  it('should find products by description', async () => {
    const product = await createTestProduct({
      name: 'Sport Shoe',
      brand: 'Puma',
      category: 'Casual',
      base_price: 80.00,
      description: 'Comfortable basketball shoes for daily wear'
    });

    await createTestVariant({
      product_id: product.id,
      size: '8.5',
      color: 'red',
      stock_quantity: 15,
      price_adjustment: -5,
      sku: 'PUMA-SS-85-RED'
    });

    const results = await searchProducts('basketball');

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Sport Shoe');
    expect(results[0].variants[0].price_adjustment).toBe(-5);
  });

  it('should handle case insensitive search', async () => {
    await createTestProduct({
      name: 'UPPER CASE SHOE',
      brand: 'TestBrand',
      category: 'Test',
      base_price: 50.00,
      description: 'Test description'
    });

    const results = await searchProducts('upper case');

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('UPPER CASE SHOE');
  });

  it('should return empty array for empty query', async () => {
    const results = await searchProducts('');
    expect(results).toHaveLength(0);

    const resultsSpaces = await searchProducts('   ');
    expect(resultsSpaces).toHaveLength(0);
  });

  it('should only return active products', async () => {
    // Create active product
    const activeProduct = await createTestProduct({
      name: 'Active Product',
      brand: 'TestBrand',
      category: 'Test',
      base_price: 60.00,
      is_active: true
    });

    // Create inactive product
    await createTestProduct({
      name: 'Inactive Product',
      brand: 'TestBrand',
      category: 'Test',
      base_price: 70.00,
      is_active: false
    });

    await createTestVariant({
      product_id: activeProduct.id,
      size: '9',
      color: 'blue',
      stock_quantity: 3,
      price_adjustment: 0,
      sku: 'TEST-AP-9-BLU'
    });

    const results = await searchProducts('TestBrand');

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Active Product');
  });

  it('should handle products with no variants', async () => {
    await createTestProduct({
      name: 'No Variant Product',
      brand: 'TestBrand',
      category: 'Test',
      base_price: 40.00
    });

    const results = await searchProducts('No Variant');

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('No Variant Product');
    expect(results[0].variants).toHaveLength(0);
  });

  it('should handle products with multiple variants', async () => {
    const product = await createTestProduct({
      name: 'Multi Variant Shoe',
      brand: 'TestBrand',
      category: 'Test',
      base_price: 90.00
    });

    // Create multiple variants
    await createTestVariant({
      product_id: product.id,
      size: '8',
      color: 'black',
      stock_quantity: 5,
      price_adjustment: 0,
      sku: 'TEST-MVS-8-BLK'
    });

    await createTestVariant({
      product_id: product.id,
      size: '9',
      color: 'white',
      stock_quantity: 3,
      price_adjustment: 5,
      sku: 'TEST-MVS-9-WHT'
    });

    const results = await searchProducts('Multi Variant');

    expect(results).toHaveLength(1);
    expect(results[0].variants).toHaveLength(2);
    expect(results[0].variants.map(v => v.size)).toContain('8');
    expect(results[0].variants.map(v => v.size)).toContain('9');
  });
});

describe('getProductsByCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return products by category', async () => {
    // Create products in different categories
    const runningProduct = await createTestProduct({
      name: 'Running Shoe',
      brand: 'Nike',
      category: 'Running',
      base_price: 100.00
    });

    const casualProduct = await createTestProduct({
      name: 'Casual Shoe',
      brand: 'Adidas',
      category: 'Casual',
      base_price: 80.00
    });

    await createTestVariant({
      product_id: runningProduct.id,
      size: '9',
      color: 'black',
      stock_quantity: 10,
      price_adjustment: 0,
      sku: 'NIKE-RS-9-BLK'
    });

    await createTestVariant({
      product_id: casualProduct.id,
      size: '10',
      color: 'white',
      stock_quantity: 5,
      price_adjustment: 0,
      sku: 'ADIDAS-CS-10-WHT'
    });

    const runningResults = await getProductsByCategory('Running');
    const casualResults = await getProductsByCategory('Casual');

    expect(runningResults).toHaveLength(1);
    expect(runningResults[0].name).toBe('Running Shoe');
    expect(runningResults[0].category).toBe('Running');

    expect(casualResults).toHaveLength(1);
    expect(casualResults[0].name).toBe('Casual Shoe');
    expect(casualResults[0].category).toBe('Casual');
  });

  it('should return empty array for non-existent category', async () => {
    const results = await getProductsByCategory('NonExistent');
    expect(results).toHaveLength(0);
  });

  it('should return empty array for empty category', async () => {
    const results = await getProductsByCategory('');
    expect(results).toHaveLength(0);
  });

  it('should only return active products', async () => {
    await createTestProduct({
      name: 'Active Running Shoe',
      brand: 'Nike',
      category: 'Running',
      base_price: 100.00,
      is_active: true
    });

    await createTestProduct({
      name: 'Inactive Running Shoe',
      brand: 'Adidas',
      category: 'Running',
      base_price: 120.00,
      is_active: false
    });

    const results = await getProductsByCategory('Running');

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Active Running Shoe');
  });
});

describe('getProductsByBrand', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return products by brand', async () => {
    // Create products from different brands
    const nikeProduct = await createTestProduct({
      name: 'Nike Shoe',
      brand: 'Nike',
      category: 'Running',
      base_price: 110.00
    });

    const adidasProduct = await createTestProduct({
      name: 'Adidas Shoe',
      brand: 'Adidas',
      category: 'Casual',
      base_price: 95.00
    });

    await createTestVariant({
      product_id: nikeProduct.id,
      size: '9',
      color: 'black',
      stock_quantity: 8,
      price_adjustment: 0,
      sku: 'NIKE-NS-9-BLK'
    });

    await createTestVariant({
      product_id: adidasProduct.id,
      size: '10',
      color: 'blue',
      stock_quantity: 6,
      price_adjustment: 0,
      sku: 'ADIDAS-AS-10-BLU'
    });

    const nikeResults = await getProductsByBrand('Nike');
    const adidasResults = await getProductsByBrand('Adidas');

    expect(nikeResults).toHaveLength(1);
    expect(nikeResults[0].name).toBe('Nike Shoe');
    expect(nikeResults[0].brand).toBe('Nike');

    expect(adidasResults).toHaveLength(1);
    expect(adidasResults[0].name).toBe('Adidas Shoe');
    expect(adidasResults[0].brand).toBe('Adidas');
  });

  it('should return empty array for non-existent brand', async () => {
    const results = await getProductsByBrand('NonExistentBrand');
    expect(results).toHaveLength(0);
  });

  it('should return empty array for empty brand', async () => {
    const results = await getProductsByBrand('');
    expect(results).toHaveLength(0);
  });

  it('should only return active products', async () => {
    await createTestProduct({
      name: 'Active Nike Shoe',
      brand: 'Nike',
      category: 'Running',
      base_price: 100.00,
      is_active: true
    });

    await createTestProduct({
      name: 'Inactive Nike Shoe',
      brand: 'Nike',
      category: 'Running',
      base_price: 120.00,
      is_active: false
    });

    const results = await getProductsByBrand('Nike');

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Active Nike Shoe');
  });
});

describe('getFeaturedProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return featured products ordered by creation date', async () => {
    // Create products with slight delay to ensure different timestamps
    const product1 = await createTestProduct({
      name: 'First Product',
      brand: 'Brand1',
      category: 'Category1',
      base_price: 100.00
    });

    // Small delay to ensure different created_at timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const product2 = await createTestProduct({
      name: 'Second Product',
      brand: 'Brand2',
      category: 'Category2',
      base_price: 110.00
    });

    await createTestVariant({
      product_id: product1.id,
      size: '9',
      color: 'black',
      stock_quantity: 10,
      price_adjustment: 0,
      sku: 'BRAND1-FP-9-BLK'
    });

    await createTestVariant({
      product_id: product2.id,
      size: '10',
      color: 'white',
      stock_quantity: 5,
      price_adjustment: 0,
      sku: 'BRAND2-SP-10-WHT'
    });

    const results = await getFeaturedProducts();

    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(10); // Should respect the limit

    // Should be ordered by most recent first
    if (results.length >= 2) {
      expect(results[0].created_at >= results[1].created_at).toBe(true);
    }
  });

  it('should limit results to 10 products', async () => {
    // Create 15 products to test the limit
    for (let i = 1; i <= 15; i++) {
      await createTestProduct({
        name: `Product ${i}`,
        brand: `Brand${i}`,
        category: `Category${i}`,
        base_price: 50 + i
      });
    }

    const results = await getFeaturedProducts();

    expect(results).toHaveLength(10);
  });

  it('should only return active products', async () => {
    await createTestProduct({
      name: 'Active Featured Product',
      brand: 'ActiveBrand',
      category: 'ActiveCategory',
      base_price: 100.00,
      is_active: true
    });

    await createTestProduct({
      name: 'Inactive Featured Product',
      brand: 'InactiveBrand',
      category: 'InactiveCategory',
      base_price: 120.00,
      is_active: false
    });

    const results = await getFeaturedProducts();

    expect(results.length).toBeGreaterThan(0);
    results.forEach(product => {
      expect(product.is_active).toBe(true);
    });
  });

  it('should return empty array when no products exist', async () => {
    const results = await getFeaturedProducts();
    expect(results).toHaveLength(0);
  });
});