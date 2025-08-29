import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  customersTable, 
  productsTable, 
  productVariantsTable,
  addressesTable,
  ordersTable,
  orderItemsTable
} from '../db/schema';
import { getCustomerOrders, getOrderById, getAllOrders } from '../handlers/get_orders';

describe('getOrders', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get customer orders with complete details', async () => {
    // Create test customer
    const customer = await db.insert(customersTable)
      .values({
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        phone: '555-1234'
      })
      .returning()
      .execute();

    // Create test product and variant
    const product = await db.insert(productsTable)
      .values({
        name: 'Test Sneaker',
        brand: 'TestBrand',
        category: 'Running',
        base_price: '99.99',
        description: 'Great shoe for testing',
        image_url: 'https://example.com/shoe.jpg'
      })
      .returning()
      .execute();

    const variant = await db.insert(productVariantsTable)
      .values({
        product_id: product[0].id,
        size: '10',
        color: 'black',
        stock_quantity: 50,
        price_adjustment: '0.00',
        sku: 'TEST-10-BLK'
      })
      .returning()
      .execute();

    // Create addresses
    const billingAddress = await db.insert(addressesTable)
      .values({
        customer_id: customer[0].id,
        type: 'billing',
        street_address: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        postal_code: '12345',
        country: 'USA',
        is_default: true
      })
      .returning()
      .execute();

    const shippingAddress = await db.insert(addressesTable)
      .values({
        customer_id: customer[0].id,
        type: 'shipping',
        street_address: '456 Oak St',
        city: 'Anytown',
        state: 'CA',
        postal_code: '12345',
        country: 'USA',
        is_default: false
      })
      .returning()
      .execute();

    // Create test order
    const order = await db.insert(ordersTable)
      .values({
        customer_id: customer[0].id,
        status: 'pending',
        total_amount: '119.98',
        tax_amount: '9.99',
        shipping_amount: '9.99',
        billing_address_id: billingAddress[0].id,
        shipping_address_id: shippingAddress[0].id
      })
      .returning()
      .execute();

    // Create order item
    await db.insert(orderItemsTable)
      .values({
        order_id: order[0].id,
        product_variant_id: variant[0].id,
        quantity: 2,
        unit_price: '99.99',
        total_price: '199.98'
      })
      .execute();

    // Test the handler
    const result = await getCustomerOrders(customer[0].id);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(order[0].id);
    expect(result[0].customer_id).toBe(customer[0].id);
    expect(result[0].status).toBe('pending');
    expect(result[0].total_amount).toBe(119.98);
    expect(result[0].tax_amount).toBe(9.99);
    expect(result[0].shipping_amount).toBe(9.99);
    expect(result[0].order_date).toBeInstanceOf(Date);

    // Check billing address
    expect(result[0].billing_address).toBeDefined();
    expect(result[0].billing_address.street_address).toBe('123 Main St');
    expect(result[0].billing_address.type).toBe('billing');

    // Check shipping address
    expect(result[0].shipping_address).toBeDefined();
    expect(result[0].shipping_address.street_address).toBe('456 Oak St');
    expect(result[0].shipping_address.type).toBe('shipping');

    // Check order items
    expect(result[0].items).toHaveLength(1);
    expect(result[0].items[0].quantity).toBe(2);
    expect(result[0].items[0].unit_price).toBe(99.99);
    expect(result[0].items[0].total_price).toBe(199.98);
    expect(result[0].items[0].product_variant.size).toBe('10');
    expect(result[0].items[0].product_variant.color).toBe('black');
    expect(result[0].items[0].product_variant.product.name).toBe('Test Sneaker');
    expect(result[0].items[0].product_variant.product.brand).toBe('TestBrand');
  });

  it('should return empty array for customer with no orders', async () => {
    // Create customer with no orders
    const customer = await db.insert(customersTable)
      .values({
        email: 'noorders@example.com',
        first_name: 'Jane',
        last_name: 'Smith'
      })
      .returning()
      .execute();

    const result = await getCustomerOrders(customer[0].id);

    expect(result).toHaveLength(0);
  });

  it('should get order by ID with complete details', async () => {
    // Create test data (same as previous test)
    const customer = await db.insert(customersTable)
      .values({
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe'
      })
      .returning()
      .execute();

    const product = await db.insert(productsTable)
      .values({
        name: 'Test Sneaker',
        brand: 'TestBrand',
        category: 'Running',
        base_price: '99.99'
      })
      .returning()
      .execute();

    const variant = await db.insert(productVariantsTable)
      .values({
        product_id: product[0].id,
        size: '9',
        color: 'white',
        stock_quantity: 25,
        price_adjustment: '5.00',
        sku: 'TEST-9-WHT'
      })
      .returning()
      .execute();

    const billingAddress = await db.insert(addressesTable)
      .values({
        customer_id: customer[0].id,
        type: 'billing',
        street_address: '789 Pine St',
        city: 'Testville',
        state: 'NY',
        postal_code: '54321',
        country: 'USA'
      })
      .returning()
      .execute();

    const shippingAddress = await db.insert(addressesTable)
      .values({
        customer_id: customer[0].id,
        type: 'shipping',
        street_address: '321 Elm St',
        city: 'Testville',
        state: 'NY',
        postal_code: '54321',
        country: 'USA'
      })
      .returning()
      .execute();

    const order = await db.insert(ordersTable)
      .values({
        customer_id: customer[0].id,
        status: 'shipped',
        total_amount: '114.98',
        tax_amount: '4.99',
        shipping_amount: '9.99',
        billing_address_id: billingAddress[0].id,
        shipping_address_id: shippingAddress[0].id,
        shipped_date: new Date()
      })
      .returning()
      .execute();

    await db.insert(orderItemsTable)
      .values({
        order_id: order[0].id,
        product_variant_id: variant[0].id,
        quantity: 1,
        unit_price: '104.99',
        total_price: '104.99'
      })
      .execute();

    // Test the handler
    const result = await getOrderById(order[0].id);

    expect(result).toBeDefined();
    expect(result!.id).toBe(order[0].id);
    expect(result!.customer_id).toBe(customer[0].id);
    expect(result!.status).toBe('shipped');
    expect(result!.total_amount).toBe(114.98);
    expect(result!.shipped_date).toBeInstanceOf(Date);

    // Check addresses
    expect(result!.billing_address.street_address).toBe('789 Pine St');
    expect(result!.shipping_address.street_address).toBe('321 Elm St');

    // Check items
    expect(result!.items).toHaveLength(1);
    expect(result!.items[0].unit_price).toBe(104.99);
    expect(result!.items[0].product_variant.size).toBe('9');
    expect(result!.items[0].product_variant.color).toBe('white');
    expect(result!.items[0].product_variant.product.name).toBe('Test Sneaker');
  });

  it('should return null for non-existent order ID', async () => {
    const result = await getOrderById(99999);
    expect(result).toBeNull();
  });

  it('should get all orders ordered by date', async () => {
    // Create multiple customers and orders
    const customer1 = await db.insert(customersTable)
      .values({
        email: 'customer1@example.com',
        first_name: 'Alice',
        last_name: 'Johnson'
      })
      .returning()
      .execute();

    const customer2 = await db.insert(customersTable)
      .values({
        email: 'customer2@example.com',
        first_name: 'Bob',
        last_name: 'Wilson'
      })
      .returning()
      .execute();

    const product = await db.insert(productsTable)
      .values({
        name: 'Multi-Customer Shoe',
        brand: 'TestBrand',
        category: 'Casual',
        base_price: '79.99'
      })
      .returning()
      .execute();

    const variant = await db.insert(productVariantsTable)
      .values({
        product_id: product[0].id,
        size: '8',
        color: 'blue',
        stock_quantity: 100,
        price_adjustment: '0.00',
        sku: 'MULTI-8-BLU'
      })
      .returning()
      .execute();

    // Create addresses for both customers
    const address1 = await db.insert(addressesTable)
      .values({
        customer_id: customer1[0].id,
        type: 'billing',
        street_address: '111 First St',
        city: 'FirstCity',
        state: 'CA',
        postal_code: '11111',
        country: 'USA'
      })
      .returning()
      .execute();

    const address2 = await db.insert(addressesTable)
      .values({
        customer_id: customer2[0].id,
        type: 'billing',
        street_address: '222 Second St',
        city: 'SecondCity',
        state: 'NY',
        postal_code: '22222',
        country: 'USA'
      })
      .returning()
      .execute();

    // Create orders at different times
    const order1 = await db.insert(ordersTable)
      .values({
        customer_id: customer1[0].id,
        status: 'delivered',
        total_amount: '89.98',
        billing_address_id: address1[0].id,
        shipping_address_id: address1[0].id,
        order_date: new Date('2023-01-01')
      })
      .returning()
      .execute();

    const order2 = await db.insert(ordersTable)
      .values({
        customer_id: customer2[0].id,
        status: 'pending',
        total_amount: '79.99',
        billing_address_id: address2[0].id,
        shipping_address_id: address2[0].id,
        order_date: new Date('2023-01-02')
      })
      .returning()
      .execute();

    // Create order items
    await db.insert(orderItemsTable)
      .values({
        order_id: order1[0].id,
        product_variant_id: variant[0].id,
        quantity: 1,
        unit_price: '79.99',
        total_price: '79.99'
      })
      .execute();

    await db.insert(orderItemsTable)
      .values({
        order_id: order2[0].id,
        product_variant_id: variant[0].id,
        quantity: 1,
        unit_price: '79.99',
        total_price: '79.99'
      })
      .execute();

    // Test the handler
    const result = await getAllOrders();

    expect(result).toHaveLength(2);
    
    // Should be ordered by date DESC (newest first)
    expect(result[0].order_date.getTime()).toBeGreaterThan(result[1].order_date.getTime());
    
    // Check that different customers are represented
    const customerIds = result.map(order => order.customer_id);
    expect(customerIds).toContain(customer1[0].id);
    expect(customerIds).toContain(customer2[0].id);

    // Check that all orders have complete data
    result.forEach(order => {
      expect(order.billing_address).toBeDefined();
      expect(order.shipping_address).toBeDefined();
      expect(order.items).toHaveLength(1);
      expect(order.items[0].product_variant.product.name).toBe('Multi-Customer Shoe');
    });
  });

  it('should return empty array when no orders exist', async () => {
    const result = await getAllOrders();
    expect(result).toHaveLength(0);
  });

  it('should handle orders with multiple items correctly', async () => {
    // Create customer and products
    const customer = await db.insert(customersTable)
      .values({
        email: 'multiitem@example.com',
        first_name: 'Multi',
        last_name: 'Item'
      })
      .returning()
      .execute();

    const product1 = await db.insert(productsTable)
      .values({
        name: 'Running Shoe',
        brand: 'RunBrand',
        category: 'Athletic',
        base_price: '120.00'
      })
      .returning()
      .execute();

    const product2 = await db.insert(productsTable)
      .values({
        name: 'Casual Shoe',
        brand: 'CasualBrand',
        category: 'Casual',
        base_price: '80.00'
      })
      .returning()
      .execute();

    const variant1 = await db.insert(productVariantsTable)
      .values({
        product_id: product1[0].id,
        size: '10',
        color: 'red',
        stock_quantity: 30,
        price_adjustment: '0.00',
        sku: 'RUN-10-RED'
      })
      .returning()
      .execute();

    const variant2 = await db.insert(productVariantsTable)
      .values({
        product_id: product2[0].id,
        size: '9',
        color: 'brown',
        stock_quantity: 20,
        price_adjustment: '10.00',
        sku: 'CAS-9-BRN'
      })
      .returning()
      .execute();

    const address = await db.insert(addressesTable)
      .values({
        customer_id: customer[0].id,
        type: 'billing',
        street_address: '999 Multi St',
        city: 'MultiCity',
        state: 'TX',
        postal_code: '99999',
        country: 'USA'
      })
      .returning()
      .execute();

    const order = await db.insert(ordersTable)
      .values({
        customer_id: customer[0].id,
        status: 'processing',
        total_amount: '330.00',
        tax_amount: '25.00',
        shipping_amount: '15.00',
        billing_address_id: address[0].id,
        shipping_address_id: address[0].id
      })
      .returning()
      .execute();

    // Create multiple order items
    await db.insert(orderItemsTable)
      .values({
        order_id: order[0].id,
        product_variant_id: variant1[0].id,
        quantity: 2,
        unit_price: '120.00',
        total_price: '240.00'
      })
      .execute();

    await db.insert(orderItemsTable)
      .values({
        order_id: order[0].id,
        product_variant_id: variant2[0].id,
        quantity: 1,
        unit_price: '90.00',
        total_price: '90.00'
      })
      .execute();

    // Test getOrderById
    const result = await getOrderById(order[0].id);

    expect(result).toBeDefined();
    expect(result!.items).toHaveLength(2);
    
    // Check first item
    const runningShoeItem = result!.items.find(item => 
      item.product_variant.product.name === 'Running Shoe'
    );
    expect(runningShoeItem).toBeDefined();
    expect(runningShoeItem!.quantity).toBe(2);
    expect(runningShoeItem!.unit_price).toBe(120.00);
    expect(runningShoeItem!.total_price).toBe(240.00);

    // Check second item
    const casualShoeItem = result!.items.find(item => 
      item.product_variant.product.name === 'Casual Shoe'
    );
    expect(casualShoeItem).toBeDefined();
    expect(casualShoeItem!.quantity).toBe(1);
    expect(casualShoeItem!.unit_price).toBe(90.00);
    expect(casualShoeItem!.total_price).toBe(90.00);
  });
});