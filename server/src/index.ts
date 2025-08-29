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
  addToCartInputSchema,
  updateCartItemInputSchema,
  createOrderInputSchema,
  updateOrderStatusInputSchema,
  productFilterSchema
} from './schema';

// Import handlers
import { createProduct } from './handlers/create_product';
import { getProducts, getProductById } from './handlers/get_products';
import { updateProduct } from './handlers/update_product';
import { 
  addToCart, 
  getCart, 
  updateCartItem, 
  removeFromCart, 
  clearCart 
} from './handlers/cart_handlers';
import { 
  createOrder, 
  getOrder, 
  getOrdersBySession, 
  updateOrderStatus, 
  getAllOrders 
} from './handlers/order_handlers';

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

  // Product routes
  createProduct: publicProcedure
    .input(createProductInputSchema)
    .mutation(({ input }) => createProduct(input)),

  getProducts: publicProcedure
    .input(productFilterSchema.optional())
    .query(({ input }) => getProducts(input)),

  getProductById: publicProcedure
    .input(z.number())
    .query(({ input }) => getProductById(input)),

  updateProduct: publicProcedure
    .input(updateProductInputSchema)
    .mutation(({ input }) => updateProduct(input)),

  // Cart routes
  addToCart: publicProcedure
    .input(addToCartInputSchema)
    .mutation(({ input }) => addToCart(input)),

  getCart: publicProcedure
    .input(z.string())
    .query(({ input }) => getCart(input)),

  updateCartItem: publicProcedure
    .input(updateCartItemInputSchema)
    .mutation(({ input }) => updateCartItem(input)),

  removeFromCart: publicProcedure
    .input(z.number())
    .mutation(({ input }) => removeFromCart(input)),

  clearCart: publicProcedure
    .input(z.string())
    .mutation(({ input }) => clearCart(input)),

  // Order routes
  createOrder: publicProcedure
    .input(createOrderInputSchema)
    .mutation(({ input }) => createOrder(input)),

  getOrder: publicProcedure
    .input(z.number())
    .query(({ input }) => getOrder(input)),

  getOrdersBySession: publicProcedure
    .input(z.string())
    .query(({ input }) => getOrdersBySession(input)),

  updateOrderStatus: publicProcedure
    .input(updateOrderStatusInputSchema)
    .mutation(({ input }) => updateOrderStatus(input)),

  getAllOrders: publicProcedure
    .query(() => getAllOrders()),
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
  console.log(`TRPC server listening at port: ${port}`);
}

start();