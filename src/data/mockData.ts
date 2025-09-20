// Mock data for Shiv Accounts Cloud
import { Contact, Product, Tax, Account, PurchaseOrder, VendorBill, SalesOrder, Invoice, Payment, DashboardMetrics } from '@/types';

export const mockContacts: Contact[] = [
  {
    id: '1',
    name: 'Modern Furniture Co.',
    type: 'Customer',
    email: 'orders@modernfurniture.com',
    mobile: '+91 98765 43210',
    city: 'Mumbai',
    state: 'Maharashtra',
    address: '123 Business District, Mumbai',
    gstNumber: '27ABCDE1234F1Z5',
    createdAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    name: 'Wood Supply Ltd.',
    type: 'Vendor',
    email: 'sales@woodsupply.com',
    mobile: '+91 98765 43211',
    city: 'Bangalore',
    state: 'Karnataka',
    address: '456 Industrial Area, Bangalore',
    gstNumber: '29FGHIJ5678K2L6',
    createdAt: new Date('2024-01-20'),
  },
  {
    id: '3',
    name: 'Elite Interiors',
    type: 'Customer',
    email: 'contact@eliteinteriors.com',
    mobile: '+91 98765 43212',
    city: 'Delhi',
    state: 'Delhi',
    createdAt: new Date('2024-02-01'),
  },
  {
    id: '4',
    name: 'Premium Hardware Supplies',
    type: 'Vendor',
    email: 'info@premiumhardware.com',
    mobile: '+91 98765 43213',
    city: 'Chennai',
    state: 'Tamil Nadu',
    createdAt: new Date('2024-02-05'),
  },
  {
    id: '5',
    name: 'Royal Furniture House',
    type: 'Both',
    email: 'business@royalfurniture.com',
    mobile: '+91 98765 43214',
    city: 'Pune',
    state: 'Maharashtra',
    createdAt: new Date('2024-02-10'),
  },
];

export const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Executive Office Chair',
    type: 'Goods',
    salesPrice: 15000,
    purchasePrice: 10000,
    taxPercentage: 18,
    hsnCode: '9401',
    category: 'Office Furniture',
    description: 'Premium ergonomic office chair with lumbar support',
    unit: 'Piece',
    createdAt: new Date('2024-01-10'),
  },
  {
    id: '2',
    name: 'Wooden Dining Table',
    type: 'Goods',
    salesPrice: 25000,
    purchasePrice: 18000,
    taxPercentage: 18,
    hsnCode: '9403',
    category: 'Dining Furniture',
    description: 'Solid wood dining table for 6 people',
    unit: 'Piece',
    createdAt: new Date('2024-01-12'),
  },
  {
    id: '3',
    name: 'Furniture Assembly Service',
    type: 'Service',
    salesPrice: 1500,
    purchasePrice: 1000,
    taxPercentage: 18,
    hsnCode: '9954',
    category: 'Installation Services',
    description: 'Professional furniture assembly and installation',
    unit: 'Hour',
    createdAt: new Date('2024-01-15'),
  },
  {
    id: '4',
    name: 'Steel Bookshelf',
    type: 'Goods',
    salesPrice: 8500,
    purchasePrice: 6000,
    taxPercentage: 18,
    hsnCode: '9403',
    category: 'Storage Furniture',
    unit: 'Piece',
    createdAt: new Date('2024-01-18'),
  },
];

export const mockTaxes: Tax[] = [
  {
    id: '1',
    name: 'GST 18%',
    rate: 18,
    computationMethod: 'Percentage',
    appliesOn: 'Both',
    description: 'Standard GST rate for furniture',
  },
  {
    id: '2',
    name: 'GST 12%',
    rate: 12,
    computationMethod: 'Percentage',
    appliesOn: 'Both',
    description: 'Reduced GST rate for specific items',
  },
  {
    id: '3',
    name: 'Service Tax 18%',
    rate: 18,
    computationMethod: 'Percentage',
    appliesOn: 'Sales',
    description: 'GST on services',
  },
];

export const mockAccounts: Account[] = [
  {
    id: '1',
    name: 'Cash in Hand',
    type: 'Asset',
    code: 'A001',
    balance: 50000,
  },
  {
    id: '2',
    name: 'Bank Account - HDFC',
    type: 'Asset',
    code: 'A002',
    balance: 500000,
  },
  {
    id: '3',
    name: 'Accounts Receivable',
    type: 'Asset',
    code: 'A003',
    balance: 180000,
  },
  {
    id: '4',
    name: 'Inventory',
    type: 'Asset',
    code: 'A004',
    balance: 300000,
  },
  {
    id: '5',
    name: 'Accounts Payable',
    type: 'Liability',
    code: 'L001',
    balance: 120000,
  },
  {
    id: '6',
    name: 'Sales Revenue',
    type: 'Income',
    code: 'I001',
    balance: 850000,
  },
  {
    id: '7',
    name: 'Cost of Goods Sold',
    type: 'Expense',
    code: 'E001',
    balance: 450000,
  },
];

export const mockDashboardMetrics: DashboardMetrics = {
  totalSales: 850000,
  totalPurchases: 450000,
  outstandingReceivables: 180000,
  outstandingPayables: 120000,
  totalCustomers: 25,
  totalVendors: 15,
  totalProducts: 48,
  recentTransactions: [
    {
      id: '1',
      type: 'Sale',
      amount: 25000,
      date: new Date('2024-09-18'),
      description: 'INV-001 - Modern Furniture Co.',
    },
    {
      id: '2',
      type: 'Purchase',
      amount: 15000,
      date: new Date('2024-09-17'),
      description: 'BILL-045 - Wood Supply Ltd.',
    },
    {
      id: '3',
      type: 'Payment Received',
      amount: 18000,
      date: new Date('2024-09-16'),
      description: 'Payment from Elite Interiors',
    },
    {
      id: '4',
      type: 'Payment Made',
      amount: 12000,
      date: new Date('2024-09-15'),
      description: 'Payment to Premium Hardware',
    },
  ],
};

export const mockPurchaseOrders: PurchaseOrder[] = [
  {
    id: '1',
    poNumber: 'PO-001',
    vendorId: '2',
    vendorName: 'Wood Supply Ltd.',
    date: new Date('2024-09-15'),
    dueDate: new Date('2024-09-30'),
    items: [
      {
        id: '1',
        productId: '1',
        productName: 'Executive Office Chair',
        quantity: 5,
        unitPrice: 10000,
        taxPercentage: 18,
        amount: 50000,
      },
    ],
    subtotal: 50000,
    taxAmount: 9000,
    total: 59000,
    status: 'Approved',
    notes: 'Urgent delivery required',
  },
];

export const mockInvoices: Invoice[] = [
  {
    id: '1',
    invoiceNumber: 'INV-001',
    customerId: '1',
    customerName: 'Modern Furniture Co.',
    date: new Date('2024-09-18'),
    dueDate: new Date('2024-10-18'),
    items: [
      {
        id: '1',
        productId: '1',
        productName: 'Executive Office Chair',
        quantity: 2,
        unitPrice: 15000,
        taxPercentage: 18,
        amount: 30000,
      },
    ],
    subtotal: 30000,
    taxAmount: 5400,
    total: 35400,
    paidAmount: 0,
    status: 'Sent',
    notes: 'Net 30 payment terms',
  },
];

export const mockReportData = {
  balanceSheet: {
    assets: [
      { name: 'Current Assets', amount: 1030000 },
      { name: 'Fixed Assets', amount: 850000 },
      { name: 'Other Assets', amount: 120000 },
    ],
    liabilities: [
      { name: 'Current Liabilities', amount: 350000 },
      { name: 'Long-term Liabilities', amount: 600000 },
    ],
    equity: [
      { name: 'Owner\'s Equity', amount: 1050000 },
    ],
  },
  profitLoss: {
    income: [
      { name: 'Sales Revenue', amount: 850000 },
      { name: 'Other Income', amount: 25000 },
    ],
    expenses: [
      { name: 'Cost of Goods Sold', amount: 450000 },
      { name: 'Operating Expenses', amount: 180000 },
      { name: 'Administrative Expenses', amount: 95000 },
    ],
  },
  stockReport: [
    { product: 'Executive Office Chair', quantity: 25, value: 375000 },
    { product: 'Wooden Dining Table', quantity: 15, value: 375000 },
    { product: 'Steel Bookshelf', quantity: 30, value: 255000 },
  ],
};