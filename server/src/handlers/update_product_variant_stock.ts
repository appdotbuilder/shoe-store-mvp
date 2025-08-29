import { db } from '../db';
import { productVariantsTable } from '../db/schema';
import { type UpdateProductVariantInput, type ProductVariant } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateProductVariantStock(input: UpdateProductVariantInput): Promise<ProductVariant> {
  try {
    // Build update values, only including provided fields
    const updateValues: any = {};
    
    if (input.stock_quantity !== undefined) {
      updateValues.stock_quantity = input.stock_quantity;
    }
    
    if (input.price_adjustment !== undefined) {
      updateValues.price_adjustment = input.price_adjustment.toString(); // Convert to string for numeric column
    }
    
    if (input.sku !== undefined) {
      updateValues.sku = input.sku;
    }
    
    // Always update the updated_at timestamp
    updateValues.updated_at = new Date();

    // Update the product variant
    const result = await db.update(productVariantsTable)
      .set(updateValues)
      .where(eq(productVariantsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Product variant with id ${input.id} not found`);
    }

    // Convert numeric fields back to numbers before returning
    const variant = result[0];
    return {
      ...variant,
      price_adjustment: parseFloat(variant.price_adjustment) // Convert string back to number
    };
  } catch (error) {
    console.error('Product variant stock update failed:', error);
    throw error;
  }
}

export async function getProductVariantsByProduct(productId: number): Promise<ProductVariant[]> {
  try {
    const results = await db.select()
      .from(productVariantsTable)
      .where(eq(productVariantsTable.product_id, productId))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(variant => ({
      ...variant,
      price_adjustment: parseFloat(variant.price_adjustment) // Convert string back to number
    }));
  } catch (error) {
    console.error('Failed to fetch product variants:', error);
    throw error;
  }
}

export async function checkVariantStock(variantId: number, requestedQuantity: number): Promise<boolean> {
  try {
    const results = await db.select({
      stock_quantity: productVariantsTable.stock_quantity
    })
      .from(productVariantsTable)
      .where(eq(productVariantsTable.id, variantId))
      .execute();

    if (results.length === 0) {
      throw new Error(`Product variant with id ${variantId} not found`);
    }

    const availableStock = results[0].stock_quantity;
    return availableStock >= requestedQuantity;
  } catch (error) {
    console.error('Failed to check variant stock:', error);
    throw error;
  }
}