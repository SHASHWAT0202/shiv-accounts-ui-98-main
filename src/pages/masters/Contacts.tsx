import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
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
import { Contact } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/rbac';
import { useAppStore } from '@/store/AppStore';
import { db } from '@/lib/db';

export default function Contacts() {
  const { user } = useAuth();
  const canView = hasPermission(user, 'masters:view');
  const canEdit = hasPermission(user, 'masters:contacts:edit');
  const { state, dispatch } = useAppStore();
  const [contacts, setContacts] = useState<Contact[]>(state.contacts);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'Customer' as Contact['type'],
    email: '',
    mobile: '',
    city: '',
    state: '',
    address: '',
    gstNumber: '',
  });
  const { toast } = useToast();

  // Keep local list in sync when store changes
  useEffect(() => {
    setContacts(state.contacts);
  }, [state.contacts]);

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'Customer',
      email: '',
      mobile: '',
      city: '',
      state: '',
      address: '',
      gstNumber: '',
    });
    setEditingContact(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingContact) {
        const updated: Contact = { ...editingContact, ...formData };
        // Persist if Supabase configured
  await db.update('contacts', 'id', editingContact.id, updated as unknown as Record<string, unknown>);
        const next = contacts.map(c => (c.id === editingContact.id ? updated : c));
        setContacts(next);
        dispatch({ type: 'contacts/set', payload: next });
        toast({ title: 'Contact updated', description: `${formData.name} has been updated successfully.` });
      } else {
        const newContact: Contact = {
          id: Date.now().toString(),
          ...formData,
          createdAt: new Date(),
        };
  await db.insert('contacts', newContact as unknown as Record<string, unknown>);
        const next = [newContact, ...contacts];
        setContacts(next);
        dispatch({ type: 'contacts/set', payload: next });
        toast({ title: 'Contact added', description: `${formData.name} has been added successfully.` });
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (err: unknown) {
      console.error(err);
      toast({ title: 'Save failed', description: 'Could not save contact. Please try again.', variant: 'destructive' });
    }
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      type: contact.type,
      email: contact.email,
      mobile: contact.mobile,
      city: contact.city,
      state: contact.state,
      address: contact.address || '',
      gstNumber: contact.gstNumber || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (contactId: string) => {
    try {
      await db.delete('contacts', 'id', contactId);
      const next = contacts.filter(c => c.id !== contactId);
      setContacts(next);
      dispatch({ type: 'contacts/set', payload: next });
      toast({ title: 'Contact deleted', description: 'Contact has been removed successfully.' });
    } catch (err: unknown) {
      console.error(err);
      toast({ title: 'Delete failed', description: 'Could not delete contact.', variant: 'destructive' });
    }
  };

  const getTypeVariant = (type: Contact['type']) => {
    switch (type) {
      case 'Customer':
        return 'default';
      case 'Vendor':
        return 'secondary';
      case 'Both':
        return 'outline';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {!canView && (
        <div className="p-6">
          <h1 className="text-2xl font-bold">Access denied</h1>
          <p className="text-muted-foreground">You don’t have permission to view Contacts.</p>
        </div>
      )}
      {canView && (
        <>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Contacts</h1>
          <p className="text-muted-foreground mt-1">
            Manage your customers and vendors
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} disabled={!canEdit}>
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingContact ? 'Edit Contact' : 'Add New Contact'}
                </DialogTitle>
                <DialogDescription>
                  {editingContact 
                    ? 'Update the contact information below.'
                    : 'Enter the contact details to create a new contact.'
                  }
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Type *</Label>
                    <Select 
                      value={formData.type} 
                      onValueChange={(value: Contact['type']) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Customer">Customer</SelectItem>
                        <SelectItem value="Vendor">Vendor</SelectItem>
                        <SelectItem value="Both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mobile">Mobile *</Label>
                    <Input
                      id="mobile"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Enter complete address"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gstNumber">GST Number</Label>
                  <Input
                    id="gstNumber"
                    value={formData.gstNumber}
                    onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                    placeholder="e.g., 27ABCDE1234F1Z5"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingContact ? 'Update Contact' : 'Add Contact'}
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
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Contacts Table */}
      <div className="border border-border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredContacts.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell className="font-medium">{contact.name}</TableCell>
                <TableCell>
                  <Badge variant={getTypeVariant(contact.type)}>
                    {contact.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{contact.email}</TableCell>
                <TableCell>{contact.mobile}</TableCell>
                <TableCell className="text-muted-foreground">
                  {contact.city}, {contact.state}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(contact)}
                      disabled={!canEdit}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(contact.id)}
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

      {filteredContacts.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No contacts found.</p>
        </div>
      )}
      </>
      )}
    </div>
  );
}