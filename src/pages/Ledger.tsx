import { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/AppStore';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/rbac';

type CsvRow = Record<string, unknown>;
function toCSV(rows: CsvRow[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  return [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');
}

export default function Ledger() {
  const { user } = useAuth();
  const { state } = useAppStore();
  const [q, setQ] = useState('');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');

  const filtered = useMemo(() => {
    const fDate = from ? new Date(from) : null;
    const tDate = to ? new Date(to) : null;
    return state.ledger.filter(l => {
      if (q && !(`${l.accountName}`.toLowerCase().includes(q.toLowerCase()) || `${l.description ?? ''}`.toLowerCase().includes(q.toLowerCase()))) return false;
      if (fDate && l.date < fDate) return false;
      if (tDate && l.date > tDate) return false;
      return true;
    });
  }, [state.ledger, q, from, to]);

  const exportCSV = () => {
    const rows = filtered.map(l => ({
      Date: l.date.toISOString().split('T')[0],
      Account: l.accountName,
      Debit: l.debit,
      Credit: l.credit,
      RefType: l.referenceType,
      RefId: l.referenceId ?? '',
      Description: l.description ?? '',
    }));
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ledger-${Date.now()}.csv`;
    link.click();
  };

  if (!hasPermission(user, 'ledger:view')) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Access denied</h1>
        <p className="text-muted-foreground">You don’t have permission to view the ledger.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Ledger</h1>
        <p className="text-muted-foreground mt-1">View double-entry ledger entries with filters and export</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-4 gap-3">
          <Input placeholder="Search account or description" value={q} onChange={(e) => setQ(e.target.value)} />
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <Button onClick={exportCSV} className="md:justify-self-end">Export CSV</Button>
        </CardContent>
      </Card>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Account</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
              <TableHead>Ref</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(e => (
              <TableRow key={e.id}>
                <TableCell>{e.date.toLocaleDateString('en-IN')}</TableCell>
                <TableCell>{e.accountName}</TableCell>
                <TableCell className="text-right">{e.debit.toFixed(2)}</TableCell>
                <TableCell className="text-right">{e.credit.toFixed(2)}</TableCell>
                <TableCell>{e.referenceType}</TableCell>
                <TableCell className="max-w-[300px] truncate">{e.description}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No entries</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
