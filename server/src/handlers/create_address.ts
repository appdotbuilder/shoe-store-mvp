import { db } from '../db';
import { addressesTable, customersTable } from '../db/schema';
import { type CreateAddressInput, type Address } from '../schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export async function createAddress(input: CreateAddressInput): Promise<Address> {
  try {
    // Verify customer exists
    const customer = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, input.customer_id))
      .limit(1)
      .execute();

    if (customer.length === 0) {
      throw new Error(`Customer with ID ${input.customer_id} not found`);
    }

    // If this address should be default, unset default flag on other addresses of same type
    if (input.is_default === true) {
      await db.update(addressesTable)
        .set({ 
          is_default: false,
          updated_at: new Date()
        })
        .where(
          and(
            eq(addressesTable.customer_id, input.customer_id),
            eq(addressesTable.type, input.type)
          )
        )
        .execute();
    }

    // Create the new address
    const result = await db.insert(addressesTable)
      .values({
        customer_id: input.customer_id,
        type: input.type,
        street_address: input.street_address,
        apartment: input.apartment,
        city: input.city,
        state: input.state,
        postal_code: input.postal_code,
        country: input.country,
        is_default: input.is_default ?? false
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Address creation failed:', error);
    throw error;
  }
}

export async function getCustomerAddresses(customerId: number): Promise<Address[]> {
  try {
    // Verify customer exists
    const customer = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, customerId))
      .limit(1)
      .execute();

    if (customer.length === 0) {
      throw new Error(`Customer with ID ${customerId} not found`);
    }

    // Fetch all addresses for the customer, ordered by is_default desc, then created_at desc
    const addresses = await db.select()
      .from(addressesTable)
      .where(eq(addressesTable.customer_id, customerId))
      .orderBy(
        desc(addressesTable.is_default),
        desc(addressesTable.created_at)
      )
      .execute();
    return addresses;
  } catch (error) {
    console.error('Failed to fetch customer addresses:', error);
    throw error;
  }
}