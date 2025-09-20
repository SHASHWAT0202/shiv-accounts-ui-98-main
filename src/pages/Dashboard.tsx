import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { TrendingUp, TrendingDown, Users, Package, DollarSign, AlertCircle, ShoppingCart, Receipt } from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { Button } from '@/components/ui/button';

import { useMemo, useCallback, useState } from 'react';

// Performance optimizations for large datasets
const ITEMS_PER_PAGE = 10;
const MAX_CHART_DATA_POINTS = 12;

export default function Dashboard() {
  const { state } = useAppStore();
  const [currentPage, setCurrentPage] = useState(1);
  
  // Optimized metrics calculation with better caching
  const metrics = useMemo(() => {
    // Use more efficient calculations for large datasets
    const invoiceMetrics = state.invoices.reduce((acc, invoice) => {
      acc.totalSales += invoice.total;
      acc.outstandingReceivables += Math.max(0, invoice.total - invoice.paidAmount);
      return acc;
    }, { totalSales: 0, outstandingReceivables: 0 });
    
    const outstandingPayables = state.vendorBills.reduce((s, b) => s + Math.max(0, b.amount - b.paidAmount), 0);
    const totalProducts = state.products.length;
    
    // Optimize contact counting with Set operations
    const customerSet = new Set();
    const vendorSet = new Set();
    
    state.contacts.forEach(contact => {
      if (contact.type !== 'Vendor') {
        customerSet.add(contact.id);
      }
      if (contact.type !== 'Customer') {
        vendorSet.add(contact.id);
      }
    });
    
    const totalCustomers = customerSet.size;
    const totalVendors = vendorSet.size;
    
    return { 
      ...invoiceMetrics,
      outstandingPayables, 
      totalCustomers, 
      totalVendors, 
      totalProducts 
    };
  }, [state.invoices, state.vendorBills, state.products, state.contacts]);

  // Paginated recent transactions with better performance
  const paginatedTransactions = useMemo(() => {
    // Only process recent data to improve performance
    const recentInvoices = state.invoices.slice(-100);
    const recentBills = state.vendorBills.slice(-100);
    const recentPayments = state.payments.slice(-100);
    
    const allTransactions = [
      ...recentInvoices.map(i => ({ 
        id: i.id, 
        type: 'Sale', 
        amount: i.total, 
        date: i.date, 
        description: `${i.invoiceNumber} - ${i.customerName}` 
      })),
      ...recentBills.map(b => ({ 
        id: b.id, 
        type: 'Purchase', 
        amount: b.amount, 
        date: b.date, 
        description: `${b.billNumber} - ${b.vendorName}` 
      })),
      ...recentPayments.map(p => ({ 
        id: p.id, 
        type: p.type === 'Received' ? 'Payment Received' : 'Payment Made', 
        amount: p.amount, 
        date: p.date, 
        description: p.reference 
      }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime());
    
    const totalPages = Math.ceil(allTransactions.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedData = allTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    
    return { transactions: paginatedData, totalPages, totalCount: allTransactions.length };
  }, [state.invoices, state.vendorBills, state.payments, currentPage]);

  // Optimized chart data with better performance and limited data points
  const chartData = useMemo(() => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const now = new Date();
    const buckets = Array.from({ length: MAX_CHART_DATA_POINTS }).map((_, idx) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (MAX_CHART_DATA_POINTS - 1 - idx), 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      return { key, label: `${months[d.getMonth()]}`, sales: 0, purchases: 0 };
    });
    
    const map = new Map(buckets.map(b => [b.key, b]));
    
    // Process only recent data for better performance
    const recentInvoices = state.invoices.slice(-1000);
    const recentBills = state.vendorBills.slice(-1000);
    
    recentInvoices.forEach(i => {
      const d = new Date(i.date);
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      const b = map.get(k);
      if (b) b.sales += i.total;
    });
    
    recentBills.forEach(bill => {
      const d = new Date(bill.date);
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      const b = map.get(k);
      if (b) b.purchases += bill.amount;
    });
    
    return Array.from(map.values());
  }, [state.invoices, state.vendorBills]);

  // Optimized pie data calculation
  const pieData = useMemo(() => {
    const today = new Date();
    const invoiceData = state.invoices.reduce((acc, invoice) => {
      const paid = Math.min(invoice.paidAmount, invoice.total);
      const outstanding = Math.max(0, invoice.total - invoice.paidAmount);
      
      acc.paid += paid;
      acc.outstanding += outstanding;
      
      if (invoice.dueDate < today && outstanding > 0) {
        acc.overdue += outstanding;
      }
      
      return acc;
    }, { paid: 0, outstanding: 0, overdue: 0 });
    
    return [
      { name: 'Paid', value: invoiceData.paid, color: 'hsl(var(--success))' },
      { name: 'Outstanding', value: invoiceData.outstanding, color: 'hsl(var(--warning))' },
      { name: 'Overdue', value: invoiceData.overdue, color: 'hsl(var(--destructive))' },
    ].filter(item => item.value > 0); // Only show non-zero values
  }, [state.invoices]);

  // Memoized currency formatter
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }, []);

  // Pagination handlers
  const handlePreviousPage = useCallback(() => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(paginatedTransactions.totalPages, prev + 1));
  }, [paginatedTransactions.totalPages]);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'Sale':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'Purchase':
        return <ShoppingCart className="h-4 w-4 text-primary" />;
      case 'Payment Received':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'Payment Made':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      default:
        return <Receipt className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back! Here's what's happening with your business today.
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-card-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(metrics.totalSales)}
            </div>
            <p className="text-xs text-muted-foreground">
              +12.5% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="border-card-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Receivables</CardTitle>
            <AlertCircle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {formatCurrency(metrics.outstandingReceivables)}
            </div>
            <p className="text-xs text-muted-foreground">
              From {metrics.totalCustomers} customers
            </p>
          </CardContent>
        </Card>

        <Card className="border-card-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Payables</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(metrics.outstandingPayables)}
            </div>
            <p className="text-xs text-muted-foreground">
              To {metrics.totalVendors} vendors
            </p>
          </CardContent>
        </Card>

        <Card className="border-card-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {metrics.totalProducts}
            </div>
            <p className="text-xs text-muted-foreground">
              Active in inventory
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sales vs Purchases Chart */}
        <Card className="border-card-border">
          <CardHeader>
            <CardTitle>Sales vs Purchases</CardTitle>
            <p className="text-sm text-muted-foreground">
              Monthly comparison for the last 6 months
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" />
                <YAxis />
                <Bar dataKey="sales" fill="hsl(var(--success))" name="Sales" />
                <Bar dataKey="purchases" fill="hsl(var(--primary))" name="Purchases" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Receivables Status */}
        <Card className="border-card-border">
          <CardHeader>
            <CardTitle>Receivables Status</CardTitle>
            <p className="text-sm text-muted-foreground">
              Current status of customer payments
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center space-x-4 mt-4">
              {pieData.map((entry, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm text-muted-foreground">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="border-card-border">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <p className="text-sm text-muted-foreground">
            Latest activity in your account
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransactions.transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getTransactionIcon(transaction.type)}
                      <Badge 
                        variant={
                          transaction.type.includes('Received') || transaction.type === 'Sale' 
                            ? 'default' 
                            : 'secondary'
                        }
                        className="text-xs"
                      >
                        {transaction.type}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {transaction.description}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {transaction.date.toLocaleDateString('en-IN')}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(transaction.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {/* Pagination Controls */}
          {paginatedTransactions.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, paginatedTransactions.totalCount)} of {paginatedTransactions.totalCount} transactions
              </div>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handlePreviousPage} 
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {paginatedTransactions.totalPages}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleNextPage} 
                  disabled={currentPage === paginatedTransactions.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}