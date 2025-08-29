import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { addressesTable, customersTable } from '../db/schema';
import { type CreateAddressInput } from '../schema';
import { createAddress, getCustomerAddresses } from '../handlers/create_address';
import { eq, and } from 'drizzle-orm';

describe('Address Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test customer
  const createTestCustomer = async () => {
    const result = await db.insert(customersTable)
      .values({
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        phone: '555-0123'
      })
      .returning()
      .execute();

    return result[0];
  };

  describe('createAddress', () => {
    it('should create a shipping address', async () => {
      const customer = await createTestCustomer();

      const addressInput: CreateAddressInput = {
        customer_id: customer.id,
        type: 'shipping',
        street_address: '123 Main St',
        apartment: 'Apt 2B',
        city: 'New York',
        state: 'NY',
        postal_code: '10001',
        country: 'USA',
        is_default: false
      };

      const result = await createAddress(addressInput);

      expect(result.id).toBeDefined();
      expect(result.customer_id).toBe(customer.id);
      expect(result.type).toBe('shipping');
      expect(result.street_address).toBe('123 Main St');
      expect(result.apartment).toBe('Apt 2B');
      expect(result.city).toBe('New York');
      expect(result.state).toBe('NY');
      expect(result.postal_code).toBe('10001');
      expect(result.country).toBe('USA');
      expect(result.is_default).toBe(false);
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should create a billing address with null apartment', async () => {
      const customer = await createTestCustomer();

      const addressInput: CreateAddressInput = {
        customer_id: customer.id,
        type: 'billing',
        street_address: '456 Oak Ave',
        apartment: null,
        city: 'Los Angeles',
        state: 'CA',
        postal_code: '90210',
        country: 'USA',
        is_default: true
      };

      const result = await createAddress(addressInput);

      expect(result.type).toBe('billing');
      expect(result.apartment).toBeNull();
      expect(result.is_default).toBe(true);
    });

    it('should save address to database', async () => {
      const customer = await createTestCustomer();

      const addressInput: CreateAddressInput = {
        customer_id: customer.id,
        type: 'shipping',
        street_address: '789 Pine Rd',
        apartment: null,
        city: 'Chicago',
        state: 'IL',
        postal_code: '60601',
        country: 'USA',
        is_default: false
      };

      const result = await createAddress(addressInput);

      const savedAddress = await db.select()
        .from(addressesTable)
        .where(eq(addressesTable.id, result.id))
        .execute();

      expect(savedAddress).toHaveLength(1);
      expect(savedAddress[0].street_address).toBe('789 Pine Rd');
      expect(savedAddress[0].city).toBe('Chicago');
      expect(savedAddress[0].is_default).toBe(false);
    });

    it('should default is_default to false when not provided', async () => {
      const customer = await createTestCustomer();

      const addressInput: CreateAddressInput = {
        customer_id: customer.id,
        type: 'billing',
        street_address: '321 Elm St',
        apartment: null,
        city: 'Miami',
        state: 'FL',
        postal_code: '33101',
        country: 'USA'
        // is_default not provided
      };

      const result = await createAddress(addressInput);

      expect(result.is_default).toBe(false);
    });

    it('should unset default flag on other addresses of same type when creating default address', async () => {
      const customer = await createTestCustomer();

      // Create first shipping address as default
      const firstAddress: CreateAddressInput = {
        customer_id: customer.id,
        type: 'shipping',
        street_address: '123 First St',
        apartment: null,
        city: 'Boston',
        state: 'MA',
        postal_code: '02101',
        country: 'USA',
        is_default: true
      };

      const first = await createAddress(firstAddress);
      expect(first.is_default).toBe(true);

      // Create second shipping address as default
      const secondAddress: CreateAddressInput = {
        customer_id: customer.id,
        type: 'shipping',
        street_address: '456 Second St',
        apartment: null,
        city: 'Boston',
        state: 'MA',
        postal_code: '02102',
        country: 'USA',
        is_default: true
      };

      const second = await createAddress(secondAddress);
      expect(second.is_default).toBe(true);

      // Check that first address is no longer default
      const updatedFirst = await db.select()
        .from(addressesTable)
        .where(eq(addressesTable.id, first.id))
        .execute();

      expect(updatedFirst[0].is_default).toBe(false);

      // Check that second address is default
      const savedSecond = await db.select()
        .from(addressesTable)
        .where(eq(addressesTable.id, second.id))
        .execute();

      expect(savedSecond[0].is_default).toBe(true);
    });

    it('should not affect default addresses of different type', async () => {
      const customer = await createTestCustomer();

      // Create default billing address
      const billingAddress: CreateAddressInput = {
        customer_id: customer.id,
        type: 'billing',
        street_address: '123 Billing St',
        apartment: null,
        city: 'Denver',
        state: 'CO',
        postal_code: '80201',
        country: 'USA',
        is_default: true
      };

      const billing = await createAddress(billingAddress);

      // Create default shipping address
      const shippingAddress: CreateAddressInput = {
        customer_id: customer.id,
        type: 'shipping',
        street_address: '456 Shipping Ave',
        apartment: null,
        city: 'Denver',
        state: 'CO',
        postal_code: '80202',
        country: 'USA',
        is_default: true
      };

      const shipping = await createAddress(shippingAddress);

      // Both should remain default since they are different types
      const billingCheck = await db.select()
        .from(addressesTable)
        .where(eq(addressesTable.id, billing.id))
        .execute();

      const shippingCheck = await db.select()
        .from(addressesTable)
        .where(eq(addressesTable.id, shipping.id))
        .execute();

      expect(billingCheck[0].is_default).toBe(true);
      expect(shippingCheck[0].is_default).toBe(true);
    });

    it('should throw error for non-existent customer', async () => {
      const addressInput: CreateAddressInput = {
        customer_id: 999999,
        type: 'shipping',
        street_address: '123 Main St',
        apartment: null,
        city: 'Nowhere',
        state: 'XX',
        postal_code: '00000',
        country: 'USA',
        is_default: false
      };

      await expect(createAddress(addressInput)).rejects.toThrow(/Customer with ID 999999 not found/i);
    });
  });

  describe('getCustomerAddresses', () => {
    it('should return empty array for customer with no addresses', async () => {
      const customer = await createTestCustomer();

      const addresses = await getCustomerAddresses(customer.id);

      expect(addresses).toHaveLength(0);
    });

    it('should return all addresses for a customer', async () => {
      const customer = await createTestCustomer();

      // Create multiple addresses
      const billingAddress: CreateAddressInput = {
        customer_id: customer.id,
        type: 'billing',
        street_address: '123 Billing St',
        apartment: null,
        city: 'Seattle',
        state: 'WA',
        postal_code: '98101',
        country: 'USA',
        is_default: true
      };

      const shippingAddress: CreateAddressInput = {
        customer_id: customer.id,
        type: 'shipping',
        street_address: '456 Shipping Ave',
        apartment: 'Suite 100',
        city: 'Seattle',
        state: 'WA',
        postal_code: '98102',
        country: 'USA',
        is_default: false
      };

      await createAddress(billingAddress);
      await createAddress(shippingAddress);

      const addresses = await getCustomerAddresses(customer.id);

      expect(addresses).toHaveLength(2);
      expect(addresses.some(addr => addr.type === 'billing')).toBe(true);
      expect(addresses.some(addr => addr.type === 'shipping')).toBe(true);
    });

    it('should order addresses with default first, then by creation date desc', async () => {
      const customer = await createTestCustomer();

      // Create addresses with different creation times and default settings
      const firstAddress: CreateAddressInput = {
        customer_id: customer.id,
        type: 'shipping',
        street_address: '111 First St',
        apartment: null,
        city: 'Portland',
        state: 'OR',
        postal_code: '97201',
        country: 'USA',
        is_default: false
      };

      const first = await createAddress(firstAddress);

      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const secondAddress: CreateAddressInput = {
        customer_id: customer.id,
        type: 'shipping',
        street_address: '222 Second St',
        apartment: null,
        city: 'Portland',
        state: 'OR',
        postal_code: '97202',
        country: 'USA',
        is_default: true
      };

      const second = await createAddress(secondAddress);

      await new Promise(resolve => setTimeout(resolve, 10));

      const thirdAddress: CreateAddressInput = {
        customer_id: customer.id,
        type: 'billing',
        street_address: '333 Third St',
        apartment: null,
        city: 'Portland',
        state: 'OR',
        postal_code: '97203',
        country: 'USA',
        is_default: false
      };

      const third = await createAddress(thirdAddress);

      const addresses = await getCustomerAddresses(customer.id);

      expect(addresses).toHaveLength(3);
      
      // Default addresses should come first
      expect(addresses[0].is_default).toBe(true);
      expect(addresses[0].id).toBe(second.id);
      
      // Among non-default addresses, newest should come first
      expect(addresses[1].is_default).toBe(false);
      expect(addresses[1].id).toBe(third.id); // Most recently created
      expect(addresses[2].is_default).toBe(false);
      expect(addresses[2].id).toBe(first.id); // Oldest
    });

    it('should not return addresses from other customers', async () => {
      const customer1 = await createTestCustomer();
      
      const customer2Result = await db.insert(customersTable)
        .values({
          email: 'customer2@example.com',
          first_name: 'Jane',
          last_name: 'Smith',
          phone: '555-0124'
        })
        .returning()
        .execute();
      const customer2 = customer2Result[0];

      // Create address for customer1
      const address1: CreateAddressInput = {
        customer_id: customer1.id,
        type: 'shipping',
        street_address: '123 Customer1 St',
        apartment: null,
        city: 'Austin',
        state: 'TX',
        postal_code: '78701',
        country: 'USA',
        is_default: true
      };

      // Create address for customer2
      const address2: CreateAddressInput = {
        customer_id: customer2.id,
        type: 'billing',
        street_address: '456 Customer2 Ave',
        apartment: null,
        city: 'Austin',
        state: 'TX',
        postal_code: '78702',
        country: 'USA',
        is_default: true
      };

      await createAddress(address1);
      await createAddress(address2);

      // Get addresses for customer1 only
      const customer1Addresses = await getCustomerAddresses(customer1.id);

      expect(customer1Addresses).toHaveLength(1);
      expect(customer1Addresses[0].customer_id).toBe(customer1.id);
      expect(customer1Addresses[0].street_address).toBe('123 Customer1 St');
    });

    it('should throw error for non-existent customer', async () => {
      await expect(getCustomerAddresses(999999)).rejects.toThrow(/Customer with ID 999999 not found/i);
    });

    it('should return correct address field types', async () => {
      const customer = await createTestCustomer();

      const addressInput: CreateAddressInput = {
        customer_id: customer.id,
        type: 'billing',
        street_address: '789 Type Test St',
        apartment: 'Unit 5',
        city: 'Phoenix',
        state: 'AZ',
        postal_code: '85001',
        country: 'USA',
        is_default: true
      };

      await createAddress(addressInput);

      const addresses = await getCustomerAddresses(customer.id);

      expect(addresses).toHaveLength(1);
      const address = addresses[0];
      
      expect(typeof address.id).toBe('number');
      expect(typeof address.customer_id).toBe('number');
      expect(address.type).toBe('billing');
      expect(typeof address.street_address).toBe('string');
      expect(typeof address.apartment).toBe('string');
      expect(typeof address.city).toBe('string');
      expect(typeof address.state).toBe('string');
      expect(typeof address.postal_code).toBe('string');
      expect(typeof address.country).toBe('string');
      expect(typeof address.is_default).toBe('boolean');
      expect(address.created_at).toBeInstanceOf(Date);
      expect(address.updated_at).toBeInstanceOf(Date);
    });
  });
});