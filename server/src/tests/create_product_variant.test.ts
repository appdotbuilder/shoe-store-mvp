import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, productVariantsTable } from '../db/schema';
import { type CreateProductVariantInput } from '../schema';
import { createProductVariant } from '../handlers/create_product_variant';
import { eq, and } from 'drizzle-orm';

// Test product for variant creation
const testProduct = {
  name: 'Test Running Shoe',
  description: 'A great running shoe for testing',
  brand: 'TestBrand',
  category: 'running',
  base_price: '99.99',
  image_url: 'https://example.com/shoe.jpg'
};

// Test variant input
const testVariantInput: CreateProductVariantInput = {
  product_id: 1, // Will be set after product creation
  size: '9',
  color: 'black',
  stock_quantity: 50,
  price_adjustment: 0,
  sku: 'TEST-RUN-9-BLK'
};

describe('createProductVariant', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a product variant', async () => {
    // Create a product first
    const productResult = await db.insert(productsTable)
      .values(testProduct)
      .returning()
      .execute();
    
    const product = productResult[0];
    const variantInput = {
      ...testVariantInput,
      product_id: product.id
    };

    const result = await createProductVariant(variantInput);

    // Basic field validation
    expect(result.product_id).toEqual(product.id);
    expect(result.size).toEqual('9');
    expect(result.color).toEqual('black');
    expect(result.stock_quantity).toEqual(50);
    expect(result.price_adjustment).toEqual(0);
    expect(typeof result.price_adjustment).toBe('number');
    expect(result.sku).toEqual('TEST-RUN-9-BLK');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save product variant to database', async () => {
    // Create a product first
    const productResult = await db.insert(productsTable)
      .values(testProduct)
      .returning()
      .execute();
    
    const product = productResult[0];
    const variantInput = {
      ...testVariantInput,
      product_id: product.id
    };

    const result = await createProductVariant(variantInput);

    // Query the database to verify the variant was saved
    const variants = await db.select()
      .from(productVariantsTable)
      .where(eq(productVariantsTable.id, result.id))
      .execute();

    expect(variants).toHaveLength(1);
    const savedVariant = variants[0];
    expect(savedVariant.product_id).toEqual(product.id);
    expect(savedVariant.size).toEqual('9');
    expect(savedVariant.color).toEqual('black');
    expect(savedVariant.stock_quantity).toEqual(50);
    expect(parseFloat(savedVariant.price_adjustment)).toEqual(0);
    expect(savedVariant.sku).toEqual('TEST-RUN-9-BLK');
    expect(savedVariant.created_at).toBeInstanceOf(Date);
    expect(savedVariant.updated_at).toBeInstanceOf(Date);
  });

  it('should handle positive price adjustment', async () => {
    // Create a product first
    const productResult = await db.insert(productsTable)
      .values(testProduct)
      .returning()
      .execute();
    
    const product = productResult[0];
    const variantInput = {
      ...testVariantInput,
      product_id: product.id,
      price_adjustment: 15.50,
      sku: 'TEST-RUN-9-BLK-PREM'
    };

    const result = await createProductVariant(variantInput);

    expect(result.price_adjustment).toEqual(15.50);
    expect(typeof result.price_adjustment).toBe('number');

    // Verify in database
    const variants = await db.select()
      .from(productVariantsTable)
      .where(eq(productVariantsTable.id, result.id))
      .execute();

    expect(parseFloat(variants[0].price_adjustment)).toEqual(15.50);
  });

  it('should handle negative price adjustment (discount)', async () => {
    // Create a product first
    const productResult = await db.insert(productsTable)
      .values(testProduct)
      .returning()
      .execute();
    
    const product = productResult[0];
    const variantInput = {
      ...testVariantInput,
      product_id: product.id,
      price_adjustment: -10.25,
      sku: 'TEST-RUN-9-BLK-DISC'
    };

    const result = await createProductVariant(variantInput);

    expect(result.price_adjustment).toEqual(-10.25);
    expect(typeof result.price_adjustment).toBe('number');

    // Verify in database
    const variants = await db.select()
      .from(productVariantsTable)
      .where(eq(productVariantsTable.id, result.id))
      .execute();

    expect(parseFloat(variants[0].price_adjustment)).toEqual(-10.25);
  });

  it('should throw error when product does not exist', async () => {
    const variantInput = {
      ...testVariantInput,
      product_id: 999 // Non-existent product ID
    };

    await expect(createProductVariant(variantInput)).rejects.toThrow(/Product with ID 999 does not exist/i);
  });

  it('should enforce unique constraint on product_id, size, color combination', async () => {
    // Create a product first
    const productResult = await db.insert(productsTable)
      .values(testProduct)
      .returning()
      .execute();
    
    const product = productResult[0];
    const variantInput = {
      ...testVariantInput,
      product_id: product.id
    };

    // Create first variant
    await createProductVariant(variantInput);

    // Try to create another variant with same product_id, size, color
    const duplicateVariantInput = {
      ...variantInput,
      sku: 'TEST-RUN-9-BLK-DUP' // Different SKU but same product/size/color
    };

    await expect(createProductVariant(duplicateVariantInput)).rejects.toThrow();
  });

  it('should allow same size/color for different products', async () => {
    // Create two products
    const product1Result = await db.insert(productsTable)
      .values(testProduct)
      .returning()
      .execute();
    
    const product2Result = await db.insert(productsTable)
      .values({
        ...testProduct,
        name: 'Another Test Shoe'
      })
      .returning()
      .execute();
    
    const product1 = product1Result[0];
    const product2 = product2Result[0];

    // Create variants with same size/color for different products
    const variant1Input = {
      ...testVariantInput,
      product_id: product1.id,
      sku: 'PROD1-9-BLK'
    };

    const variant2Input = {
      ...testVariantInput,
      product_id: product2.id,
      sku: 'PROD2-9-BLK'
    };

    const variant1 = await createProductVariant(variant1Input);
    const variant2 = await createProductVariant(variant2Input);

    expect(variant1.product_id).toEqual(product1.id);
    expect(variant2.product_id).toEqual(product2.id);
    expect(variant1.size).toEqual(variant2.size);
    expect(variant1.color).toEqual(variant2.color);
  });

  it('should enforce unique SKU constraint', async () => {
    // Create two products
    const product1Result = await db.insert(productsTable)
      .values(testProduct)
      .returning()
      .execute();
    
    const product2Result = await db.insert(productsTable)
      .values({
        ...testProduct,
        name: 'Another Test Shoe'
      })
      .returning()
      .execute();
    
    const product1 = product1Result[0];
    const product2 = product2Result[0];

    // Create first variant
    const variant1Input = {
      ...testVariantInput,
      product_id: product1.id
    };
    await createProductVariant(variant1Input);

    // Try to create another variant with same SKU but different product/size/color
    const duplicateSKUInput = {
      product_id: product2.id,
      size: '10' as const,
      color: 'white' as const,
      stock_quantity: 25,
      price_adjustment: 5.00,
      sku: testVariantInput.sku // Same SKU as first variant
    };

    await expect(createProductVariant(duplicateSKUInput)).rejects.toThrow();
  });
});