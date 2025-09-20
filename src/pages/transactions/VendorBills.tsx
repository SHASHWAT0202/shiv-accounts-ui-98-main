import { useMemo, useState } from 'react';
import { Plus, Search, Edit2, Eye, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { BillItem, VendorBill } from '@/types';
import { useAppStore, postLedgerEntries } from '@/store/AppStore';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/rbac';

export default function VendorBills() {
  const { state, dispatch } = useAppStore();
  const { user } = useAuth();
  const canEdit = hasPermission(user, 'transactions:edit');
  const isContactMaster = user?.role === 'ContactMaster';
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<VendorBill | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<{ vendorId: string; date: string; dueDate: string; notes?: string }>(
    { vendorId: '', date: new Date().toISOString().substring(0,10), dueDate: new Date().toISOString().substring(0,10), notes: '' }
  );
  const [items, setItems] = useState<Array<{ productId: string; qty: string; unitPrice: string; taxPct: string }>>([]);
  const { toast } = useToast();

  const vendors = useMemo(() => state.contacts.filter(c => c.type === 'Vendor' || c.type === 'Both'), [state.contacts]);
  const goods = useMemo(() => state.products.filter(p => p.type === 'Goods'), [state.products]);

  const vendorBills: VendorBill[] = (isContactMaster && user?.contactId)
    ? (state.vendorBills ?? []).filter(b => b.vendorId === user.contactId)
    : (state.vendorBills ?? []);

  const filtered = vendorBills.filter(b =>
    b.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);

  const openCreate = () => {
    setForm({ vendorId: '', date: new Date().toISOString().substring(0,10), dueDate: new Date().toISOString().substring(0,10), notes: '' });
    setItems([]);
    setFormOpen(true);
  };

  const computeTotals = () => {
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

  const saveBill = async () => {
    const vendor = vendors.find(v => v.id === form.vendorId);
    if (!vendor) {
      toast({ title: 'Select vendor', description: 'Please select a vendor to continue' });
      return;
    }
    const billItems: BillItem[] = items.map((it, idx) => {
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
    const totals = computeTotals();
    const bill: VendorBill = {
      id: `BILL-${Date.now()}`,
      billNumber: `BILL-${Math.floor(Math.random()*10000).toString().padStart(4,'0')}`,
      vendorId: vendor.id,
      vendorName: vendor.name,
      date: new Date(form.date),
      dueDate: new Date(form.dueDate),
      amount: totals.total,
      paidAmount: 0,
      status: 'Unpaid',
      items: billItems,
      notes: form.notes,
    };

  const current = state.vendorBills ?? [];
  dispatch({ type: 'vendorBills/set', payload: [bill, ...current] });
  if (supabase) {
    try {
      await db.insert('vendor_bills', bill as unknown as Record<string, unknown>);
      await db.insertMany('bill_items', billItems.map(it => ({ ...it, billId: bill.id })) as unknown as Record<string, unknown>[]);
    } catch (e) { console.warn('Failed to persist bill', e); }
  }
  dispatch({ type: 'audit/append', payload: { id: `audit-${Date.now()}`, entityType: 'VendorBill', entityId: bill.id, action: 'create', timestamp: new Date() } });
    toast({ title: 'Vendor bill created', description: bill.billNumber });
    setFormOpen(false);
  };

  const postToLedgerAndInventory = async (bill: VendorBill) => {
    // Inventory (Debit) and Accounts Payable (Credit)
    const inventory = state.accounts.find(a => a.name.toLowerCase().includes('inventory'));
    const ap = state.accounts.find(a => a.name.toLowerCase().includes('accounts payable'));
    if (!inventory || !ap) return;

    const entries = postLedgerEntries([
      { accountId: inventory.id, accountName: inventory.name, debit: bill.amount, credit: 0 },
      { accountId: ap.id, accountName: ap.name, debit: 0, credit: bill.amount },
    ], { referenceType: 'Bill', referenceId: bill.id, description: `Bill ${bill.billNumber} - ${bill.vendorName}` });
  dispatch({ type: 'ledger/append', payload: entries });
  if (supabase) { try { await db.insertMany('ledger', entries as unknown as Record<string, unknown>[]); } catch (e) { console.warn('Failed to persist ledger', e); } }

    // Increase stock quantities for goods
    const updatedProducts = state.products.map(p => {
      const lineQty = bill.items.filter(i => i.productId === p.id).reduce((s, i) => s + i.quantity, 0);
      if (lineQty > 0 && p.type === 'Goods') {
        return { ...p, stockQty: (p.stockQty ?? 0) + lineQty };
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
      } catch (e) { console.warn('Failed to update stock', e); }
    }
    dispatch({ type: 'audit/append', payload: { id: `audit-${Date.now()}`, entityType: 'VendorBill', entityId: bill.id, action: 'post', timestamp: new Date() } });
    toast({ title: 'Posted to ledger', description: 'Inventory and Payables updated' });
  };

  const getStatusVariant = (status: VendorBill['status']) => {
    switch (status) {
      case 'Unpaid': return 'secondary';
      case 'Partially Paid': return 'outline';
      case 'Paid': return 'default';
      case 'Overdue': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Vendor Bills</h1>
          <p className="text-muted-foreground mt-1">Record vendor bills and update ledger/inventory</p>
        </div>
  <Button onClick={openCreate} disabled={!canEdit}>
          <Plus className="h-4 w-4 mr-2" />
          Create Bill
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search bills..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
      </div>

      <div className="border border-border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bill #</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Due</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(bill => (
              <TableRow key={bill.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <FileText className="h-4 w-4" />
                    </div>
                    <span className="font-medium">{bill.billNumber}</span>
                  </div>
                </TableCell>
                <TableCell className="font-medium">{bill.vendorName}</TableCell>
                <TableCell className="text-muted-foreground">{bill.date.toLocaleDateString('en-IN')}</TableCell>
                <TableCell className="text-muted-foreground">{bill.dueDate.toLocaleDateString('en-IN')}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(bill.amount)}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(bill.status)}>{bill.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => { setSelectedBill(bill); setIsDialogOpen(true); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {canEdit && (
                      <Button size="sm" variant="ghost" onClick={() => postToLedgerAndInventory(bill)}>
                        Post
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" disabled={!canEdit}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[650px]">
          {selectedBill && (
            <>
              <DialogHeader>
                <DialogTitle>Bill Details</DialogTitle>
                <DialogDescription>{selectedBill.billNumber} - {selectedBill.vendorName}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium">Date</span>
                    <p className="text-muted-foreground">{selectedBill.date.toLocaleDateString('en-IN')}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Due</span>
                    <p className="text-muted-foreground">{selectedBill.dueDate.toLocaleDateString('en-IN')}</p>
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
                      {selectedBill.items.map(it => (
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
                  <div className="flex justify-between"><span>Amount</span><span>{formatCurrency(selectedBill.amount)}</span></div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Simple create form */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Create Vendor Bill</DialogTitle>
            <DialogDescription>Enter vendor and items</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vendor</Label>
                <Select value={form.vendorId} onValueChange={(v) => setForm({ ...form, vendorId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
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
                <Button size="sm" variant="outline" onClick={() => setItems([...items, { productId: goods[0]?.id ?? '', qty: '1', unitPrice: (goods[0]?.purchasePrice ?? 0).toString(), taxPct: (goods[0]?.taxPercentage ?? 0).toString() }])}>Add Item</Button>
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
                          unitPrice: p ? p.purchasePrice.toString() : it.unitPrice,
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
                      <div className="font-medium">
                        {formatCurrency(parseFloat(it.qty||'0') * parseFloat(it.unitPrice||'0'))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-2 space-y-1">
              {(() => { const t = computeTotals(); return (
                <>
                  <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(t.subtotal)}</span></div>
                  <div className="flex justify-between"><span>Tax</span><span>{formatCurrency(t.taxAmount)}</span></div>
                  <div className="flex justify-between font-bold"><span>Total</span><span>{formatCurrency(t.total)}</span></div>
                </>
              ); })()}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button onClick={saveBill} disabled={!canEdit}>Save Bill</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
