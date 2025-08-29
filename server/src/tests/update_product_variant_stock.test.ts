import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, productVariantsTable } from '../db/schema';
import { type UpdateProductVariantInput, type CreateProductInput, type CreateProductVariantInput } from '../schema';
import { updateProductVariantStock, getProductVariantsByProduct, checkVariantStock } from '../handlers/update_product_variant_stock';
import { eq } from 'drizzle-orm';

// Test data
const testProduct: CreateProductInput = {
  name: 'Test Running Shoes',
  description: 'Comfortable running shoes',
  brand: 'TestBrand',
  category: 'Running',
  base_price: 99.99,
  image_url: 'https://example.com/shoe.jpg'
};

const testVariant: CreateProductVariantInput = {
  product_id: 1, // Will be updated after product creation
  size: '9',
  color: 'black',
  stock_quantity: 50,
  price_adjustment: 5.00,
  sku: 'TEST-RUN-9-BLK'
};

describe('updateProductVariantStock', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let productId: number;
  let variantId: number;

  beforeEach(async () => {
    // Create test product
    const productResult = await db.insert(productsTable)
      .values({
        name: testProduct.name,
        description: testProduct.description,
        brand: testProduct.brand,
        category: testProduct.category,
        base_price: testProduct.base_price.toString(),
        image_url: testProduct.image_url
      })
      .returning()
      .execute();

    productId = productResult[0].id;

    // Create test variant
    const variantResult = await db.insert(productVariantsTable)
      .values({
        product_id: productId,
        size: testVariant.size,
        color: testVariant.color,
        stock_quantity: testVariant.stock_quantity,
        price_adjustment: testVariant.price_adjustment.toString(),
        sku: testVariant.sku
      })
      .returning()
      .execute();

    variantId = variantResult[0].id;
  });

  it('should update stock quantity only', async () => {
    const input: UpdateProductVariantInput = {
      id: variantId,
      stock_quantity: 75
    };

    const result = await updateProductVariantStock(input);

    expect(result.id).toEqual(variantId);
    expect(result.stock_quantity).toEqual(75);
    expect(result.price_adjustment).toEqual(5.00); // Should remain unchanged
    expect(result.sku).toEqual('TEST-RUN-9-BLK'); // Should remain unchanged
    expect(typeof result.price_adjustment).toBe('number');
  });

  it('should update price adjustment only', async () => {
    const input: UpdateProductVariantInput = {
      id: variantId,
      price_adjustment: 10.50
    };

    const result = await updateProductVariantStock(input);

    expect(result.id).toEqual(variantId);
    expect(result.price_adjustment).toEqual(10.50);
    expect(result.stock_quantity).toEqual(50); // Should remain unchanged
    expect(result.sku).toEqual('TEST-RUN-9-BLK'); // Should remain unchanged
    expect(typeof result.price_adjustment).toBe('number');
  });

  it('should update SKU only', async () => {
    const input: UpdateProductVariantInput = {
      id: variantId,
      sku: 'UPDATED-SKU-123'
    };

    const result = await updateProductVariantStock(input);

    expect(result.id).toEqual(variantId);
    expect(result.sku).toEqual('UPDATED-SKU-123');
    expect(result.stock_quantity).toEqual(50); // Should remain unchanged
    expect(result.price_adjustment).toEqual(5.00); // Should remain unchanged
  });

  it('should update all fields together', async () => {
    const input: UpdateProductVariantInput = {
      id: variantId,
      stock_quantity: 100,
      price_adjustment: -2.50,
      sku: 'BULK-UPDATE-SKU'
    };

    const result = await updateProductVariantStock(input);

    expect(result.id).toEqual(variantId);
    expect(result.stock_quantity).toEqual(100);
    expect(result.price_adjustment).toEqual(-2.50);
    expect(result.sku).toEqual('BULK-UPDATE-SKU');
    expect(typeof result.price_adjustment).toBe('number');
  });

  it('should update stock to zero', async () => {
    const input: UpdateProductVariantInput = {
      id: variantId,
      stock_quantity: 0
    };

    const result = await updateProductVariantStock(input);

    expect(result.stock_quantity).toEqual(0);
  });

  it('should persist changes in database', async () => {
    const input: UpdateProductVariantInput = {
      id: variantId,
      stock_quantity: 25,
      price_adjustment: 15.75
    };

    await updateProductVariantStock(input);

    // Verify changes were saved to database
    const variants = await db.select()
      .from(productVariantsTable)
      .where(eq(productVariantsTable.id, variantId))
      .execute();

    expect(variants).toHaveLength(1);
    expect(variants[0].stock_quantity).toEqual(25);
    expect(parseFloat(variants[0].price_adjustment)).toEqual(15.75);
  });

  it('should throw error for non-existent variant', async () => {
    const input: UpdateProductVariantInput = {
      id: 99999,
      stock_quantity: 10
    };

    await expect(updateProductVariantStock(input)).rejects.toThrow(/not found/i);
  });
});

describe('getProductVariantsByProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let productId: number;

  beforeEach(async () => {
    // Create test product
    const productResult = await db.insert(productsTable)
      .values({
        name: testProduct.name,
        description: testProduct.description,
        brand: testProduct.brand,
        category: testProduct.category,
        base_price: testProduct.base_price.toString(),
        image_url: testProduct.image_url
      })
      .returning()
      .execute();

    productId = productResult[0].id;
  });

  it('should return empty array for product with no variants', async () => {
    const result = await getProductVariantsByProduct(productId);

    expect(result).toEqual([]);
  });

  it('should return all variants for a product', async () => {
    // Create multiple variants
    const variants = [
      {
        product_id: productId,
        size: '8' as const,
        color: 'black' as const,
        stock_quantity: 10,
        price_adjustment: '0',
        sku: 'TEST-8-BLK'
      },
      {
        product_id: productId,
        size: '9' as const,
        color: 'white' as const,
        stock_quantity: 15,
        price_adjustment: '5.50',
        sku: 'TEST-9-WHT'
      },
      {
        product_id: productId,
        size: '10' as const,
        color: 'red' as const,
        stock_quantity: 20,
        price_adjustment: '-3.25',
        sku: 'TEST-10-RED'
      }
    ];

    await db.insert(productVariantsTable)
      .values(variants)
      .execute();

    const result = await getProductVariantsByProduct(productId);

    expect(result).toHaveLength(3);
    
    // Check that all variants are returned with correct data
    expect(result.map(v => v.size).sort()).toEqual(['10', '8', '9']);
    expect(result.map(v => v.color).sort()).toEqual(['black', 'red', 'white']);
    
    // Check numeric conversion
    result.forEach(variant => {
      expect(typeof variant.price_adjustment).toBe('number');
    });

    // Check specific values
    const blackVariant = result.find(v => v.color === 'black');
    expect(blackVariant?.stock_quantity).toEqual(10);
    expect(blackVariant?.price_adjustment).toEqual(0);

    const whiteVariant = result.find(v => v.color === 'white');
    expect(whiteVariant?.price_adjustment).toEqual(5.50);

    const redVariant = result.find(v => v.color === 'red');
    expect(redVariant?.price_adjustment).toEqual(-3.25);
  });

  it('should return variants only for specified product', async () => {
    // Create another product
    const otherProductResult = await db.insert(productsTable)
      .values({
        name: 'Other Product',
        description: 'Another product',
        brand: 'OtherBrand',
        category: 'Other',
        base_price: '50.00',
        image_url: null
      })
      .returning()
      .execute();

    const otherProductId = otherProductResult[0].id;

    // Create variants for both products
    await db.insert(productVariantsTable)
      .values([
        {
          product_id: productId,
          size: '8',
          color: 'black',
          stock_quantity: 10,
          price_adjustment: '0',
          sku: 'PROD1-8-BLK'
        },
        {
          product_id: otherProductId,
          size: '9',
          color: 'white',
          stock_quantity: 20,
          price_adjustment: '0',
          sku: 'PROD2-9-WHT'
        }
      ])
      .execute();

    const result = await getProductVariantsByProduct(productId);

    expect(result).toHaveLength(1);
    expect(result[0].product_id).toEqual(productId);
    expect(result[0].sku).toEqual('PROD1-8-BLK');
  });
});

describe('checkVariantStock', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let variantId: number;

  beforeEach(async () => {
    // Create test product
    const productResult = await db.insert(productsTable)
      .values({
        name: testProduct.name,
        description: testProduct.description,
        brand: testProduct.brand,
        category: testProduct.category,
        base_price: testProduct.base_price.toString(),
        image_url: testProduct.image_url
      })
      .returning()
      .execute();

    // Create test variant with 30 units in stock
    const variantResult = await db.insert(productVariantsTable)
      .values({
        product_id: productResult[0].id,
        size: testVariant.size,
        color: testVariant.color,
        stock_quantity: 30,
        price_adjustment: testVariant.price_adjustment.toString(),
        sku: testVariant.sku
      })
      .returning()
      .execute();

    variantId = variantResult[0].id;
  });

  it('should return true when sufficient stock is available', async () => {
    const result = await checkVariantStock(variantId, 10);
    expect(result).toBe(true);
  });

  it('should return true when requesting exact stock amount', async () => {
    const result = await checkVariantStock(variantId, 30);
    expect(result).toBe(true);
  });

  it('should return false when insufficient stock', async () => {
    const result = await checkVariantStock(variantId, 31);
    expect(result).toBe(false);
  });

  it('should return true when requesting zero quantity', async () => {
    const result = await checkVariantStock(variantId, 0);
    expect(result).toBe(true);
  });

  it('should handle variant with zero stock', async () => {
    // Update variant to have zero stock
    await db.update(productVariantsTable)
      .set({ stock_quantity: 0 })
      .where(eq(productVariantsTable.id, variantId))
      .execute();

    const result = await checkVariantStock(variantId, 1);
    expect(result).toBe(false);

    const zeroResult = await checkVariantStock(variantId, 0);
    expect(zeroResult).toBe(true);
  });

  it('should throw error for non-existent variant', async () => {
    await expect(checkVariantStock(99999, 1)).rejects.toThrow(/not found/i);
  });
});