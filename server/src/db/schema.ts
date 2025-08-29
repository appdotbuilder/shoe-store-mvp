import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  numeric, 
  integer, 
  boolean,
  pgEnum,
  unique
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define enums
export const shoeSizeEnum = pgEnum('shoe_size', [
  '5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', 
  '10', '10.5', '11', '11.5', '12', '12.5', '13', '13.5', '14'
]);

export const shoeColorEnum = pgEnum('shoe_color', [
  'black', 'white', 'brown', 'navy', 'red', 'blue', 'gray', 
  'green', 'pink', 'purple', 'yellow', 'orange', 'beige'
]);

export const orderStatusEnum = pgEnum('order_status', [
  'pending', 'processing', 'shipped', 'delivered', 'cancelled'
]);

export const addressTypeEnum = pgEnum('address_type', ['billing', 'shipping']);

// Products table - main product information
export const productsTable = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'), // Nullable
  brand: text('brand').notNull(),
  category: text('category').notNull(),
  base_price: numeric('base_price', { precision: 10, scale: 2 }).notNull(),
  image_url: text('image_url'), // Nullable
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Product variants table - specific size/color combinations with stock
export const productVariantsTable = pgTable('product_variants', {
  id: serial('id').primaryKey(),
  product_id: integer('product_id').notNull().references(() => productsTable.id, { onDelete: 'cascade' }),
  size: shoeSizeEnum('size').notNull(),
  color: shoeColorEnum('color').notNull(),
  stock_quantity: integer('stock_quantity').notNull().default(0),
  price_adjustment: numeric('price_adjustment', { precision: 10, scale: 2 }).notNull().default('0'),
  sku: text('sku').notNull().unique(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Unique constraint on product_id, size, color combination
  productSizeColorUnique: unique().on(table.product_id, table.size, table.color)
}));

// Customers table
export const customersTable = pgTable('customers', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  phone: text('phone'), // Nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Shopping carts table
export const cartsTable = pgTable('carts', {
  id: serial('id').primaryKey(),
  customer_id: integer('customer_id').notNull().references(() => customersTable.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Cart items table
export const cartItemsTable = pgTable('cart_items', {
  id: serial('id').primaryKey(),
  cart_id: integer('cart_id').notNull().references(() => cartsTable.id, { onDelete: 'cascade' }),
  product_variant_id: integer('product_variant_id').notNull().references(() => productVariantsTable.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').notNull().default(1),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Unique constraint to prevent duplicate items in same cart
  cartVariantUnique: unique().on(table.cart_id, table.product_variant_id)
}));

// Addresses table
export const addressesTable = pgTable('addresses', {
  id: serial('id').primaryKey(),
  customer_id: integer('customer_id').notNull().references(() => customersTable.id, { onDelete: 'cascade' }),
  type: addressTypeEnum('type').notNull(),
  street_address: text('street_address').notNull(),
  apartment: text('apartment'), // Nullable
  city: text('city').notNull(),
  state: text('state').notNull(),
  postal_code: text('postal_code').notNull(),
  country: text('country').notNull(),
  is_default: boolean('is_default').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Orders table
export const ordersTable = pgTable('orders', {
  id: serial('id').primaryKey(),
  customer_id: integer('customer_id').notNull().references(() => customersTable.id),
  status: orderStatusEnum('status').notNull().default('pending'),
  total_amount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  tax_amount: numeric('tax_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  shipping_amount: numeric('shipping_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  billing_address_id: integer('billing_address_id').notNull().references(() => addressesTable.id),
  shipping_address_id: integer('shipping_address_id').notNull().references(() => addressesTable.id),
  order_date: timestamp('order_date').defaultNow().notNull(),
  shipped_date: timestamp('shipped_date'), // Nullable
  delivered_date: timestamp('delivered_date'), // Nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Order items table
export const orderItemsTable = pgTable('order_items', {
  id: serial('id').primaryKey(),
  order_id: integer('order_id').notNull().references(() => ordersTable.id, { onDelete: 'cascade' }),
  product_variant_id: integer('product_variant_id').notNull().references(() => productVariantsTable.id),
  quantity: integer('quantity').notNull(),
  unit_price: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  total_price: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Define relations for better query building
export const productsRelations = relations(productsTable, ({ many }) => ({
  variants: many(productVariantsTable),
}));

export const productVariantsRelations = relations(productVariantsTable, ({ one, many }) => ({
  product: one(productsTable, {
    fields: [productVariantsTable.product_id],
    references: [productsTable.id],
  }),
  cartItems: many(cartItemsTable),
  orderItems: many(orderItemsTable),
}));

export const customersRelations = relations(customersTable, ({ many }) => ({
  carts: many(cartsTable),
  addresses: many(addressesTable),
  orders: many(ordersTable),
}));

export const cartsRelations = relations(cartsTable, ({ one, many }) => ({
  customer: one(customersTable, {
    fields: [cartsTable.customer_id],
    references: [customersTable.id],
  }),
  items: many(cartItemsTable),
}));

export const cartItemsRelations = relations(cartItemsTable, ({ one }) => ({
  cart: one(cartsTable, {
    fields: [cartItemsTable.cart_id],
    references: [cartsTable.id],
  }),
  productVariant: one(productVariantsTable, {
    fields: [cartItemsTable.product_variant_id],
    references: [productVariantsTable.id],
  }),
}));

export const addressesRelations = relations(addressesTable, ({ one, many }) => ({
  customer: one(customersTable, {
    fields: [addressesTable.customer_id],
    references: [customersTable.id],
  }),
  billingOrders: many(ordersTable, { relationName: 'billingAddress' }),
  shippingOrders: many(ordersTable, { relationName: 'shippingAddress' }),
}));

export const ordersRelations = relations(ordersTable, ({ one, many }) => ({
  customer: one(customersTable, {
    fields: [ordersTable.customer_id],
    references: [customersTable.id],
  }),
  billingAddress: one(addressesTable, {
    fields: [ordersTable.billing_address_id],
    references: [addressesTable.id],
    relationName: 'billingAddress',
  }),
  shippingAddress: one(addressesTable, {
    fields: [ordersTable.shipping_address_id],
    references: [addressesTable.id],
    relationName: 'shippingAddress',
  }),
  items: many(orderItemsTable),
}));

export const orderItemsRelations = relations(orderItemsTable, ({ one }) => ({
  order: one(ordersTable, {
    fields: [orderItemsTable.order_id],
    references: [ordersTable.id],
  }),
  productVariant: one(productVariantsTable, {
    fields: [orderItemsTable.product_variant_id],
    references: [productVariantsTable.id],
  }),
}));

// Export all tables for proper query building
export const tables = {
  products: productsTable,
  productVariants: productVariantsTable,
  customers: customersTable,
  carts: cartsTable,
  cartItems: cartItemsTable,
  addresses: addressesTable,
  orders: ordersTable,
  orderItems: orderItemsTable,
};

// TypeScript types for the table schemas
export type Product = typeof productsTable.$inferSelect;
export type NewProduct = typeof productsTable.$inferInsert;

export type ProductVariant = typeof productVariantsTable.$inferSelect;
export type NewProductVariant = typeof productVariantsTable.$inferInsert;

export type Customer = typeof customersTable.$inferSelect;
export type NewCustomer = typeof customersTable.$inferInsert;

export type Cart = typeof cartsTable.$inferSelect;
export type NewCart = typeof cartsTable.$inferInsert;

export type CartItem = typeof cartItemsTable.$inferSelect;
export type NewCartItem = typeof cartItemsTable.$inferInsert;

export type Address = typeof addressesTable.$inferSelect;
export type NewAddress = typeof addressesTable.$inferInsert;

export type Order = typeof ordersTable.$inferSelect;
export type NewOrder = typeof ordersTable.$inferInsert;

export type OrderItem = typeof orderItemsTable.$inferSelect;
export type NewOrderItem = typeof orderItemsTable.$inferInsert;