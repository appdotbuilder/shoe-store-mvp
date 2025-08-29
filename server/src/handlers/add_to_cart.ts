import { db } from '../db';
import { cartItemsTable, productVariantsTable } from '../db/schema';
import { type CreateCartItemInput, type CartItem } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function addToCart(input: CreateCartItemInput): Promise<CartItem> {
  try {
    // First, verify that the product variant exists and has sufficient stock
    const variant = await db.select()
      .from(productVariantsTable)
      .where(eq(productVariantsTable.id, input.product_variant_id))
      .execute();

    if (variant.length === 0) {
      throw new Error('Product variant not found');
    }

    if (variant[0].stock_quantity < input.quantity) {
      throw new Error('Insufficient stock available');
    }

    // Check if item already exists in cart
    const existingItem = await db.select()
      .from(cartItemsTable)
      .where(
        and(
          eq(cartItemsTable.cart_id, input.cart_id),
          eq(cartItemsTable.product_variant_id, input.product_variant_id)
        )
      )
      .execute();

    if (existingItem.length > 0) {
      // Update existing item quantity
      const newQuantity = existingItem[0].quantity + input.quantity;

      // Check if total quantity would exceed stock
      if (variant[0].stock_quantity < newQuantity) {
        throw new Error('Total quantity would exceed available stock');
      }

      const result = await db.update(cartItemsTable)
        .set({
          quantity: newQuantity,
          updated_at: new Date()
        })
        .where(eq(cartItemsTable.id, existingItem[0].id))
        .returning()
        .execute();

      return result[0];
    } else {
      // Create new cart item
      const result = await db.insert(cartItemsTable)
        .values({
          cart_id: input.cart_id,
          product_variant_id: input.product_variant_id,
          quantity: input.quantity
        })
        .returning()
        .execute();

      return result[0];
    }
  } catch (error) {
    console.error('Add to cart failed:', error);
    throw error;
  }
}

export async function removeFromCart(cartItemId: number): Promise<void> {
  try {
    const result = await db.delete(cartItemsTable)
      .where(eq(cartItemsTable.id, cartItemId))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Cart item not found');
    }
  } catch (error) {
    console.error('Remove from cart failed:', error);
    throw error;
  }
}