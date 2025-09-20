import { useMemo, useState } from 'react';
import { Plus, Search, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { Payment } from '@/types';
import { useAppStore, postLedgerEntries } from '@/store/AppStore';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/rbac';

export default function Payments() {
  const { state, dispatch } = useAppStore();
  const { user } = useAuth();
  const canEdit = hasPermission(user, 'transactions:edit');
  const canMakePayments = hasPermission(user, 'payments:make');
  const isContactMaster = user?.role === 'ContactMaster';
  const [searchTerm, setSearchTerm] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<{ type: Payment['type']; contactId: string; amount: string; method: Payment['method']; reference: string; linkType: 'Invoice'|'Bill'|''; linkId: string; notes?: string }>(
    { type: 'Received', contactId: '', amount: '', method: 'Cash', reference: '', linkType: '', linkId: '', notes: '' }
  );
  const { toast } = useToast();

  const customers = useMemo(() => {
    const base = state.contacts.filter(c => c.type !== 'Vendor');
    if (isContactMaster && user?.contactId) return base.filter(c => c.id === user.contactId);
    return base;
  }, [state.contacts, isContactMaster, user?.contactId]);
  const vendors = useMemo(() => {
    const base = state.contacts.filter(c => c.type !== 'Customer');
    if (isContactMaster && user?.contactId) return base.filter(c => c.id === user.contactId);
    return base;
  }, [state.contacts, isContactMaster, user?.contactId]);

  const payments = isContactMaster && user?.contactId
    ? state.payments.filter(p => p.contactId === user.contactId)
    : state.payments;
  const filtered = payments.filter(p =>
    p.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);

  const openCreate = () => {
    setForm({ type: 'Received', contactId: '', amount: '', method: 'Cash', reference: '', linkType: '', linkId: '', notes: '' });
    setFormOpen(true);
  };

  const savePayment = async () => {
    const amount = parseFloat(form.amount || '0');
    if (!amount || !form.contactId) {
      toast({ title: 'Missing info', description: 'Contact and amount are required' });
      return;
    }
    const contact = state.contacts.find(c => c.id === form.contactId)!;
    const payment: Payment = {
      id: `PMT-${Date.now()}`,
      type: form.type,
      amount,
      date: new Date(),
      method: form.method,
      reference: form.reference || `PMT-${Math.floor(Math.random()*10000).toString().padStart(4,'0')}`,
      contactId: contact.id,
      contactName: contact.name,
      invoiceId: form.linkType === 'Invoice' ? form.linkId : undefined,
      billId: form.linkType === 'Bill' ? form.linkId : undefined,
      notes: form.notes,
    };

    // Ledger postings
    const cash = state.accounts.find(a => a.name.toLowerCase().includes('cash')) || state.accounts.find(a => a.type === 'Asset');
    const ar = state.accounts.find(a => a.name.toLowerCase().includes('accounts receivable'));
    const ap = state.accounts.find(a => a.name.toLowerCase().includes('accounts payable'));
    if (!cash || !ar || !ap) {
      toast({ title: 'Accounts missing', description: 'Ensure Cash, Accounts Receivable and Accounts Payable accounts exist' });
    } else {
      if (payment.type === 'Received') {
        const entries = postLedgerEntries([
          { accountId: cash.id, accountName: cash.name, debit: payment.amount, credit: 0 },
          { accountId: ar.id, accountName: ar.name, debit: 0, credit: payment.amount },
        ], { referenceType: 'Payment', referenceId: payment.id, description: `Payment received from ${payment.contactName}` });
  dispatch({ type: 'ledger/append', payload: entries });
  if (supabase) { try { await db.insertMany('ledger', entries as unknown as Record<string, unknown>[]); } catch (e) { console.warn('Failed to persist ledger', e); } }
      } else {
        const entries = postLedgerEntries([
          { accountId: ap.id, accountName: ap.name, debit: payment.amount, credit: 0 },
          { accountId: cash.id, accountName: cash.name, debit: 0, credit: payment.amount },
        ], { referenceType: 'Payment', referenceId: payment.id, description: `Payment made to ${payment.contactName}` });
  dispatch({ type: 'ledger/append', payload: entries });
  if (supabase) { try { await db.insertMany('ledger', entries as unknown as Record<string, unknown>[]); } catch (e) { console.warn('Failed to persist ledger', e); } }
      }
    }

    // Apply to invoice/bill
    if (payment.invoiceId) {
      const invoices = state.invoices.map(inv => inv.id === payment.invoiceId
        ? { ...inv, paidAmount: inv.paidAmount + payment.amount, status: inv.paidAmount + payment.amount >= inv.total ? 'Paid' : 'Partially Paid' }
        : inv);
      dispatch({ type: 'invoices/set', payload: invoices as typeof state.invoices });
      if (supabase) {
        try { await db.update('invoices', 'id', payment.invoiceId, { paidAmount: invoices.find(i => i.id === payment.invoiceId)?.paidAmount }); } catch (e) { console.warn('Failed to update invoice', e); }
      }
    }
    if (payment.billId) {
      const bills = state.vendorBills.map(b => b.id === payment.billId
        ? { ...b, paidAmount: b.paidAmount + payment.amount, status: b.paidAmount + payment.amount >= b.amount ? 'Paid' : 'Partially Paid' }
        : b);
      dispatch({ type: 'vendorBills/set', payload: bills as typeof state.vendorBills });
      if (supabase) {
        try { await db.update('vendor_bills', 'id', payment.billId, { paidAmount: bills.find(b => b.id === payment.billId)?.paidAmount }); } catch (e) { console.warn('Failed to update bill', e); }
      }
    }

  dispatch({ type: 'payments/set', payload: [payment, ...state.payments] });
  if (supabase) { try { await db.insert('payments', payment as unknown as Record<string, unknown>); } catch (e) { console.warn('Failed to persist payment', e); } }
    dispatch({ type: 'audit/append', payload: { id: `audit-${Date.now()}`, entityType: 'Payment', entityId: payment.id, action: 'create', timestamp: new Date() } });
    toast({ title: 'Payment recorded', description: payment.reference });
    setFormOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payments</h1>
          <p className="text-muted-foreground mt-1">Record customer receipts and vendor payments</p>
        </div>
  <Button onClick={openCreate} disabled={!(canEdit || canMakePayments)}><Plus className="h-4 w-4 mr-2" />New Payment</Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search payments..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
      </div>

      <div className="border border-border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(p => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <span className="font-medium">{p.reference}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={p.type === 'Received' ? 'default' : 'secondary'}>{p.type}</Badge>
                </TableCell>
                <TableCell className="font-medium">{p.contactName}</TableCell>
                <TableCell className="text-muted-foreground">{p.date.toLocaleDateString('en-IN')}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(p.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>Link to invoice or bill optionally</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v: Payment['type']) => setForm({ ...form, type: v, contactId: '', linkType: '', linkId: '' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Received">Received (Customer)</SelectItem>
                    <SelectItem value="Made">Made (Vendor)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Contact</Label>
                <Select value={form.contactId} onValueChange={(v) => setForm({ ...form, contactId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
                  <SelectContent>
                    {(form.type === 'Received' ? customers : vendors).map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Method</Label>
                <Select value={form.method} onValueChange={(v: Payment['method']) => setForm({ ...form, method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                    <SelectItem value="Online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reference</Label>
                <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label>Link To</Label>
                <Select value={form.linkType} onValueChange={(v: 'Invoice'|'Bill'|'') => setForm({ ...form, linkType: v, linkId: '' })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    <SelectItem value="Invoice">Invoice</SelectItem>
                    <SelectItem value="Bill">Bill</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.linkType && (
                <div className="space-y-2 md:col-span-2">
                  <Label>{form.linkType}</Label>
                  <Select value={form.linkId} onValueChange={(v) => setForm({ ...form, linkId: v })}>
                    <SelectTrigger><SelectValue placeholder={`Select ${form.linkType.toLowerCase()}`} /></SelectTrigger>
                    <SelectContent>
                      {form.linkType === 'Invoice' && state.invoices
                        .filter(i => !form.contactId || i.customerId === form.contactId)
                        .map(i => (
                          <SelectItem key={i.id} value={i.id}>{i.invoiceNumber} - {i.customerName}</SelectItem>
                        ))}
                      {form.linkType === 'Bill' && state.vendorBills
                        .filter(b => !form.contactId || b.vendorId === form.contactId)
                        .map(b => (
                          <SelectItem key={b.id} value={b.id}>{b.billNumber} - {b.vendorName}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2 md:col-span-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button onClick={savePayment} disabled={!(canEdit || canMakePayments)}>Save Payment</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
