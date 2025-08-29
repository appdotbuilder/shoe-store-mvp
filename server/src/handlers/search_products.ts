import { db } from '../db';
import { productsTable, productVariantsTable } from '../db/schema';
import { type ProductWithVariants } from '../schema';
import { eq, ilike, or, and, desc } from 'drizzle-orm';

export async function searchProducts(query: string): Promise<ProductWithVariants[]> {
  try {
    if (!query.trim()) {
      return [];
    }

    const searchTerm = `%${query.toLowerCase()}%`;

    // Search products by name, brand, or description with case-insensitive matching
    const results = await db.select()
      .from(productsTable)
      .leftJoin(productVariantsTable, eq(productsTable.id, productVariantsTable.product_id))
      .where(
        and(
          eq(productsTable.is_active, true),
          or(
            ilike(productsTable.name, searchTerm),
            ilike(productsTable.brand, searchTerm),
            ilike(productsTable.description, searchTerm)
          )
        )
      )
      .orderBy(productsTable.name)
      .execute();

    // Group results by product and collect variants
    const productMap = new Map<number, ProductWithVariants>();

    for (const result of results) {
      const product = result.products;
      const variant = result.product_variants;

      if (!productMap.has(product.id)) {
        productMap.set(product.id, {
          ...product,
          base_price: parseFloat(product.base_price),
          variants: []
        });
      }

      if (variant) {
        const existingProduct = productMap.get(product.id)!;
        existingProduct.variants.push({
          ...variant,
          price_adjustment: parseFloat(variant.price_adjustment)
        });
      }
    }

    return Array.from(productMap.values());
  } catch (error) {
    console.error('Product search failed:', error);
    throw error;
  }
}

export async function getProductsByCategory(category: string): Promise<ProductWithVariants[]> {
  try {
    if (!category.trim()) {
      return [];
    }

    // Get products filtered by category
    const results = await db.select()
      .from(productsTable)
      .leftJoin(productVariantsTable, eq(productsTable.id, productVariantsTable.product_id))
      .where(
        and(
          eq(productsTable.is_active, true),
          eq(productsTable.category, category)
        )
      )
      .orderBy(productsTable.name)
      .execute();

    // Group results by product and collect variants
    const productMap = new Map<number, ProductWithVariants>();

    for (const result of results) {
      const product = result.products;
      const variant = result.product_variants;

      if (!productMap.has(product.id)) {
        productMap.set(product.id, {
          ...product,
          base_price: parseFloat(product.base_price),
          variants: []
        });
      }

      if (variant) {
        const existingProduct = productMap.get(product.id)!;
        existingProduct.variants.push({
          ...variant,
          price_adjustment: parseFloat(variant.price_adjustment)
        });
      }
    }

    return Array.from(productMap.values());
  } catch (error) {
    console.error('Category product search failed:', error);
    throw error;
  }
}

export async function getProductsByBrand(brand: string): Promise<ProductWithVariants[]> {
  try {
    if (!brand.trim()) {
      return [];
    }

    // Get products filtered by brand
    const results = await db.select()
      .from(productsTable)
      .leftJoin(productVariantsTable, eq(productsTable.id, productVariantsTable.product_id))
      .where(
        and(
          eq(productsTable.is_active, true),
          eq(productsTable.brand, brand)
        )
      )
      .orderBy(productsTable.name)
      .execute();

    // Group results by product and collect variants
    const productMap = new Map<number, ProductWithVariants>();

    for (const result of results) {
      const product = result.products;
      const variant = result.product_variants;

      if (!productMap.has(product.id)) {
        productMap.set(product.id, {
          ...product,
          base_price: parseFloat(product.base_price),
          variants: []
        });
      }

      if (variant) {
        const existingProduct = productMap.get(product.id)!;
        existingProduct.variants.push({
          ...variant,
          price_adjustment: parseFloat(variant.price_adjustment)
        });
      }
    }

    return Array.from(productMap.values());
  } catch (error) {
    console.error('Brand product search failed:', error);
    throw error;
  }
}

export async function getFeaturedProducts(): Promise<ProductWithVariants[]> {
  try {
    // Get featured products - using most recently created products as "featured"
    const results = await db.select()
      .from(productsTable)
      .leftJoin(productVariantsTable, eq(productsTable.id, productVariantsTable.product_id))
      .where(eq(productsTable.is_active, true))
      .orderBy(desc(productsTable.created_at))
      .limit(10) // Limit to 10 featured products
      .execute();

    // Group results by product and collect variants
    const productMap = new Map<number, ProductWithVariants>();

    for (const result of results) {
      const product = result.products;
      const variant = result.product_variants;

      if (!productMap.has(product.id)) {
        productMap.set(product.id, {
          ...product,
          base_price: parseFloat(product.base_price),
          variants: []
        });
      }

      if (variant) {
        const existingProduct = productMap.get(product.id)!;
        existingProduct.variants.push({
          ...variant,
          price_adjustment: parseFloat(variant.price_adjustment)
        });
      }
    }

    return Array.from(productMap.values());
  } catch (error) {
    console.error('Featured products fetch failed:', error);
    throw error;
  }
}