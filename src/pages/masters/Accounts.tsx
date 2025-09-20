import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Account } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/rbac';
import { useAppStore } from '@/store/AppStore';
import { db } from '@/lib/db';

export default function ChartOfAccounts() {
  const { user } = useAuth();
  const canEdit = hasPermission(user, 'masters:accounts:edit');
  const canView = hasPermission(user, 'masters:view');
  const { state, dispatch } = useAppStore();
  const [accounts, setAccounts] = useState<Account[]>(state.accounts);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'Asset' as Account['type'],
    code: '',
    balance: '',
  });
  const { toast } = useToast();

  const filteredAccounts = accounts.filter(account =>
    account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    setAccounts(state.accounts);
  }, [state.accounts]);

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'Asset',
      code: '',
      balance: '',
    });
    setEditingAccount(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAccount) {
        const updated: Account = {
          ...editingAccount,
          ...formData,
          balance: parseFloat(formData.balance),
        };
        await db.update('accounts', 'id', editingAccount.id, updated as unknown as Record<string, unknown>);
        const next = accounts.map(a => (a.id === editingAccount.id ? updated : a));
        setAccounts(next);
        dispatch({ type: 'accounts/set', payload: next });
        toast({ title: 'Account updated', description: `${formData.name} has been updated successfully.` });
      } else {
        const newAccount: Account = {
          id: Date.now().toString(),
          name: formData.name,
          type: formData.type,
          code: formData.code,
          balance: parseFloat(formData.balance),
        };
        await db.insert('accounts', newAccount as unknown as Record<string, unknown>);
        const next = [newAccount, ...accounts];
        setAccounts(next);
        dispatch({ type: 'accounts/set', payload: next });
        toast({ title: 'Account added', description: `${formData.name} has been added successfully.` });
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (err: unknown) {
      console.error(err);
      toast({ title: 'Save failed', description: 'Could not save account. Please try again.', variant: 'destructive' });
    }
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      type: account.type,
      code: account.code,
      balance: account.balance.toString(),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (accountId: string) => {
    try {
      await db.delete('accounts', 'id', accountId);
      const next = accounts.filter(a => a.id !== accountId);
      setAccounts(next);
      dispatch({ type: 'accounts/set', payload: next });
      toast({ title: 'Account deleted', description: 'Account has been removed successfully.' });
    } catch (err: unknown) {
      console.error(err);
      toast({ title: 'Delete failed', description: 'Could not delete account.', variant: 'destructive' });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getTypeVariant = (type: Account['type']) => {
    switch (type) {
      case 'Asset':
        return 'default';
      case 'Liability':
        return 'destructive';
      case 'Income':
        return 'default';
      case 'Expense':
        return 'secondary';
      case 'Equity':
        return 'outline';
      default:
        return 'default';
    }
  };

  const getTypeColor = (type: Account['type']) => {
    switch (type) {
      case 'Asset':
        return 'text-success';
      case 'Liability':
        return 'text-destructive';
      case 'Income':
        return 'text-success';
      case 'Expense':
        return 'text-warning';
      case 'Equity':
        return 'text-primary';
      default:
        return 'text-foreground';
    }
  };

  if (!canView) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Access denied</h1>
        <p className="text-muted-foreground">You don’t have permission to view Accounts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Chart of Accounts</h1>
          <p className="text-muted-foreground mt-1">
            Manage your accounting structure
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} disabled={!canEdit}>
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingAccount ? 'Edit Account' : 'Add New Account'}
                </DialogTitle>
                <DialogDescription>
                  {editingAccount 
                    ? 'Update the account information below.'
                    : 'Enter the account details to create a new account.'
                  }
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Account Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Cash in Hand"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Account Type *</Label>
                    <Select 
                      value={formData.type} 
                      onValueChange={(value: Account['type']) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asset">Asset</SelectItem>
                        <SelectItem value="Liability">Liability</SelectItem>
                        <SelectItem value="Income">Income</SelectItem>
                        <SelectItem value="Expense">Expense</SelectItem>
                        <SelectItem value="Equity">Equity</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code">Account Code *</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="e.g., A001"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="balance">Opening Balance *</Label>
                  <Input
                    id="balance"
                    type="number"
                    step="0.01"
                    value={formData.balance}
                    onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingAccount ? 'Update Account' : 'Add Account'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search accounts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Accounts Table */}
      <div className="border border-border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAccounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
                      <Target className="h-4 w-4" />
                    </div>
                    <span className="font-medium">{account.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{account.code}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getTypeVariant(account.type)}>
                    {account.type}
                  </Badge>
                </TableCell>
                <TableCell className={`text-right font-medium ${getTypeColor(account.type)}`}>
                  {formatCurrency(account.balance)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(account)}
                      disabled={!canEdit}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(account.id)}
                      disabled={!canEdit}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredAccounts.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No accounts found.</p>
        </div>
      )}
    </div>
  );
}