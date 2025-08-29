import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createProductInputSchema,
  updateProductInputSchema,
  createProductVariantInputSchema,
  updateProductVariantInputSchema,
  createCustomerInputSchema,
  createCartItemInputSchema,
  updateCartItemInputSchema,
  createAddressInputSchema,
  createOrderInputSchema,
  updateOrderStatusInputSchema
} from './schema';

// Import handlers
import { createProduct } from './handlers/create_product';
import { getProducts, getProductById } from './handlers/get_products';
import { createProductVariant } from './handlers/create_product_variant';
import { createCustomer } from './handlers/create_customer';
import { getCustomerCart } from './handlers/get_customer_cart';
import { addToCart, removeFromCart } from './handlers/add_to_cart';
import { updateCartItemQuantity } from './handlers/update_cart_item';
import { createAddress, getCustomerAddresses } from './handlers/create_address';
import { createOrder } from './handlers/create_order';
import { getCustomerOrders, getOrderById, getAllOrders } from './handlers/get_orders';
import { updateOrderStatus } from './handlers/update_order_status';
import { 
  updateProductVariantStock, 
  getProductVariantsByProduct, 
  checkVariantStock 
} from './handlers/update_product_variant_stock';
import { 
  searchProducts, 
  getProductsByCategory, 
  getProductsByBrand, 
  getFeaturedProducts 
} from './handlers/search_products';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Product management
  createProduct: publicProcedure
    .input(createProductInputSchema)
    .mutation(({ input }) => createProduct(input)),

  updateProduct: publicProcedure
    .input(updateProductInputSchema)
    .mutation(({ input }) => {
      // Placeholder - would call updateProduct handler
      return Promise.resolve(null);
    }),

  getProducts: publicProcedure
    .query(() => getProducts()),

  getProductById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getProductById(input.id)),

  searchProducts: publicProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(({ input }) => searchProducts(input.query)),

  getProductsByCategory: publicProcedure
    .input(z.object({ category: z.string().min(1) }))
    .query(({ input }) => getProductsByCategory(input.category)),

  getProductsByBrand: publicProcedure
    .input(z.object({ brand: z.string().min(1) }))
    .query(({ input }) => getProductsByBrand(input.brand)),

  getFeaturedProducts: publicProcedure
    .query(() => getFeaturedProducts()),

  // Product variant management
  createProductVariant: publicProcedure
    .input(createProductVariantInputSchema)
    .mutation(({ input }) => createProductVariant(input)),

  updateProductVariantStock: publicProcedure
    .input(updateProductVariantInputSchema)
    .mutation(({ input }) => updateProductVariantStock(input)),

  getProductVariantsByProduct: publicProcedure
    .input(z.object({ productId: z.number() }))
    .query(({ input }) => getProductVariantsByProduct(input.productId)),

  checkVariantStock: publicProcedure
    .input(z.object({ variantId: z.number(), quantity: z.number().int().positive() }))
    .query(({ input }) => checkVariantStock(input.variantId, input.quantity)),

  // Customer management
  createCustomer: publicProcedure
    .input(createCustomerInputSchema)
    .mutation(({ input }) => createCustomer(input)),

  // Address management
  createAddress: publicProcedure
    .input(createAddressInputSchema)
    .mutation(({ input }) => createAddress(input)),

  getCustomerAddresses: publicProcedure
    .input(z.object({ customerId: z.number() }))
    .query(({ input }) => getCustomerAddresses(input.customerId)),

  // Cart management
  getCustomerCart: publicProcedure
    .input(z.object({ customerId: z.number() }))
    .query(({ input }) => getCustomerCart(input.customerId)),

  addToCart: publicProcedure
    .input(createCartItemInputSchema)
    .mutation(({ input }) => addToCart(input)),

  updateCartItemQuantity: publicProcedure
    .input(updateCartItemInputSchema)
    .mutation(({ input }) => updateCartItemQuantity(input)),

  removeFromCart: publicProcedure
    .input(z.object({ cartItemId: z.number() }))
    .mutation(({ input }) => removeFromCart(input.cartItemId)),

  // Order management
  createOrder: publicProcedure
    .input(createOrderInputSchema)
    .mutation(({ input }) => createOrder(input)),

  getCustomerOrders: publicProcedure
    .input(z.object({ customerId: z.number() }))
    .query(({ input }) => getCustomerOrders(input.customerId)),

  getOrderById: publicProcedure
    .input(z.object({ orderId: z.number() }))
    .query(({ input }) => getOrderById(input.orderId)),

  getAllOrders: publicProcedure
    .query(() => getAllOrders()),

  updateOrderStatus: publicProcedure
    .input(updateOrderStatusInputSchema)
    .mutation(({ input }) => updateOrderStatus(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC e-commerce server listening at port: ${port}`);
}

start();