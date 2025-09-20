import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  LineChart,
  Line,
} from 'recharts';
import { BarChart3, FileText, Package, TrendingUp } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/rbac';
import { useAppStore } from '@/store/AppStore';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];

export default function Reports() {
  const { user } = useAuth();
  const { state } = useAppStore();
  const [activeTab, setActiveTab] = useState('balance-sheet');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };
  // Compute quick metrics
  const ledgerTotals = useMemo(() => {
    const map = new Map<string, { debit: number; credit: number }>();
    for (const e of state.ledger) {
      const cur = map.get(e.accountId) || { debit: 0, credit: 0 };
      map.set(e.accountId, { debit: cur.debit + e.debit, credit: cur.credit + e.credit });
    }
    return map;
  }, [state.ledger]);

  type AccountWithComputed = (typeof state.accounts)[number] & { computedBalance: number };
  const accountBalances: AccountWithComputed[] = useMemo(() => {
    return state.accounts.map(acc => {
      const t = ledgerTotals.get(acc.id) || { debit: 0, credit: 0 };
      let balance = acc.balance;
      switch (acc.type) {
        case 'Asset':
          balance = acc.balance + t.debit - t.credit; break;
        case 'Liability':
        case 'Equity':
          balance = acc.balance - t.debit + t.credit; break;
        case 'Income':
          balance = t.credit - t.debit; break;
        case 'Expense':
          balance = t.debit - t.credit; break;
      }
      return { ...acc, computedBalance: balance };
    });
  }, [state.accounts, ledgerTotals]);

  const totalsByType = useMemo(() => {
    return accountBalances.reduce<Record<string, number>>((accum, a) => {
      const key = a.type;
      accum[key] = (accum[key] ?? 0) + a.computedBalance;
      return accum;
    }, {});
  }, [accountBalances]);

  const stockValue = useMemo(() => state.products.filter(p => p.type === 'Goods').reduce((s, p) => s + (p.stockQty ?? 0) * p.purchasePrice, 0), [state.products]);
  const netProfit = useMemo(() => (totalsByType['Income'] ?? 0) - (totalsByType['Expense'] ?? 0), [totalsByType]);

  // Group accounts for reporting
  const assetAccounts = useMemo(() => accountBalances.filter(a => a.type === 'Asset' && Math.abs(a.computedBalance) > 0), [accountBalances]);
  const liabilityAccounts = useMemo(() => accountBalances.filter(a => a.type === 'Liability' && Math.abs(a.computedBalance) > 0), [accountBalances]);
  const equityAccounts = useMemo(() => accountBalances.filter(a => a.type === 'Equity' && Math.abs(a.computedBalance) > 0), [accountBalances]);
  const incomeAccounts = useMemo(() => accountBalances.filter(a => a.type === 'Income' && Math.abs(a.computedBalance) > 0), [accountBalances]);
  const expenseAccounts = useMemo(() => accountBalances.filter(a => a.type === 'Expense' && Math.abs(a.computedBalance) > 0), [accountBalances]);

  const profitLossChartData = useMemo(() => [
    { name: 'Income', amount: totalsByType['Income'] ?? 0, type: 'income' as const },
    { name: 'Expenses', amount: -(totalsByType['Expense'] ?? 0), type: 'expense' as const },
  ], [totalsByType]);

  const stockRows = useMemo(() => {
    return state.products
      .filter(p => p.type === 'Goods')
      .map(p => ({
        product: p.name,
        quantity: p.stockQty ?? 0,
        value: (p.stockQty ?? 0) * p.purchasePrice,
      }));
  }, [state.products]);

  const stockChartData = useMemo(() => stockRows.map(item => ({
    name: item.product.length > 15 ? item.product.substring(0, 15) + '...' : item.product,
    quantity: item.quantity,
    value: item.value,
  })), [stockRows]);

  if (!hasPermission(user, 'reports:view')) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Access denied</h1>
        <p className="text-muted-foreground">You don’t have permission to view reports.</p>
      </div>
    );
  }

  const balanceSheetChartData = [
    { name: 'Assets', amount: Math.max(0, totalsByType['Asset'] ?? 0) },
    { name: 'Liabilities', amount: Math.max(0, totalsByType['Liability'] ?? 0) },
    { name: 'Equity', amount: Math.max(0, totalsByType['Equity'] ?? 0) },
  ];

  

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground mt-1">
          Financial insights and business analytics
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-card-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(Math.max(0, totalsByType['Asset'] ?? 0))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-card-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Liabilities</CardTitle>
            <BarChart3 className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(Math.max(0, totalsByType['Liability'] ?? 0))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-card-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(netProfit)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-card-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Value</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(stockValue)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
          <TabsTrigger value="profit-loss">Profit & Loss</TabsTrigger>
          <TabsTrigger value="stock-report">Stock Report</TabsTrigger>
        </TabsList>

        {/* Balance Sheet */}
        <TabsContent value="balance-sheet" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-card-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Balance Sheet Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Assets */}
                  <div>
                    <h3 className="font-semibold text-success mb-3">Assets</h3>
                    <Table>
                      <TableBody>
                        {assetAccounts.map((acc) => (
                          <TableRow key={acc.id}>
                            <TableCell className="py-2">{acc.name}</TableCell>
                            <TableCell className="text-right py-2 font-medium">
                              {formatCurrency(acc.computedBalance)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="border-t-2">
                          <TableCell className="py-2 font-semibold">Total Assets</TableCell>
                          <TableCell className="text-right py-2 font-bold text-success">
                            {formatCurrency(Math.max(0, totalsByType['Asset'] ?? 0))}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  {/* Liabilities */}
                  <div>
                    <h3 className="font-semibold text-destructive mb-3">Liabilities</h3>
                    <Table>
                      <TableBody>
                        {liabilityAccounts.map((acc) => (
                          <TableRow key={acc.id}>
                            <TableCell className="py-2">{acc.name}</TableCell>
                            <TableCell className="text-right py-2 font-medium">
                              {formatCurrency(acc.computedBalance)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Equity */}
                  <div>
                    <h3 className="font-semibold text-primary mb-3">Equity</h3>
                    <Table>
                      <TableBody>
                        {equityAccounts.map((acc) => (
                          <TableRow key={acc.id}>
                            <TableCell className="py-2">{acc.name}</TableCell>
                            <TableCell className="text-right py-2 font-medium">
                              {formatCurrency(acc.computedBalance)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-card-border">
              <CardHeader>
                <CardTitle>Balance Sheet Chart</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={balanceSheetChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Bar dataKey="amount" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Profit & Loss */}
        <TabsContent value="profit-loss" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-card-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Profit & Loss Statement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Income */}
                  <div>
                    <h3 className="font-semibold text-success mb-3">Income</h3>
                    <Table>
                      <TableBody>
                        {incomeAccounts.map((acc) => (
                          <TableRow key={acc.id}>
                            <TableCell className="py-2">{acc.name}</TableCell>
                            <TableCell className="text-right py-2 font-medium text-success">
                              {formatCurrency(acc.computedBalance)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="border-t">
                          <TableCell className="py-2 font-semibold">Total Income</TableCell>
                          <TableCell className="text-right py-2 font-bold text-success">
                            {formatCurrency(Math.max(0, totalsByType['Income'] ?? 0))}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  {/* Expenses */}
                  <div>
                    <h3 className="font-semibold text-destructive mb-3">Expenses</h3>
                    <Table>
                      <TableBody>
                        {expenseAccounts.map((acc) => (
                          <TableRow key={acc.id}>
                            <TableCell className="py-2">{acc.name}</TableCell>
                            <TableCell className="text-right py-2 font-medium text-destructive">
                              {formatCurrency(acc.computedBalance)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="border-t">
                          <TableCell className="py-2 font-semibold">Total Expenses</TableCell>
                          <TableCell className="text-right py-2 font-bold text-destructive">
                            {formatCurrency(Math.max(0, totalsByType['Expense'] ?? 0))}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  {/* Net Profit */}
                  <div className="border-t-2 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold">Net Profit</span>
                      <span className="text-lg font-bold text-success">
                        {formatCurrency(netProfit)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-card-border">
              <CardHeader>
                <CardTitle>Income vs Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={profitLossChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Bar dataKey="amount">
                      {profitLossChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.type === 'income' ? 'hsl(var(--success))' : 'hsl(var(--destructive))'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Stock Report */}
        <TabsContent value="stock-report" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-card-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Current Stock
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-center">Quantity</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockRows.map((stock, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{stock.product}</TableCell>
                        <TableCell className="text-center">{stock.quantity}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(stock.value)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2">
                      <TableCell className="font-bold">Total Stock Value</TableCell>
                      <TableCell className="text-center font-bold">
                        {stockRows.reduce((sum, stock) => sum + stock.quantity, 0)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {formatCurrency(stockRows.reduce((sum, stock) => sum + stock.value, 0))}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="border-card-border">
              <CardHeader>
                <CardTitle>Stock Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={stockChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stockChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-1 gap-2 mt-4">
                  {stockChartData.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span>{entry.name}</span>
                      </div>
                      <span className="font-medium">{formatCurrency(entry.value)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}