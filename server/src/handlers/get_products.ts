import { db } from '../db';
import { productsTable, productVariantsTable } from '../db/schema';
import { type ProductWithVariants } from '../schema';
import { eq } from 'drizzle-orm';

export async function getProducts(): Promise<ProductWithVariants[]> {
  try {
    // Query active products with their variants
    const results = await db.select()
      .from(productsTable)
      .leftJoin(productVariantsTable, eq(productsTable.id, productVariantsTable.product_id))
      .where(eq(productsTable.is_active, true))
      .execute();

    // Group results by product and convert numeric fields
    const productMap = new Map<number, ProductWithVariants>();

    for (const result of results) {
      const product = result.products;
      const variant = result.product_variants;

      if (!productMap.has(product.id)) {
        productMap.set(product.id, {
          ...product,
          base_price: parseFloat(product.base_price), // Convert numeric to number
          variants: []
        });
      }

      const productWithVariants = productMap.get(product.id)!;
      
      // Add variant if it exists (leftJoin can result in null variants)
      if (variant) {
        productWithVariants.variants.push({
          ...variant,
          price_adjustment: parseFloat(variant.price_adjustment) // Convert numeric to number
        });
      }
    }

    return Array.from(productMap.values());
  } catch (error) {
    console.error('Failed to fetch products:', error);
    throw error;
  }
}

export async function getProductById(id: number): Promise<ProductWithVariants | null> {
  try {
    // Query specific product with its variants
    const results = await db.select()
      .from(productsTable)
      .leftJoin(productVariantsTable, eq(productsTable.id, productVariantsTable.product_id))
      .where(eq(productsTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const product = results[0].products;
    const variants = results
      .map(result => result.product_variants)
      .filter(variant => variant !== null)
      .map(variant => ({
        ...variant!,
        price_adjustment: parseFloat(variant!.price_adjustment) // Convert numeric to number
      }));

    return {
      ...product,
      base_price: parseFloat(product.base_price), // Convert numeric to number
      variants
    };
  } catch (error) {
    console.error('Failed to fetch product by ID:', error);
    throw error;
  }
}