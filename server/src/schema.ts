import { z } from 'zod';

// Shoe-specific enums
export const shoeSizeSchema = z.enum([
  '5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', 
  '10', '10.5', '11', '11.5', '12', '12.5', '13', '14', '15'
]);

export const shoeColorSchema = z.enum([
  'black', 'white', 'brown', 'tan', 'red', 'blue', 'navy', 'gray', 'green', 
  'pink', 'purple', 'yellow', 'orange', 'beige', 'silver', 'gold', 'multicolor'
]);

export const shoeCategorySchema = z.enum([
  'sneakers', 'dress_shoes', 'boots', 'sandals', 'loafers', 'athletic', 
  'casual', 'formal', 'high_heels', 'flats', 'oxfords', 'running'
]);

export const orderStatusSchema = z.enum([
  'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'
]);

// Product schema for shoes
export const productSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  brand: z.string(),
  category: shoeCategorySchema,
  price: z.number(),
  image_url: z.string().nullable(),
  color: shoeColorSchema,
  size: shoeSizeSchema,
  stock_quantity: z.number().int(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Product = z.infer<typeof productSchema>;

// Input schema for creating products
export const createProductInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable(),
  brand: z.string().min(1),
  category: shoeCategorySchema,
  price: z.number().positive(),
  image_url: z.string().url().nullable(),
  color: shoeColorSchema,
  size: shoeSizeSchema,
  stock_quantity: z.number().int().nonnegative()
});

export type CreateProductInput = z.infer<typeof createProductInputSchema>;

// Input schema for updating products
export const updateProductInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  brand: z.string().min(1).optional(),
  category: shoeCategorySchema.optional(),
  price: z.number().positive().optional(),
  image_url: z.string().url().nullable().optional(),
  color: shoeColorSchema.optional(),
  size: shoeSizeSchema.optional(),
  stock_quantity: z.number().int().nonnegative().optional(),
  is_active: z.boolean().optional()
});

export type UpdateProductInput = z.infer<typeof updateProductInputSchema>;

// Cart item schema
export const cartItemSchema = z.object({
  id: z.number(),
  cart_id: z.number(),
  product_id: z.number(),
  quantity: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type CartItem = z.infer<typeof cartItemSchema>;

// Cart schema
export const cartSchema = z.object({
  id: z.number(),
  user_id: z.string().nullable(), // For guest users, this can be null
  session_id: z.string(), // To track guest carts
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Cart = z.infer<typeof cartSchema>;

// Input schema for adding items to cart
export const addToCartInputSchema = z.object({
  product_id: z.number(),
  quantity: z.number().int().positive(),
  session_id: z.string() // For guest cart tracking
});

export type AddToCartInput = z.infer<typeof addToCartInputSchema>;

// Input schema for updating cart items
export const updateCartItemInputSchema = z.object({
  cart_item_id: z.number(),
  quantity: z.number().int().nonnegative() // 0 quantity means remove
});

export type UpdateCartItemInput = z.infer<typeof updateCartItemInputSchema>;

// Order schema
export const orderSchema = z.object({
  id: z.number(),
  user_id: z.string().nullable(),
  session_id: z.string(),
  total_amount: z.number(),
  status: orderStatusSchema,
  shipping_address: z.string(),
  billing_address: z.string(),
  customer_email: z.string().email(),
  customer_phone: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Order = z.infer<typeof orderSchema>;

// Order item schema
export const orderItemSchema = z.object({
  id: z.number(),
  order_id: z.number(),
  product_id: z.number(),
  quantity: z.number().int(),
  price_at_time: z.number(), // Price when the order was placed
  created_at: z.coerce.date()
});

export type OrderItem = z.infer<typeof orderItemSchema>;

// Input schema for creating orders
export const createOrderInputSchema = z.object({
  session_id: z.string(),
  shipping_address: z.string().min(1),
  billing_address: z.string().min(1),
  customer_email: z.string().email(),
  customer_phone: z.string().nullable()
});

export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;

// Input schema for updating order status
export const updateOrderStatusInputSchema = z.object({
  order_id: z.number(),
  status: orderStatusSchema
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusInputSchema>;

// Cart with items response schema
export const cartWithItemsSchema = z.object({
  cart: cartSchema,
  items: z.array(z.object({
    cart_item: cartItemSchema,
    product: productSchema
  })),
  total_amount: z.number()
});

export type CartWithItems = z.infer<typeof cartWithItemsSchema>;

// Order with items response schema
export const orderWithItemsSchema = z.object({
  order: orderSchema,
  items: z.array(z.object({
    order_item: orderItemSchema,
    product: productSchema
  }))
});

export type OrderWithItems = z.infer<typeof orderWithItemsSchema>;

// Product filter schema
export const productFilterSchema = z.object({
  category: shoeCategorySchema.optional(),
  color: shoeColorSchema.optional(),
  size: shoeSizeSchema.optional(),
  min_price: z.number().optional(),
  max_price: z.number().optional(),
  brand: z.string().optional(),
  search: z.string().optional()
});

export type ProductFilter = z.infer<typeof productFilterSchema>;