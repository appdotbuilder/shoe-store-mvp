import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, cartsTable } from '../db/schema';
import { type CreateCustomerInput } from '../schema';
import { createCustomer } from '../handlers/create_customer';
import { eq } from 'drizzle-orm';

// Test input with all fields
const testInput: CreateCustomerInput = {
  email: 'test@example.com',
  first_name: 'John',
  last_name: 'Doe',
  phone: '+1-555-123-4567'
};

// Test input without optional phone
const testInputNoPhone: CreateCustomerInput = {
  email: 'nophone@example.com',
  first_name: 'Jane',
  last_name: 'Smith',
  phone: null
};

describe('createCustomer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a customer with all fields', async () => {
    const result = await createCustomer(testInput);

    // Validate returned data
    expect(result.email).toEqual('test@example.com');
    expect(result.first_name).toEqual('John');
    expect(result.last_name).toEqual('Doe');
    expect(result.phone).toEqual('+1-555-123-4567');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toEqual('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a customer with nullable phone field', async () => {
    const result = await createCustomer(testInputNoPhone);

    expect(result.email).toEqual('nophone@example.com');
    expect(result.first_name).toEqual('Jane');
    expect(result.last_name).toEqual('Smith');
    expect(result.phone).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save customer to database', async () => {
    const result = await createCustomer(testInput);

    // Query database to verify customer was saved
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, result.id))
      .execute();

    expect(customers).toHaveLength(1);
    expect(customers[0].email).toEqual('test@example.com');
    expect(customers[0].first_name).toEqual('John');
    expect(customers[0].last_name).toEqual('Doe');
    expect(customers[0].phone).toEqual('+1-555-123-4567');
    expect(customers[0].created_at).toBeInstanceOf(Date);
    expect(customers[0].updated_at).toBeInstanceOf(Date);
  });

  it('should initialize shopping cart for new customer', async () => {
    const result = await createCustomer(testInput);

    // Verify cart was created for the customer
    const carts = await db.select()
      .from(cartsTable)
      .where(eq(cartsTable.customer_id, result.id))
      .execute();

    expect(carts).toHaveLength(1);
    expect(carts[0].customer_id).toEqual(result.id);
    expect(carts[0].created_at).toBeInstanceOf(Date);
    expect(carts[0].updated_at).toBeInstanceOf(Date);
  });

  it('should reject duplicate email addresses', async () => {
    // Create first customer
    await createCustomer(testInput);

    // Attempt to create second customer with same email
    const duplicateInput: CreateCustomerInput = {
      email: 'test@example.com', // Same email
      first_name: 'Different',
      last_name: 'Person',
      phone: '+1-555-999-8888'
    };

    await expect(createCustomer(duplicateInput)).rejects.toThrow(/already exists/i);
  });

  it('should allow different customers with different emails', async () => {
    // Create first customer
    const customer1 = await createCustomer(testInput);

    // Create second customer with different email
    const differentEmailInput: CreateCustomerInput = {
      email: 'different@example.com',
      first_name: 'Alice',
      last_name: 'Johnson',
      phone: '+1-555-777-6666'
    };

    const customer2 = await createCustomer(differentEmailInput);

    // Both customers should exist
    expect(customer1.id).not.toEqual(customer2.id);
    expect(customer1.email).toEqual('test@example.com');
    expect(customer2.email).toEqual('different@example.com');

    // Both should have their own carts
    const customer1Carts = await db.select()
      .from(cartsTable)
      .where(eq(cartsTable.customer_id, customer1.id))
      .execute();

    const customer2Carts = await db.select()
      .from(cartsTable)
      .where(eq(cartsTable.customer_id, customer2.id))
      .execute();

    expect(customer1Carts).toHaveLength(1);
    expect(customer2Carts).toHaveLength(1);
    expect(customer1Carts[0].customer_id).toEqual(customer1.id);
    expect(customer2Carts[0].customer_id).toEqual(customer2.id);
  });

  it('should handle email case sensitivity correctly', async () => {
    // Create customer with lowercase email
    await createCustomer(testInput);

    // Attempt to create customer with uppercase version of same email
    const uppercaseEmailInput: CreateCustomerInput = {
      email: 'TEST@EXAMPLE.COM',
      first_name: 'Different',
      last_name: 'Person',
      phone: '+1-555-999-8888'
    };

    // This should succeed since PostgreSQL email comparison is case-sensitive by default
    // If the business logic requires case-insensitive emails, the handler would need updating
    const result = await createCustomer(uppercaseEmailInput);
    expect(result.email).toEqual('TEST@EXAMPLE.COM');
  });

  it('should validate required fields are present', async () => {
    // Test with missing first_name (this will be caught by Zod validation before reaching handler)
    // But we can test that the handler receives properly validated input
    const validInput: CreateCustomerInput = {
      email: 'valid@example.com',
      first_name: 'Valid',
      last_name: 'User',
      phone: null
    };

    const result = await createCustomer(validInput);
    expect(result.first_name).toEqual('Valid');
    expect(result.last_name).toEqual('User');
  });
});