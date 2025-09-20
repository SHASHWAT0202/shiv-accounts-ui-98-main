import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Calculator } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Tax } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/rbac';
import { useAppStore } from '@/store/AppStore';
import { db } from '@/lib/db';

export default function TaxMaster() {
  const { user } = useAuth();
  const canEdit = hasPermission(user, 'masters:tax:edit');
  const canView = hasPermission(user, 'masters:view');
  const { state, dispatch } = useAppStore();
  const [taxes, setTaxes] = useState<Tax[]>(state.taxes);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<Tax | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    rate: '',
    computationMethod: 'Percentage' as Tax['computationMethod'],
    appliesOn: 'Both' as Tax['appliesOn'],
    description: '',
  });
  const { toast } = useToast();

  const filteredTaxes = taxes.filter(tax =>
    tax.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tax.appliesOn.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    setTaxes(state.taxes);
  }, [state.taxes]);

  const resetForm = () => {
    setFormData({
      name: '',
      rate: '',
      computationMethod: 'Percentage',
      appliesOn: 'Both',
      description: '',
    });
    setEditingTax(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTax) {
        const updated: Tax = {
          ...editingTax,
          ...formData,
          rate: parseFloat(formData.rate),
        };
        await db.update('taxes', 'id', editingTax.id, updated as unknown as Record<string, unknown>);
        const next = taxes.map(t => (t.id === editingTax.id ? updated : t));
        setTaxes(next);
        dispatch({ type: 'taxes/set', payload: next });
        toast({ title: 'Tax updated', description: `${formData.name} has been updated successfully.` });
      } else {
        const newTax: Tax = {
          id: Date.now().toString(),
          name: formData.name,
          rate: parseFloat(formData.rate),
          computationMethod: formData.computationMethod,
          appliesOn: formData.appliesOn,
          description: formData.description,
        };
        await db.insert('taxes', newTax as unknown as Record<string, unknown>);
        const next = [newTax, ...taxes];
        setTaxes(next);
        dispatch({ type: 'taxes/set', payload: next });
        toast({ title: 'Tax added', description: `${formData.name} has been added successfully.` });
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (err: unknown) {
      console.error(err);
      toast({ title: 'Save failed', description: 'Could not save tax. Please try again.', variant: 'destructive' });
    }
  };

  const handleEdit = (tax: Tax) => {
    setEditingTax(tax);
    setFormData({
      name: tax.name,
      rate: tax.rate.toString(),
      computationMethod: tax.computationMethod,
      appliesOn: tax.appliesOn,
      description: tax.description || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (taxId: string) => {
    try {
      await db.delete('taxes', 'id', taxId);
      const next = taxes.filter(t => t.id !== taxId);
      setTaxes(next);
      dispatch({ type: 'taxes/set', payload: next });
      toast({ title: 'Tax deleted', description: 'Tax has been removed successfully.' });
    } catch (err: unknown) {
      console.error(err);
      toast({ title: 'Delete failed', description: 'Could not delete tax.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {!canView && (
        <div className="p-6">
          <h1 className="text-2xl font-bold">Access denied</h1>
          <p className="text-muted-foreground">You don’t have permission to view Taxes.</p>
        </div>
      )}
      {canView && (
        <>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tax Master</h1>
          <p className="text-muted-foreground mt-1">
            Manage tax rates and configurations
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} disabled={!canEdit}>
              <Plus className="h-4 w-4 mr-2" />
              Add Tax
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingTax ? 'Edit Tax' : 'Add New Tax'}
                </DialogTitle>
                <DialogDescription>
                  {editingTax 
                    ? 'Update the tax configuration below.'
                    : 'Enter the tax details to create a new tax.'
                  }
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Tax Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., GST 18%"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rate">Rate *</Label>
                    <Input
                      id="rate"
                      type="number"
                      step="0.01"
                      value={formData.rate}
                      onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                      placeholder="18.00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="computationMethod">Method *</Label>
                    <Select 
                      value={formData.computationMethod} 
                      onValueChange={(value: Tax['computationMethod']) => setFormData({ ...formData, computationMethod: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Percentage">Percentage</SelectItem>
                        <SelectItem value="Fixed">Fixed Amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="appliesOn">Applies On *</Label>
                  <Select 
                    value={formData.appliesOn} 
                    onValueChange={(value: Tax['appliesOn']) => setFormData({ ...formData, appliesOn: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sales">Sales Only</SelectItem>
                      <SelectItem value="Purchase">Purchase Only</SelectItem>
                      <SelectItem value="Both">Both Sales & Purchase</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter tax description"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingTax ? 'Update Tax' : 'Add Tax'}
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
            placeholder="Search taxes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Taxes Table */}
      <div className="border border-border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tax Name</TableHead>
              <TableHead className="text-center">Rate</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Applies On</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTaxes.map((tax) => (
              <TableRow key={tax.id}>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
                      <Calculator className="h-4 w-4" />
                    </div>
                    <span className="font-medium">{tax.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline">
                    {tax.rate}{tax.computationMethod === 'Percentage' ? '%' : ' ₹'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={tax.computationMethod === 'Percentage' ? 'default' : 'secondary'}>
                    {tax.computationMethod}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={
                      tax.appliesOn === 'Both' ? 'default' : 
                      tax.appliesOn === 'Sales' ? 'secondary' : 'outline'
                    }
                  >
                    {tax.appliesOn}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground max-w-xs truncate">
                  {tax.description || '-'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(tax)}
                      disabled={!canEdit}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(tax.id)}
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

      {filteredTaxes.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No taxes found.</p>
        </div>
      )}
      </>
      )}
    </div>
  );
}