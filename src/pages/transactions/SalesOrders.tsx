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
import type { SalesOrder, SalesOrderItem } from '@/types';
import { useAppStore } from '@/store/AppStore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/rbac';

export default function SalesOrders() {
  const { state, dispatch } = useAppStore();
  const { user } = useAuth();
  const canEdit = hasPermission(user, 'transactions:edit');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selected, setSelected] = useState<SalesOrder | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<{ customerId: string; date: string; notes?: string }>(
    { customerId: '', date: new Date().toISOString().substring(0,10), notes: '' }
  );
  const [items, setItems] = useState<Array<{ productId: string; qty: string; unitPrice: string; taxPct: string }>>([]);
  const { toast } = useToast();

  const customers = useMemo(() => state.contacts.filter(c => c.type === 'Customer' || c.type === 'Both'), [state.contacts]);
  const goods = useMemo(() => state.products.filter(p => p.type === 'Goods'), [state.products]);

  const orders = state.salesOrders;
  const filtered = orders.filter(o =>
    o.soNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);

  const openCreate = () => {
    setForm({ customerId: '', date: new Date().toISOString().substring(0,10), notes: '' });
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

  const saveOrder = () => {
    const cust = customers.find(c => c.id === form.customerId);
    if (!cust) { toast({ title: 'Select customer', description: 'Please select a customer' }); return; }
    const soItems: SalesOrderItem[] = items.map((it, idx) => {
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
    const order: SalesOrder = {
      id: `SO-${Date.now()}`,
      soNumber: `SO-${Math.floor(Math.random()*10000).toString().padStart(4,'0')}`,
      customerId: cust.id,
      customerName: cust.name,
      date: new Date(form.date),
      items: soItems,
      subtotal: t.subtotal,
      taxAmount: t.taxAmount,
      total: t.total,
      status: 'Draft',
    };
    dispatch({ type: 'salesOrders/set', payload: [order, ...state.salesOrders] });
    toast({ title: 'Sales order created', description: order.soNumber });
    setFormOpen(false);
  };

  const setStatus = (order: SalesOrder, status: SalesOrder['status']) => {
    const updated = state.salesOrders.map(s => s.id === order.id ? { ...s, status } : s);
    dispatch({ type: 'salesOrders/set', payload: updated });
  };

  const getVariant = (s: SalesOrder['status']) => s === 'Draft' ? 'secondary' : s === 'Confirmed' ? 'outline' : s === 'Invoiced' ? 'default' : s === 'Delivered' ? 'default' : s === 'Cancelled' ? 'destructive' : 'secondary';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sales Orders</h1>
          <p className="text-muted-foreground mt-1">Create and manage customer orders</p>
        </div>
        <Button onClick={openCreate} disabled={!canEdit}><Plus className="h-4 w-4 mr-2" />Create Order</Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search orders..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
      </div>

      <div className="border border-border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SO #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(o => (
              <TableRow key={o.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <FileText className="h-4 w-4" />
                    </div>
                    <span className="font-medium">{o.soNumber}</span>
                  </div>
                </TableCell>
                <TableCell className="font-medium">{o.customerName}</TableCell>
                <TableCell className="text-muted-foreground">{o.date.toLocaleDateString('en-IN')}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(o.total)}</TableCell>
                <TableCell><Badge variant={getVariant(o.status)}>{o.status}</Badge></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => { setSelected(o); setIsDialogOpen(true); }}><Eye className="h-4 w-4" /></Button>
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
                <DialogTitle>Sales Order Details</DialogTitle>
                <DialogDescription>{selected.soNumber} - {selected.customerName}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium">Date</span>
                    <p className="text-muted-foreground">{selected.date.toLocaleDateString('en-IN')}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Status</span>
                    <p className="text-muted-foreground">{selected.status}</p>
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
                <div className="flex gap-2">
                  <Button variant="outline" disabled={!canEdit || selected.status !== 'Draft'} onClick={() => setStatus(selected, 'Confirmed')}>Confirm</Button>
                  <Button variant="outline" disabled={!canEdit || (selected.status !== 'Confirmed' && selected.status !== 'Draft')} onClick={() => setStatus(selected, 'Invoiced')}>Mark Invoiced</Button>
                  <Button variant="outline" disabled={!canEdit} onClick={() => setStatus(selected, 'Cancelled')}>Cancel</Button>
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
            <DialogTitle>Create Sales Order</DialogTitle>
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
              <div className="space-y-2 col-span-2">
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
              <Button onClick={saveOrder} disabled={!canEdit}>Save Order</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
