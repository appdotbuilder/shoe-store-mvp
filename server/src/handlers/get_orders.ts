import { db } from '../db';
import { 
  ordersTable, 
  orderItemsTable, 
  productVariantsTable, 
  productsTable, 
  addressesTable 
} from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { type OrderWithItems } from '../schema';

export async function getCustomerOrders(customerId: number): Promise<OrderWithItems[]> {
  try {
    // Get orders for the customer with related item data
    const results = await db.select()
      .from(ordersTable)
      .leftJoin(orderItemsTable, eq(ordersTable.id, orderItemsTable.order_id))
      .leftJoin(productVariantsTable, eq(orderItemsTable.product_variant_id, productVariantsTable.id))
      .leftJoin(productsTable, eq(productVariantsTable.product_id, productsTable.id))
      .where(eq(ordersTable.customer_id, customerId))
      .orderBy(desc(ordersTable.order_date))
      .execute();

    // Group results by order ID and transform to OrderWithItems
    const orderMap = new Map<number, any>();

    for (const result of results) {
      const orderId = result.orders.id;
      
      if (!orderMap.has(orderId)) {
        orderMap.set(orderId, {
          id: result.orders.id,
          customer_id: result.orders.customer_id,
          status: result.orders.status,
          total_amount: parseFloat(result.orders.total_amount),
          tax_amount: parseFloat(result.orders.tax_amount),
          shipping_amount: parseFloat(result.orders.shipping_amount),
          order_date: result.orders.order_date,
          shipped_date: result.orders.shipped_date,
          delivered_date: result.orders.delivered_date,
          created_at: result.orders.created_at,
          updated_at: result.orders.updated_at,
          items: [],
          billing_address: null,
          shipping_address: null
        });
      }

      const order = orderMap.get(orderId);

      // Get addresses separately to avoid join conflicts
      if (!order.billing_address) {
        const billingAddress = await db.select()
          .from(addressesTable)
          .where(eq(addressesTable.id, result.orders.billing_address_id))
          .execute();
        
        if (billingAddress.length > 0) {
          order.billing_address = billingAddress[0];
        }

        const shippingAddress = await db.select()
          .from(addressesTable)
          .where(eq(addressesTable.id, result.orders.shipping_address_id))
          .execute();
        
        if (shippingAddress.length > 0) {
          order.shipping_address = shippingAddress[0];
        }
      }

      // Add order item if it exists
      if (result.order_items && result.product_variants && result.products) {
        order.items.push({
          id: result.order_items.id,
          quantity: result.order_items.quantity,
          unit_price: parseFloat(result.order_items.unit_price),
          total_price: parseFloat(result.order_items.total_price),
          product_variant: {
            size: result.product_variants.size,
            color: result.product_variants.color,
            product: {
              name: result.products.name,
              brand: result.products.brand,
              image_url: result.products.image_url
            }
          }
        });
      }
    }

    return Array.from(orderMap.values());
  } catch (error) {
    console.error('Failed to get customer orders:', error);
    throw error;
  }
}

export async function getOrderById(orderId: number): Promise<OrderWithItems | null> {
  try {
    // Get the order with all related data
    const results = await db.select()
      .from(ordersTable)
      .leftJoin(orderItemsTable, eq(ordersTable.id, orderItemsTable.order_id))
      .leftJoin(productVariantsTable, eq(orderItemsTable.product_variant_id, productVariantsTable.id))
      .leftJoin(productsTable, eq(productVariantsTable.product_id, productsTable.id))
      .where(eq(ordersTable.id, orderId))
      .execute();

    if (results.length === 0) {
      return null;
    }

    // Get addresses separately
    const billingAddress = await db.select()
      .from(addressesTable)
      .where(eq(addressesTable.id, results[0].orders.billing_address_id))
      .execute();

    const shippingAddress = await db.select()
      .from(addressesTable)
      .where(eq(addressesTable.id, results[0].orders.shipping_address_id))
      .execute();

    // Build the order object
    const orderData = results[0].orders;
    const order: OrderWithItems = {
      id: orderData.id,
      customer_id: orderData.customer_id,
      status: orderData.status,
      total_amount: parseFloat(orderData.total_amount),
      tax_amount: parseFloat(orderData.tax_amount),
      shipping_amount: parseFloat(orderData.shipping_amount),
      order_date: orderData.order_date,
      shipped_date: orderData.shipped_date,
      delivered_date: orderData.delivered_date,
      created_at: orderData.created_at,
      updated_at: orderData.updated_at,
      items: [],
      billing_address: billingAddress[0],
      shipping_address: shippingAddress[0]
    };

    // Add order items
    for (const result of results) {
      if (result.order_items && result.product_variants && result.products) {
        order.items.push({
          id: result.order_items.id,
          quantity: result.order_items.quantity,
          unit_price: parseFloat(result.order_items.unit_price),
          total_price: parseFloat(result.order_items.total_price),
          product_variant: {
            size: result.product_variants.size,
            color: result.product_variants.color,
            product: {
              name: result.products.name,
              brand: result.products.brand,
              image_url: result.products.image_url
            }
          }
        });
      }
    }

    return order;
  } catch (error) {
    console.error('Failed to get order by ID:', error);
    throw error;
  }
}

export async function getAllOrders(): Promise<OrderWithItems[]> {
  try {
    // Get all orders with related item data
    const results = await db.select()
      .from(ordersTable)
      .leftJoin(orderItemsTable, eq(ordersTable.id, orderItemsTable.order_id))
      .leftJoin(productVariantsTable, eq(orderItemsTable.product_variant_id, productVariantsTable.id))
      .leftJoin(productsTable, eq(productVariantsTable.product_id, productsTable.id))
      .orderBy(desc(ordersTable.order_date))
      .execute();

    // Group results by order ID
    const orderMap = new Map<number, any>();

    for (const result of results) {
      const orderId = result.orders.id;
      
      if (!orderMap.has(orderId)) {
        orderMap.set(orderId, {
          id: result.orders.id,
          customer_id: result.orders.customer_id,
          status: result.orders.status,
          total_amount: parseFloat(result.orders.total_amount),
          tax_amount: parseFloat(result.orders.tax_amount),
          shipping_amount: parseFloat(result.orders.shipping_amount),
          order_date: result.orders.order_date,
          shipped_date: result.orders.shipped_date,
          delivered_date: result.orders.delivered_date,
          created_at: result.orders.created_at,
          updated_at: result.orders.updated_at,
          items: [],
          billing_address: null,
          shipping_address: null
        });
      }

      const order = orderMap.get(orderId);

      // Get addresses for this order if not already loaded
      if (!order.billing_address) {
        const billingAddress = await db.select()
          .from(addressesTable)
          .where(eq(addressesTable.id, result.orders.billing_address_id))
          .execute();
        
        if (billingAddress.length > 0) {
          order.billing_address = billingAddress[0];
        }

        const shippingAddress = await db.select()
          .from(addressesTable)
          .where(eq(addressesTable.id, result.orders.shipping_address_id))
          .execute();
        
        if (shippingAddress.length > 0) {
          order.shipping_address = shippingAddress[0];
        }
      }

      // Add order item if it exists
      if (result.order_items && result.product_variants && result.products) {
        order.items.push({
          id: result.order_items.id,
          quantity: result.order_items.quantity,
          unit_price: parseFloat(result.order_items.unit_price),
          total_price: parseFloat(result.order_items.total_price),
          product_variant: {
            size: result.product_variants.size,
            color: result.product_variants.color,
            product: {
              name: result.products.name,
              brand: result.products.brand,
              image_url: result.products.image_url
            }
          }
        });
      }
    }

    return Array.from(orderMap.values());
  } catch (error) {
    console.error('Failed to get all orders:', error);
    throw error;
  }
}