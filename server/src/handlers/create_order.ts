import { db } from '../db';
import { 
  ordersTable, 
  orderItemsTable, 
  cartItemsTable, 
  cartsTable, 
  productVariantsTable, 
  addressesTable,
  productsTable 
} from '../db/schema';
import { type CreateOrderInput, type OrderWithItems } from '../schema';
import { eq, and } from 'drizzle-orm';

export const createOrder = async (input: CreateOrderInput): Promise<OrderWithItems> => {
  try {
    // Start transaction to ensure data consistency
    const result = await db.transaction(async (tx) => {
      // 1. Validate that addresses exist and belong to the customer
      const [billingAddress, shippingAddress] = await Promise.all([
        tx.select()
          .from(addressesTable)
          .where(
            and(
              eq(addressesTable.id, input.billing_address_id),
              eq(addressesTable.customer_id, input.customer_id)
            )
          )
          .execute(),
        tx.select()
          .from(addressesTable)
          .where(
            and(
              eq(addressesTable.id, input.shipping_address_id),
              eq(addressesTable.customer_id, input.customer_id)
            )
          )
          .execute()
      ]);

      if (billingAddress.length === 0) {
        throw new Error('Billing address not found or does not belong to customer');
      }
      if (shippingAddress.length === 0) {
        throw new Error('Shipping address not found or does not belong to customer');
      }

      // 2. Get customer's cart and validate items
      const cart = await tx.select()
        .from(cartsTable)
        .where(eq(cartsTable.customer_id, input.customer_id))
        .execute();

      if (cart.length === 0) {
        throw new Error('Customer cart not found');
      }

      // 3. Get all cart items with product variant details
      const cartItems = await tx.select({
        cart_item_id: cartItemsTable.id,
        cart_id: cartItemsTable.cart_id,
        product_variant_id: cartItemsTable.product_variant_id,
        quantity: cartItemsTable.quantity,
        variant_stock: productVariantsTable.stock_quantity,
        variant_price_adjustment: productVariantsTable.price_adjustment,
        base_price: productsTable.base_price
      })
        .from(cartItemsTable)
        .innerJoin(productVariantsTable, eq(cartItemsTable.product_variant_id, productVariantsTable.id))
        .innerJoin(productsTable, eq(productVariantsTable.product_id, productsTable.id))
        .where(eq(cartItemsTable.cart_id, cart[0].id))
        .execute();

      if (cartItems.length === 0) {
        throw new Error('Cart is empty');
      }

      // 4. Validate all items from input exist in cart and check stock
      const orderItems = [];
      let subtotal = 0;

      for (const inputItem of input.items) {
        const cartItem = cartItems.find(ci => 
          ci.product_variant_id === inputItem.product_variant_id
        );

        if (!cartItem) {
          throw new Error(`Product variant ${inputItem.product_variant_id} not found in cart`);
        }

        if (inputItem.quantity > cartItem.variant_stock) {
          throw new Error(`Insufficient stock for variant ${inputItem.product_variant_id}`);
        }

        if (inputItem.quantity > cartItem.quantity) {
          throw new Error(`Requested quantity ${inputItem.quantity} exceeds cart quantity ${cartItem.quantity}`);
        }

        const basePrice = parseFloat(cartItem.base_price);
        const priceAdjustment = parseFloat(cartItem.variant_price_adjustment);
        const unitPrice = basePrice + priceAdjustment;
        const totalPrice = unitPrice * inputItem.quantity;

        orderItems.push({
          product_variant_id: inputItem.product_variant_id,
          quantity: inputItem.quantity,
          unit_price: unitPrice,
          total_price: totalPrice
        });

        subtotal += totalPrice;
      }

      // 5. Calculate tax and shipping (simplified calculation)
      const taxRate = 0.08; // 8% tax
      const shippingCost = subtotal >= 100 ? 0 : 15; // Free shipping at $100 or over
      const taxAmount = Math.round(subtotal * taxRate * 100) / 100; // Round to 2 decimal places
      const totalAmount = Math.round((subtotal + taxAmount + shippingCost) * 100) / 100;

      // 6. Create the order
      const newOrder = await tx.insert(ordersTable)
        .values({
          customer_id: input.customer_id,
          status: 'pending',
          total_amount: totalAmount.toString(),
          tax_amount: taxAmount.toString(),
          shipping_amount: shippingCost.toString(),
          billing_address_id: input.billing_address_id,
          shipping_address_id: input.shipping_address_id
        })
        .returning()
        .execute();

      const createdOrder = newOrder[0];

      // 7. Create order items and update stock
      const createdOrderItems = [];
      for (const item of orderItems) {
        // Insert order item
        const orderItem = await tx.insert(orderItemsTable)
          .values({
            order_id: createdOrder.id,
            product_variant_id: item.product_variant_id,
            quantity: item.quantity,
            unit_price: item.unit_price.toString(),
            total_price: item.total_price.toString()
          })
          .returning()
          .execute();

        // Update stock quantity
        const currentVariant = cartItems.find(ci => ci.product_variant_id === item.product_variant_id);
        const newStockQuantity = currentVariant!.variant_stock - item.quantity;
        
        await tx.update(productVariantsTable)
          .set({
            stock_quantity: newStockQuantity,
            updated_at: new Date()
          })
          .where(eq(productVariantsTable.id, item.product_variant_id))
          .execute();

        createdOrderItems.push(orderItem[0]);
      }

      // 8. Clear the customer's cart (remove items used in order)
      for (const inputItem of input.items) {
        const cartItem = cartItems.find(ci => 
          ci.product_variant_id === inputItem.product_variant_id
        );

        if (cartItem && inputItem.quantity === cartItem.quantity) {
          // Remove item completely if all quantity used
          await tx.delete(cartItemsTable)
            .where(eq(cartItemsTable.id, cartItem.cart_item_id))
            .execute();
        } else if (cartItem) {
          // Reduce quantity if partial
          const newQuantity = cartItem.quantity - inputItem.quantity;
          await tx.update(cartItemsTable)
            .set({
              quantity: newQuantity,
              updated_at: new Date()
            })
            .where(eq(cartItemsTable.id, cartItem.cart_item_id))
            .execute();
        }
      }

      return {
        order: createdOrder,
        orderItems: createdOrderItems,
        billingAddress: billingAddress[0],
        shippingAddress: shippingAddress[0]
      };
    });

    // 9. Fetch complete order with all details for return
    const orderWithItems = await db.select({
      id: ordersTable.id,
      customer_id: ordersTable.customer_id,
      status: ordersTable.status,
      total_amount: ordersTable.total_amount,
      tax_amount: ordersTable.tax_amount,
      shipping_amount: ordersTable.shipping_amount,
      order_date: ordersTable.order_date,
      shipped_date: ordersTable.shipped_date,
      delivered_date: ordersTable.delivered_date,
      created_at: ordersTable.created_at,
      updated_at: ordersTable.updated_at,
      // Order items
      order_item_id: orderItemsTable.id,
      order_item_quantity: orderItemsTable.quantity,
      order_item_unit_price: orderItemsTable.unit_price,
      order_item_total_price: orderItemsTable.total_price,
      // Product variant info
      variant_size: productVariantsTable.size,
      variant_color: productVariantsTable.color,
      // Product info
      product_name: productsTable.name,
      product_brand: productsTable.brand,
      product_image_url: productsTable.image_url
    })
      .from(ordersTable)
      .innerJoin(orderItemsTable, eq(ordersTable.id, orderItemsTable.order_id))
      .innerJoin(productVariantsTable, eq(orderItemsTable.product_variant_id, productVariantsTable.id))
      .innerJoin(productsTable, eq(productVariantsTable.product_id, productsTable.id))
      .where(eq(ordersTable.id, result.order.id))
      .execute();

    // Transform the flat result into the expected nested structure
    const order = orderWithItems[0];
    const orderData: OrderWithItems = {
      id: order.id,
      customer_id: order.customer_id,
      status: order.status,
      total_amount: parseFloat(order.total_amount),
      tax_amount: parseFloat(order.tax_amount),
      shipping_amount: parseFloat(order.shipping_amount),
      order_date: order.order_date,
      shipped_date: order.shipped_date,
      delivered_date: order.delivered_date,
      created_at: order.created_at,
      updated_at: order.updated_at,
      items: orderWithItems.map(item => ({
        id: item.order_item_id,
        quantity: item.order_item_quantity,
        unit_price: parseFloat(item.order_item_unit_price),
        total_price: parseFloat(item.order_item_total_price),
        product_variant: {
          size: item.variant_size,
          color: item.variant_color,
          product: {
            name: item.product_name,
            brand: item.product_brand,
            image_url: item.product_image_url
          }
        }
      })),
      billing_address: result.billingAddress,
      shipping_address: result.shippingAddress
    };

    return orderData;

  } catch (error) {
    console.error('Order creation failed:', error);
    throw error;
  }
};