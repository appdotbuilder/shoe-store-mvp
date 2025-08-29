import { db } from '../db';
import { customersTable, cartsTable } from '../db/schema';
import { type CreateCustomerInput, type Customer } from '../schema';
import { eq } from 'drizzle-orm';

export async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  try {
    // Check if email already exists
    const existingCustomer = await db.select()
      .from(customersTable)
      .where(eq(customersTable.email, input.email))
      .execute();

    if (existingCustomer.length > 0) {
      throw new Error(`Customer with email ${input.email} already exists`);
    }

    // Create customer record
    const customerResult = await db.insert(customersTable)
      .values({
        email: input.email,
        first_name: input.first_name,
        last_name: input.last_name,
        phone: input.phone
      })
      .returning()
      .execute();

    const customer = customerResult[0];

    // Initialize shopping cart for the new customer
    await db.insert(cartsTable)
      .values({
        customer_id: customer.id
      })
      .execute();

    return customer;
  } catch (error) {
    console.error('Customer creation failed:', error);
    throw error;
  }
}