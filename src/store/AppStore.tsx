/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import type {
  Account,
  AuditLog,
  Contact,
  Invoice,
  LedgerEntry,
  VendorBill,
  Payment,
  Product,
  PurchaseOrder,
  SalesOrder,
  Tax,
} from '@/types';
import {
  mockAccounts,
  mockContacts,
  mockDashboardMetrics,
  mockInvoices,
  mockProducts,
  mockPurchaseOrders,
  mockTaxes,
} from '@/data/mockData';
import { supabase } from '@/lib/supabaseClient';
import { dbLoadAll } from '@/lib/db';

type AppState = {
  contacts: Contact[];
  products: Product[];
  taxes: Tax[];
  accounts: Account[];
  purchaseOrders: PurchaseOrder[];
  invoices: Invoice[];
  salesOrders: SalesOrder[];
  vendorBills: VendorBill[];
  payments: Payment[];
  ledger: LedgerEntry[];
  audit: AuditLog[];
};

type AppAction =
  | { type: 'seed'; payload: Partial<AppState> }
  | { type: 'contacts/set'; payload: Contact[] }
  | { type: 'products/set'; payload: Product[] }
  | { type: 'taxes/set'; payload: Tax[] }
  | { type: 'accounts/set'; payload: Account[] }
  | { type: 'purchaseOrders/set'; payload: PurchaseOrder[] }
  | { type: 'invoices/set'; payload: Invoice[] }
  | { type: 'salesOrders/set'; payload: SalesOrder[] }
  | { type: 'vendorBills/set'; payload: VendorBill[] }
  | { type: 'payments/set'; payload: Payment[] }
  | { type: 'ledger/append'; payload: LedgerEntry[] }
  | { type: 'ledger/set'; payload: LedgerEntry[] }
  | { type: 'audit/append'; payload: AuditLog };

const initialState: AppState = {
  contacts: [],
  products: [],
  taxes: [],
  accounts: [],
  purchaseOrders: [],
  invoices: [],
  salesOrders: [],
  vendorBills: [],
  payments: [],
  ledger: [],
  audit: [],
};

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'seed':
      return { ...state, ...action.payload } as AppState;
    case 'contacts/set':
      return { ...state, contacts: action.payload };
    case 'products/set':
      return { ...state, products: action.payload };
    case 'taxes/set':
      return { ...state, taxes: action.payload };
    case 'accounts/set':
      return { ...state, accounts: action.payload };
    case 'purchaseOrders/set':
      return { ...state, purchaseOrders: action.payload };
    case 'invoices/set':
      return { ...state, invoices: action.payload };
    case 'salesOrders/set':
      return { ...state, salesOrders: action.payload };
    case 'payments/set':
      return { ...state, payments: action.payload };
    case 'vendorBills/set':
      return { ...state, vendorBills: action.payload };
    case 'ledger/append':
      return { ...state, ledger: [...state.ledger, ...action.payload] };
    case 'ledger/set':
      return { ...state, ledger: action.payload };
    case 'audit/append':
      return { ...state, audit: [...state.audit, action.payload] };
    default:
      return state;
  }
}

const AppStoreContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

const STORAGE_KEY = 'shiv-accounts-store-v1';

function reviveDates<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj),
    (key, value) => {
      if (typeof value === 'string' && /\d{4}-\d{2}-\d{2}T/.test(value)) {
        const d = new Date(value);
        if (!isNaN(d.getTime())) return d;
      }
      return value;
    }
  );
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load from localStorage or seed from mock data
  useEffect(() => {
    const init = async () => {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = reviveDates<AppState>(JSON.parse(raw));
        dispatch({ type: 'seed', payload: parsed });
        return;
      }
      // If Supabase is configured, load from DB; else seed mock
      if (supabase) {
        try {
          const data = await dbLoadAll();
          if (data) {
            // Ensure stockQty presence
            const products: Product[] = (data.products || []).map(p => ({ ...p, stockQty: p.type === 'Goods' ? (p.stockQty ?? 0) : 0 }));
            dispatch({ type: 'seed', payload: { ...data, products, audit: [] } as Partial<AppState> });
            return;
          }
        } catch (e) {
          console.warn('Failed to load from Supabase, falling back to mock seed', e);
        }
      }
      const seededProducts: Product[] = mockProducts.map(p => ({
        ...p,
        stockQty: p.type === 'Goods' ? (p.stockQty ?? 0) : 0,
      }));
      dispatch({
        type: 'seed',
        payload: {
          contacts: mockContacts,
          products: seededProducts,
          taxes: mockTaxes,
          accounts: mockAccounts,
          purchaseOrders: mockPurchaseOrders,
          invoices: mockInvoices,
          salesOrders: [],
          vendorBills: [],
          payments: [],
          ledger: [],
          audit: [],
        },
      });
    };
    void init();
  }, []);

  // Persist to localStorage whenever state changes
  useEffect(() => {
    // Avoid persisting the initial empty state before seed
    if (
      state.products.length ||
      state.contacts.length ||
      state.accounts.length
    ) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider');
  return ctx;
}

// Helpers to post ledger for simple flows
export function postLedgerEntries(
  entries: Array<Pick<LedgerEntry, 'accountId' | 'accountName' | 'debit' | 'credit'> & Partial<LedgerEntry>>,
  opts?: { referenceType?: LedgerEntry['referenceType']; referenceId?: string; description?: string }
) {
  const now = new Date();
  return entries.map((e, idx) => ({
    id: `${now.getTime()}-${idx}`,
    date: now,
    debit: 0,
    credit: 0,
    referenceType: opts?.referenceType ?? 'Adjustment',
    referenceId: opts?.referenceId,
    description: opts?.description,
    ...e,
  }));
}
