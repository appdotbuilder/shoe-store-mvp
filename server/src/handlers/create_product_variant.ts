import { db } from '../db';
import { productsTable, productVariantsTable } from '../db/schema';
import { type CreateProductVariantInput, type ProductVariant } from '../schema';
import { eq } from 'drizzle-orm';

export const createProductVariant = async (input: CreateProductVariantInput): Promise<ProductVariant> => {
  try {
    // First, validate that the product exists
    const existingProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, input.product_id))
      .execute();

    if (existingProduct.length === 0) {
      throw new Error(`Product with ID ${input.product_id} does not exist`);
    }

    // Insert the product variant record
    const result = await db.insert(productVariantsTable)
      .values({
        product_id: input.product_id,
        size: input.size,
        color: input.color,
        stock_quantity: input.stock_quantity,
        price_adjustment: input.price_adjustment.toString(), // Convert number to string for numeric column
        sku: input.sku
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const variant = result[0];
    return {
      ...variant,
      price_adjustment: parseFloat(variant.price_adjustment) // Convert string back to number
    };
  } catch (error) {
    console.error('Product variant creation failed:', error);
    throw error;
  }
};