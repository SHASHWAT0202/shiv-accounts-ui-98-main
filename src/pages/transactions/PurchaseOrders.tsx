import { useState } from 'react';
import { Plus, Search, Edit2, Eye, FileText } from 'lucide-react';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { mockPurchaseOrders } from '@/data/mockData';
import { PurchaseOrder } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/rbac';

export default function PurchaseOrders() {
  const { user } = useAuth();
  const canEdit = hasPermission(user, 'transactions:edit');
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(mockPurchaseOrders);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const { toast } = useToast();

  const filteredPOs = purchaseOrders.filter(po =>
    po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    po.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    po.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusVariant = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'Draft':
        return 'secondary';
      case 'Sent':
        return 'outline';
      case 'Approved':
        return 'default';
      case 'Completed':
        return 'default';
      case 'Cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusColor = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'Draft':
        return 'text-muted-foreground';
      case 'Sent':
        return 'text-warning';
      case 'Approved':
        return 'text-primary';
      case 'Completed':
        return 'text-success';
      case 'Cancelled':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const handleView = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setIsDialogOpen(true);
  };

  const handleStatusUpdate = (poId: string, newStatus: PurchaseOrder['status']) => {
    setPurchaseOrders(prev => prev.map(po => 
      po.id === poId ? { ...po, status: newStatus } : po
    ));
    toast({
      title: 'Status updated',
      description: `Purchase order status updated to ${newStatus}.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Purchase Orders</h1>
          <p className="text-muted-foreground mt-1">
            Manage your purchase orders and vendor transactions
          </p>
        </div>
        
        <Button disabled={!canEdit}>
          <Plus className="h-4 w-4 mr-2" />
          Create Purchase Order
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search purchase orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="border border-border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO Number</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPOs.map((po) => (
              <TableRow key={po.id}>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-4 w-4" />
                    </div>
                    <span className="font-medium">{po.poNumber}</span>
                  </div>
                </TableCell>
                <TableCell className="font-medium">{po.vendorName}</TableCell>
                <TableCell className="text-muted-foreground">
                  {po.date.toLocaleDateString('en-IN')}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {po.dueDate.toLocaleDateString('en-IN')}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(po.total)}
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(po.status)} className={getStatusColor(po.status)}>
                    {po.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleView(po)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredPOs.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No purchase orders found.</p>
        </div>
      )}

      {/* Purchase Order Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedPO && (
            <>
              <DialogHeader>
                <DialogTitle>Purchase Order Details</DialogTitle>
                <DialogDescription>
                  {selectedPO.poNumber} - {selectedPO.vendorName}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium">Date:</span>
                    <p className="text-muted-foreground">{selectedPO.date.toLocaleDateString('en-IN')}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Due Date:</span>
                    <p className="text-muted-foreground">{selectedPO.dueDate.toLocaleDateString('en-IN')}</p>
                  </div>
                </div>

                <div>
                  <span className="text-sm font-medium">Status:</span>
                  <Badge variant={getStatusVariant(selectedPO.status)} className="ml-2">
                    {selectedPO.status}
                  </Badge>
                </div>

                <div>
                  <span className="text-sm font-medium">Items:</span>
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
                      {selectedPO.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.productName}</TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(selectedPO.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>{formatCurrency(selectedPO.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Total:</span>
                    <span>{formatCurrency(selectedPO.total)}</span>
                  </div>
                </div>

                {selectedPO.notes && (
                  <div>
                    <span className="text-sm font-medium">Notes:</span>
                    <p className="text-muted-foreground">{selectedPO.notes}</p>
                  </div>
                )}

                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => handleStatusUpdate(selectedPO.id, 'Approved')}
                    disabled={selectedPO.status === 'Approved'}
                  >
                    Approve
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleStatusUpdate(selectedPO.id, 'Completed')}
                    disabled={selectedPO.status === 'Completed'}
                  >
                    Mark Complete
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}