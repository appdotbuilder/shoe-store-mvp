import { db } from '../db';
import { cartItemsTable, productVariantsTable } from '../db/schema';
import { type UpdateCartItemInput, type CartItem } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateCartItemQuantity(input: UpdateCartItemInput): Promise<CartItem> {
  try {
    // First, get the current cart item to validate it exists
    const existingCartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.id, input.id))
      .execute();

    if (existingCartItems.length === 0) {
      throw new Error('Cart item not found');
    }

    const existingCartItem = existingCartItems[0];

    // Get the product variant to check stock availability
    const productVariants = await db.select()
      .from(productVariantsTable)
      .where(eq(productVariantsTable.id, existingCartItem.product_variant_id))
      .execute();

    if (productVariants.length === 0) {
      throw new Error('Product variant not found');
    }

    const productVariant = productVariants[0];

    // Validate that the new quantity doesn't exceed available stock
    if (input.quantity > productVariant.stock_quantity) {
      throw new Error(`Insufficient stock. Available: ${productVariant.stock_quantity}, Requested: ${input.quantity}`);
    }

    // Update the cart item quantity
    const updatedCartItems = await db.update(cartItemsTable)
      .set({
        quantity: input.quantity,
        updated_at: new Date()
      })
      .where(eq(cartItemsTable.id, input.id))
      .returning()
      .execute();

    return updatedCartItems[0];
  } catch (error) {
    console.error('Cart item quantity update failed:', error);
    throw error;
  }
}