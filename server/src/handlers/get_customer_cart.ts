import { db } from '../db';
import { cartsTable, cartItemsTable, productVariantsTable, productsTable, customersTable } from '../db/schema';
import { type CartWithItems } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function getCustomerCart(customerId: number): Promise<CartWithItems> {
  try {
    // First verify that the customer exists
    const customer = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, customerId))
      .execute();

    if (customer.length === 0) {
      throw new Error(`Customer with id ${customerId} not found`);
    }

    // Check if customer already has a cart
    let cart = await db.select()
      .from(cartsTable)
      .where(eq(cartsTable.customer_id, customerId))
      .execute();

    // If no cart exists, create one automatically
    if (cart.length === 0) {
      const newCartResult = await db.insert(cartsTable)
        .values({
          customer_id: customerId
        })
        .returning()
        .execute();
      
      cart = newCartResult;
    }

    const currentCart = cart[0];

    // Get cart items with product variant and product details using joins
    const cartItemsResult = await db.select({
      cartItem: cartItemsTable,
      productVariant: productVariantsTable,
      product: productsTable
    })
    .from(cartItemsTable)
    .innerJoin(productVariantsTable, eq(cartItemsTable.product_variant_id, productVariantsTable.id))
    .innerJoin(productsTable, eq(productVariantsTable.product_id, productsTable.id))
    .where(eq(cartItemsTable.cart_id, currentCart.id))
    .execute();

    // Transform the joined results into the required CartWithItems format
    const items = cartItemsResult.map(result => ({
      id: result.cartItem.id,
      quantity: result.cartItem.quantity,
      product_variant: {
        id: result.productVariant.id,
        size: result.productVariant.size,
        color: result.productVariant.color,
        price_adjustment: parseFloat(result.productVariant.price_adjustment),
        product: {
          name: result.product.name,
          brand: result.product.brand,
          base_price: parseFloat(result.product.base_price),
          image_url: result.product.image_url
        }
      }
    }));

    return {
      id: currentCart.id,
      customer_id: currentCart.customer_id,
      created_at: currentCart.created_at,
      updated_at: currentCart.updated_at,
      items
    };
  } catch (error) {
    console.error('Get customer cart failed:', error);
    throw error;
  }
}