import { useMemo, useState } from 'react';
import { Plus, Search, Edit2, Eye, FileText, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { Invoice, InvoiceItem, Payment } from '@/types';
import { useAppStore, postLedgerEntries } from '@/store/AppStore';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/rbac';
import { 
  initiateRazorpayPayment, 
  createPaymentFromRazorpay, 
  verifyPaymentSignature, 
  isRazorpayAvailable 
} from '@/lib/razorpay';

export default function Invoices() {
  const { state, dispatch } = useAppStore();
  const { user } = useAuth();
  const canEdit = hasPermission(user, 'transactions:edit');
  const isContactMaster = user?.role === 'ContactMaster';
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<{ customerId: string; date: string; dueDate: string; notes?: string }>(
    { customerId: '', date: new Date().toISOString().substring(0,10), dueDate: new Date().toISOString().substring(0,10), notes: '' }
  );
  const [items, setItems] = useState<Array<{ productId: string; qty: string; unitPrice: string; taxPct: string }>>([]);
  const { toast } = useToast();

  const customers = useMemo(() => state.contacts.filter(c => c.type === 'Customer' || c.type === 'Both'), [state.contacts]);
  const goods = useMemo(() => state.products.filter(p => p.type === 'Goods'), [state.products]);

  const visibleInvoices = isContactMaster && user?.contactId
    ? state.invoices.filter(i => i.customerId === user.contactId)
    : state.invoices;

  const filtered = visibleInvoices.filter(inv =>
    inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);

  const openCreate = () => {
    setForm({ customerId: '', date: new Date().toISOString().substring(0,10), dueDate: new Date().toISOString().substring(0,10), notes: '' });
    setItems([]);
    setFormOpen(true);
  };

  const totals = () => {
    let subtotal = 0; let taxAmount = 0;
    items.forEach(it => {
      const qty = parseFloat(it.qty || '0');
      const price = parseFloat(it.unitPrice || '0');
      const line = qty * price;
      subtotal += line;
      const tax = parseFloat(it.taxPct || '0');
      taxAmount += line * (tax/100);
    });
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  };

  const saveInvoice = async () => {
    const cust = customers.find(c => c.id === form.customerId);
    if (!cust) {
      toast({ title: 'Select customer', description: 'Please select a customer to continue' });
      return;
    }
    const invItems: InvoiceItem[] = items.map((it, idx) => {
      const prod = state.products.find(p => p.id === it.productId)!;
      const qty = parseFloat(it.qty || '0');
      const unitPrice = parseFloat(it.unitPrice || '0');
      return {
        id: `${Date.now()}-${idx}`,
        productId: prod.id,
        productName: prod.name,
        quantity: qty,
        unitPrice,
        taxPercentage: parseFloat(it.taxPct || '0'),
        amount: qty * unitPrice,
      };
    });
    const t = totals();
    const invoice: Invoice = {
      id: `INV-${Date.now()}`,
      invoiceNumber: `INV-${Math.floor(Math.random()*10000).toString().padStart(4,'0')}`,
      customerId: cust.id,
      customerName: cust.name,
      date: new Date(form.date),
      dueDate: new Date(form.dueDate),
      items: invItems,
      subtotal: t.subtotal,
      taxAmount: t.taxAmount,
      total: t.total,
      paidAmount: 0,
      status: 'Sent',
      notes: form.notes,
    };
    dispatch({ type: 'invoices/set', payload: [invoice, ...state.invoices] });
    if (supabase) {
      try {
  await db.insert('invoices', invoice as unknown as Record<string, unknown>);
  await db.insertMany('invoice_items', invItems.map(it => ({ ...it, invoiceId: invoice.id })) as unknown as Record<string, unknown>[]);
      } catch (e) {
        console.warn('Failed to persist invoice to Supabase', e);
      }
    }
    dispatch({ type: 'audit/append', payload: { id: `audit-${Date.now()}`, entityType: 'Invoice', entityId: invoice.id, action: 'create', timestamp: new Date() } });
    toast({ title: 'Invoice created', description: invoice.invoiceNumber });
    setFormOpen(false);
  };

  const postInvoice = async (inv: Invoice) => {
    const ar = state.accounts.find(a => a.name.toLowerCase().includes('accounts receivable'));
    const sales = state.accounts.find(a => a.type === 'Income');
    const cogs = state.accounts.find(a => a.name.toLowerCase().includes('cost of goods') || a.code.startsWith('E'));
    const inventory = state.accounts.find(a => a.name.toLowerCase().includes('inventory'));
    if (!ar || !sales || !cogs || !inventory) return;

    const entries = postLedgerEntries([
      // Revenue
      { accountId: ar.id, accountName: ar.name, debit: inv.total, credit: 0 },
      { accountId: sales.id, accountName: sales.name, debit: 0, credit: inv.total },
    ], { referenceType: 'Invoice', referenceId: inv.id, description: `Invoice ${inv.invoiceNumber} - ${inv.customerName}` });

    // COGS and Inventory movement
    const totalCost = inv.items.reduce((sum, it) => {
      const prod = state.products.find(p => p.id === it.productId);
      const cost = (prod?.purchasePrice ?? 0) * it.quantity;
      return sum + cost;
    }, 0);

    const cogsEntries = postLedgerEntries([
      { accountId: cogs.id, accountName: cogs.name, debit: totalCost, credit: 0 },
      { accountId: inventory.id, accountName: inventory.name, debit: 0, credit: totalCost },
    ], { referenceType: 'Invoice', referenceId: inv.id, description: `COGS for ${inv.invoiceNumber}` });

    dispatch({ type: 'ledger/append', payload: [...entries, ...cogsEntries] });
    if (supabase) {
      try { await db.insertMany('ledger', [...entries, ...cogsEntries]); } catch (e) { console.warn('Failed to persist ledger', e); }
    }

    // Reduce stock
    const updatedProducts = state.products.map(p => {
      const outQty = inv.items.filter(i => i.productId === p.id).reduce((s, i) => s + i.quantity, 0);
      if (outQty > 0 && p.type === 'Goods') {
        return { ...p, stockQty: Math.max(0, (p.stockQty ?? 0) - outQty) };
      }
      return p;
    });
    dispatch({ type: 'products/set', payload: updatedProducts });
    if (supabase) {
      try {
        for (const p of updatedProducts) {
          const original = state.products.find(op => op.id === p.id);
          if (original && original.stockQty !== p.stockQty) {
            await db.update('products', 'id', p.id, { stockQty: p.stockQty });
          }
        }
      } catch (e) { console.warn('Failed to update product stock', e); }
    }
    dispatch({ type: 'audit/append', payload: { id: `audit-${Date.now()}`, entityType: 'Invoice', entityId: inv.id, action: 'post', timestamp: new Date() } });
    toast({ title: 'Posted to ledger', description: 'Revenue, COGS, and Inventory updated' });
  };

  const handleRazorpayPayment = async (invoice: Invoice) => {
    if (!isRazorpayAvailable()) {
      toast({ title: 'Payment unavailable', description: 'Razorpay is not configured.', variant: 'destructive' });
      return;
    }

    const remainingAmount = invoice.total - invoice.paidAmount;
    if (remainingAmount <= 0) {
      toast({ title: 'Payment complete', description: 'This invoice is already fully paid.', variant: 'destructive' });
      return;
    }

    try {
      await initiateRazorpayPayment(
        invoice,
        async (razorpayResponse) => {
          // Verify payment signature
          const isValidSignature = verifyPaymentSignature(
            razorpayResponse.razorpay_payment_id,
            razorpayResponse.razorpay_order_id,
            razorpayResponse.razorpay_signature
          );

          if (!isValidSignature) {
            toast({ title: 'Payment verification failed', description: 'Payment signature is invalid.', variant: 'destructive' });
            return;
          }

          // Create payment record
          const paymentData = createPaymentFromRazorpay(invoice, razorpayResponse, remainingAmount);
          const payment: Payment = {
            id: `payment-${Date.now()}`,
            ...paymentData,
          };

          // Update invoice paid amount and status
          const updatedInvoice = {
            ...invoice,
            paidAmount: invoice.paidAmount + remainingAmount,
            status: (invoice.paidAmount + remainingAmount >= invoice.total) ? 'Paid' as const : 'Partially Paid' as const,
          };

          // Update state
          const updatedInvoices = state.invoices.map(i => i.id === invoice.id ? updatedInvoice : i);
          const updatedPayments = [payment, ...state.payments];
          
          dispatch({ type: 'invoices/set', payload: updatedInvoices });
          dispatch({ type: 'payments/set', payload: updatedPayments });

          // Post payment to ledger
          const cash = state.accounts.find(a => a.name.toLowerCase().includes('cash'));
          const ar = state.accounts.find(a => a.name.toLowerCase().includes('accounts receivable'));
          
          if (cash && ar) {
            const entries = postLedgerEntries([
              { accountId: cash.id, accountName: cash.name, debit: remainingAmount, credit: 0 },
              { accountId: ar.id, accountName: ar.name, debit: 0, credit: remainingAmount },
            ], { 
              referenceType: 'Payment', 
              referenceId: payment.id, 
              description: `Payment received for ${invoice.invoiceNumber} via Razorpay` 
            });
            dispatch({ type: 'ledger/append', payload: entries });

            // Persist to Supabase
            if (supabase) {
              try {
                await db.insert('payments', payment as unknown as Record<string, unknown>);
                await db.update('invoices', 'id', invoice.id, { paidAmount: updatedInvoice.paidAmount, status: updatedInvoice.status });
                await db.insertMany('ledger', entries);
              } catch (e) {
                console.warn('Failed to persist payment to Supabase', e);
              }
            }
          }

          toast({ 
            title: 'Payment successful!', 
            description: `₹${remainingAmount.toLocaleString()} received via Razorpay` 
          });
        },
        (error) => {
          console.error('Razorpay payment error:', error);
          toast({ 
            title: 'Payment failed', 
            description: error.message || 'Payment could not be processed.', 
            variant: 'destructive' 
          });
        }
      );
    } catch (error: unknown) {
      console.error('Payment initialization error:', error);
      toast({ 
        title: 'Payment initialization failed', 
        description: (error as { message?: string })?.message || 'Could not initialize payment.', 
        variant: 'destructive' 
      });
    }
  };

  const getStatusVariant = (s: Invoice['status']) => s === 'Paid' ? 'default' : s === 'Partially Paid' ? 'outline' : s === 'Overdue' ? 'destructive' : 'secondary';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Invoices</h1>
          <p className="text-muted-foreground mt-1">Create customer invoices and post to ledger/inventory</p>
        </div>
  <Button onClick={openCreate} disabled={!canEdit}><Plus className="h-4 w-4 mr-2" />Create Invoice</Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search invoices..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
      </div>

      <div className="border border-border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Due</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(inv => (
              <TableRow key={inv.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <FileText className="h-4 w-4" />
                    </div>
                    <span className="font-medium">{inv.invoiceNumber}</span>
                  </div>
                </TableCell>
                <TableCell className="font-medium">{inv.customerName}</TableCell>
                <TableCell className="text-muted-foreground">{inv.date.toLocaleDateString('en-IN')}</TableCell>
                <TableCell className="text-muted-foreground">{inv.dueDate.toLocaleDateString('en-IN')}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(inv.total)}</TableCell>
                <TableCell><Badge variant={getStatusVariant(inv.status)}>{inv.status}</Badge></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => { setSelected(inv); setIsDialogOpen(true); }}><Eye className="h-4 w-4" /></Button>
                    {canEdit && <Button size="sm" variant="ghost" onClick={() => postInvoice(inv)}>Post</Button>}
                    {/* Pay Now button for unpaid/partially paid invoices */}
                    {isRazorpayAvailable() && inv.paidAmount < inv.total && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleRazorpayPayment(inv)}
                        className="text-green-600 border-green-300 hover:bg-green-50"
                      >
                        <CreditCard className="h-4 w-4 mr-1" />
                        Pay Now
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" disabled={!canEdit}><Edit2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[650px]">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>Invoice Details</DialogTitle>
                <DialogDescription>{selected.invoiceNumber} - {selected.customerName}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium">Date</span>
                    <p className="text-muted-foreground">{selected.date.toLocaleDateString('en-IN')}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Due</span>
                    <p className="text-muted-foreground">{selected.dueDate.toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium">Items</span>
                  <Table className="mt-2">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selected.items.map(it => (
                        <TableRow key={it.id}>
                          <TableCell>{it.productName}</TableCell>
                          <TableCell className="text-center">{it.quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(it.unitPrice)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(it.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(selected.subtotal)}</span></div>
                  <div className="flex justify-between"><span>Tax</span><span>{formatCurrency(selected.taxAmount)}</span></div>
                  <div className="flex justify-between font-bold"><span>Total</span><span>{formatCurrency(selected.total)}</span></div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create form */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
            <DialogDescription>Select customer and add items</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer</Label>
                <Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Items</Label>
                <Button size="sm" variant="outline" onClick={() => setItems([...items, { productId: goods[0]?.id ?? '', qty: '1', unitPrice: (goods[0]?.salesPrice ?? 0).toString(), taxPct: (goods[0]?.taxPercentage ?? 0).toString() }])}>Add Item</Button>
              </div>
              <div className="space-y-2">
                {items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-5 gap-2 items-end">
                    <div>
                      <Label className="text-xs">Product</Label>
                      <Select value={it.productId} onValueChange={(v) => {
                        const p = state.products.find(pp => pp.id === v);
                        const copy = [...items];
                        copy[idx] = {
                          productId: v,
                          qty: it.qty,
                          unitPrice: p ? p.salesPrice.toString() : it.unitPrice,
                          taxPct: p ? p.taxPercentage.toString() : it.taxPct,
                        };
                        setItems(copy);
                      }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {goods.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Qty</Label>
                      <Input value={it.qty} onChange={(e) => { const copy = [...items]; copy[idx].qty = e.target.value; setItems(copy); }} />
                    </div>
                    <div>
                      <Label className="text-xs">Unit Price</Label>
                      <Input value={it.unitPrice} onChange={(e) => { const copy = [...items]; copy[idx].unitPrice = e.target.value; setItems(copy); }} />
                    </div>
                    <div>
                      <Label className="text-xs">Tax %</Label>
                      <Input value={it.taxPct} onChange={(e) => { const copy = [...items]; copy[idx].taxPct = e.target.value; setItems(copy); }} />
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Amount</div>
                      <div className="font-medium">{formatCurrency(parseFloat(it.qty||'0') * parseFloat(it.unitPrice||'0'))}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-2 space-y-1">
              {(() => { const t = totals(); return (
                <>
                  <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(t.subtotal)}</span></div>
                  <div className="flex justify-between"><span>Tax</span><span>{formatCurrency(t.taxAmount)}</span></div>
                  <div className="flex justify-between font-bold"><span>Total</span><span>{formatCurrency(t.total)}</span></div>
                </>
              ); })()}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button onClick={saveInvoice} disabled={!canEdit}>Save Invoice</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
