import { z } from 'zod';

// Enums for better type safety
export const shoeSizeSchema = z.enum([
  '5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', 
  '10', '10.5', '11', '11.5', '12', '12.5', '13', '13.5', '14'
]);
export type ShoeSize = z.infer<typeof shoeSizeSchema>;

export const shoeColorSchema = z.enum([
  'black', 'white', 'brown', 'navy', 'red', 'blue', 'gray', 
  'green', 'pink', 'purple', 'yellow', 'orange', 'beige'
]);
export type ShoeColor = z.infer<typeof shoeColorSchema>;

export const orderStatusSchema = z.enum([
  'pending', 'processing', 'shipped', 'delivered', 'cancelled'
]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

// Product (Shoe) schemas
export const productSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  brand: z.string(),
  category: z.string(),
  base_price: z.number(),
  image_url: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type Product = z.infer<typeof productSchema>;

export const createProductInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable(),
  brand: z.string().min(1),
  category: z.string().min(1),
  base_price: z.number().positive(),
  image_url: z.string().url().nullable()
});
export type CreateProductInput = z.infer<typeof createProductInputSchema>;

export const updateProductInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  brand: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  base_price: z.number().positive().optional(),
  image_url: z.string().url().nullable().optional(),
  is_active: z.boolean().optional()
});
export type UpdateProductInput = z.infer<typeof updateProductInputSchema>;

// Product Variant schemas (for size/color combinations)
export const productVariantSchema = z.object({
  id: z.number(),
  product_id: z.number(),
  size: shoeSizeSchema,
  color: shoeColorSchema,
  stock_quantity: z.number().int(),
  price_adjustment: z.number(), // Additional cost/discount for this variant
  sku: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type ProductVariant = z.infer<typeof productVariantSchema>;

export const createProductVariantInputSchema = z.object({
  product_id: z.number(),
  size: shoeSizeSchema,
  color: shoeColorSchema,
  stock_quantity: z.number().int().nonnegative(),
  price_adjustment: z.number(),
  sku: z.string().min(1)
});
export type CreateProductVariantInput = z.infer<typeof createProductVariantInputSchema>;

export const updateProductVariantInputSchema = z.object({
  id: z.number(),
  stock_quantity: z.number().int().nonnegative().optional(),
  price_adjustment: z.number().optional(),
  sku: z.string().min(1).optional()
});
export type UpdateProductVariantInput = z.infer<typeof updateProductVariantInputSchema>;

// Customer schemas
export const customerSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  first_name: z.string(),
  last_name: z.string(),
  phone: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type Customer = z.infer<typeof customerSchema>;

export const createCustomerInputSchema = z.object({
  email: z.string().email(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  phone: z.string().nullable()
});
export type CreateCustomerInput = z.infer<typeof createCustomerInputSchema>;

// Cart schemas
export const cartSchema = z.object({
  id: z.number(),
  customer_id: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type Cart = z.infer<typeof cartSchema>;

export const cartItemSchema = z.object({
  id: z.number(),
  cart_id: z.number(),
  product_variant_id: z.number(),
  quantity: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type CartItem = z.infer<typeof cartItemSchema>;

export const createCartItemInputSchema = z.object({
  cart_id: z.number(),
  product_variant_id: z.number(),
  quantity: z.number().int().positive()
});
export type CreateCartItemInput = z.infer<typeof createCartItemInputSchema>;

export const updateCartItemInputSchema = z.object({
  id: z.number(),
  quantity: z.number().int().positive()
});
export type UpdateCartItemInput = z.infer<typeof updateCartItemInputSchema>;

// Address schemas
export const addressSchema = z.object({
  id: z.number(),
  customer_id: z.number(),
  type: z.enum(['billing', 'shipping']),
  street_address: z.string(),
  apartment: z.string().nullable(),
  city: z.string(),
  state: z.string(),
  postal_code: z.string(),
  country: z.string(),
  is_default: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type Address = z.infer<typeof addressSchema>;

export const createAddressInputSchema = z.object({
  customer_id: z.number(),
  type: z.enum(['billing', 'shipping']),
  street_address: z.string().min(1),
  apartment: z.string().nullable(),
  city: z.string().min(1),
  state: z.string().min(1),
  postal_code: z.string().min(1),
  country: z.string().min(1),
  is_default: z.boolean().optional()
});
export type CreateAddressInput = z.infer<typeof createAddressInputSchema>;

// Order schemas
export const orderSchema = z.object({
  id: z.number(),
  customer_id: z.number(),
  status: orderStatusSchema,
  total_amount: z.number(),
  tax_amount: z.number(),
  shipping_amount: z.number(),
  billing_address_id: z.number(),
  shipping_address_id: z.number(),
  order_date: z.coerce.date(),
  shipped_date: z.coerce.date().nullable(),
  delivered_date: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type Order = z.infer<typeof orderSchema>;

export const orderItemSchema = z.object({
  id: z.number(),
  order_id: z.number(),
  product_variant_id: z.number(),
  quantity: z.number().int(),
  unit_price: z.number(),
  total_price: z.number(),
  created_at: z.coerce.date()
});
export type OrderItem = z.infer<typeof orderItemSchema>;

export const createOrderInputSchema = z.object({
  customer_id: z.number(),
  billing_address_id: z.number(),
  shipping_address_id: z.number(),
  items: z.array(z.object({
    product_variant_id: z.number(),
    quantity: z.number().int().positive()
  })).min(1)
});
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;

export const updateOrderStatusInputSchema = z.object({
  id: z.number(),
  status: orderStatusSchema
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusInputSchema>;

// Product with variants (for catalog display)
export const productWithVariantsSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  brand: z.string(),
  category: z.string(),
  base_price: z.number(),
  image_url: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  variants: z.array(productVariantSchema)
});
export type ProductWithVariants = z.infer<typeof productWithVariantsSchema>;

// Cart with items (for cart display)
export const cartWithItemsSchema = z.object({
  id: z.number(),
  customer_id: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  items: z.array(z.object({
    id: z.number(),
    quantity: z.number(),
    product_variant: z.object({
      id: z.number(),
      size: shoeSizeSchema,
      color: shoeColorSchema,
      price_adjustment: z.number(),
      product: z.object({
        name: z.string(),
        brand: z.string(),
        base_price: z.number(),
        image_url: z.string().nullable()
      })
    })
  }))
});
export type CartWithItems = z.infer<typeof cartWithItemsSchema>;

// Order with items (for order display)
export const orderWithItemsSchema = z.object({
  id: z.number(),
  customer_id: z.number(),
  status: orderStatusSchema,
  total_amount: z.number(),
  tax_amount: z.number(),
  shipping_amount: z.number(),
  order_date: z.coerce.date(),
  shipped_date: z.coerce.date().nullable(),
  delivered_date: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  items: z.array(z.object({
    id: z.number(),
    quantity: z.number(),
    unit_price: z.number(),
    total_price: z.number(),
    product_variant: z.object({
      size: shoeSizeSchema,
      color: shoeColorSchema,
      product: z.object({
        name: z.string(),
        brand: z.string(),
        image_url: z.string().nullable()
      })
    })
  })),
  billing_address: addressSchema,
  shipping_address: addressSchema
});
export type OrderWithItems = z.infer<typeof orderWithItemsSchema>;