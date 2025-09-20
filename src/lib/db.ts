import { supabase } from './supabaseClient';
import type { Account, Contact, Invoice, LedgerEntry, Payment, Product, PurchaseOrder, SalesOrder, Tax, VendorBill } from '@/types';

if (!supabase) {
  console.warn('Supabase not configured. Falling back to local mock state.');
}

export async function dbLoadAll() {
  if (!supabase) return null;
  const [contacts, products, taxes, accounts, purchaseOrders, invoices, salesOrders, vendorBills, payments, ledger] = await Promise.all([
    supabase.from('contacts').select('*'),
    supabase.from('products').select('*'),
    supabase.from('taxes').select('*'),
    supabase.from('accounts').select('*'),
    supabase.from('purchase_orders').select('*'),
    supabase.from('invoices').select('*, items:invoice_items(*)'),
    supabase.from('sales_orders').select('*, items:sales_order_items(*)'),
    supabase.from('vendor_bills').select('*, items:bill_items(*)'),
    supabase.from('payments').select('*'),
    supabase.from('ledger').select('*'),
  ]);
  type SupaResp<T> = { data: T | null; error: { message: string } | null };
  const get = <T>(r: SupaResp<T>) => { if (r.error) throw r.error; return r.data as T; };
  return {
    contacts: get(contacts) as Contact[],
    products: get(products) as Product[],
    taxes: get(taxes) as Tax[],
    accounts: get(accounts) as Account[],
    purchaseOrders: get(purchaseOrders) as PurchaseOrder[],
    invoices: get(invoices) as Invoice[],
    salesOrders: get(salesOrders) as SalesOrder[],
    vendorBills: get(vendorBills) as VendorBill[],
    payments: get(payments) as Payment[],
    ledger: get(ledger) as LedgerEntry[],
  };
}

export const db = {
  async insert<T extends Record<string, unknown>>(table: string, payload: T) {
    if (!supabase) return { data: null };
    const { data, error } = await supabase.from(table).insert(payload).select().single();
    if (error) throw error; return { data };
  },
  async insertMany<T extends Record<string, unknown>>(table: string, payload: T[]) {
    if (!supabase) return { data: null };
    const { data, error } = await supabase.from(table).insert(payload).select();
    if (error) throw error; return { data };
  },
  async update<T extends Record<string, unknown>>(table: string, idField: string, id: string, patch: Partial<T>) {
    if (!supabase) return { data: null };
    const { data, error } = await supabase.from(table).update(patch).eq(idField, id).select().single();
    if (error) throw error; return { data };
  },
  async delete(table: string, idField: string, id: string) {
    if (!supabase) return { data: null };
    const { data, error } = await supabase.from(table).delete().eq(idField, id).select();
    if (error) throw error; return { data };
  }
};
