import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Package } from 'lucide-react';
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
import { Product } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { getHSNInfo } from '@/lib/hsn';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/rbac';
import { useAppStore } from '@/store/AppStore';
import { db } from '@/lib/db';

export default function Products() {
  const { user } = useAuth();
  const canEdit = hasPermission(user, 'masters:products:edit');
  const canView = hasPermission(user, 'masters:view');
  const { state, dispatch } = useAppStore();
  const [products, setProducts] = useState<Product[]>(state.products);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'Goods' as Product['type'],
    salesPrice: '',
    purchasePrice: '',
    taxPercentage: '',
    hsnCode: '',
    category: '',
    description: '',
    unit: '',
    stockQty: '',
  });
  const { toast } = useToast();

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    setProducts(state.products);
  }, [state.products]);

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'Goods',
      salesPrice: '',
      purchasePrice: '',
      taxPercentage: '',
      hsnCode: '',
      category: '',
      description: '',
      unit: '',
      stockQty: '',
    });
    setEditingProduct(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        const updated: Product = {
          ...editingProduct,
          ...formData,
          salesPrice: parseFloat(formData.salesPrice),
          purchasePrice: parseFloat(formData.purchasePrice),
          taxPercentage: parseFloat(formData.taxPercentage),
          stockQty: formData.type === 'Goods' ? parseFloat(formData.stockQty || '0') : 0,
        };
        await db.update('products', 'id', editingProduct.id, updated as unknown as Record<string, unknown>);
        const next = products.map(p => (p.id === editingProduct.id ? updated : p));
        setProducts(next);
        dispatch({ type: 'products/set', payload: next });
        toast({ title: 'Product updated', description: `${formData.name} has been updated successfully.` });
      } else {
        const newProduct: Product = {
          id: Date.now().toString(),
          name: formData.name,
          type: formData.type,
          salesPrice: parseFloat(formData.salesPrice),
          purchasePrice: parseFloat(formData.purchasePrice),
          taxPercentage: parseFloat(formData.taxPercentage),
          hsnCode: formData.hsnCode,
          category: formData.category,
          description: formData.description,
          unit: formData.unit,
          stockQty: formData.type === 'Goods' ? parseFloat(formData.stockQty || '0') : 0,
          createdAt: new Date(),
        };
        await db.insert('products', newProduct as unknown as Record<string, unknown>);
        const next = [newProduct, ...products];
        setProducts(next);
        dispatch({ type: 'products/set', payload: next });
        toast({ title: 'Product added', description: `${formData.name} has been added successfully.` });
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (err: unknown) {
      console.error(err);
      toast({ title: 'Save failed', description: 'Could not save product. Please try again.', variant: 'destructive' });
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      type: product.type,
      salesPrice: product.salesPrice.toString(),
      purchasePrice: product.purchasePrice.toString(),
      taxPercentage: product.taxPercentage.toString(),
      hsnCode: product.hsnCode,
      category: product.category,
      description: product.description || '',
      unit: product.unit,
      stockQty: (product.stockQty ?? 0).toString(),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (productId: string) => {
    try {
      await db.delete('products', 'id', productId);
      const next = products.filter(p => p.id !== productId);
      setProducts(next);
      dispatch({ type: 'products/set', payload: next });
      toast({ title: 'Product deleted', description: 'Product has been removed successfully.' });
    } catch (err: unknown) {
      console.error(err);
      toast({ title: 'Delete failed', description: 'Could not delete product.', variant: 'destructive' });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {!canView && (
        <div className="p-6">
          <h1 className="text-2xl font-bold">Access denied</h1>
          <p className="text-muted-foreground">You don’t have permission to view Products.</p>
        </div>
      )}
      {canView && (
        <>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Products</h1>
          <p className="text-muted-foreground mt-1">
            Manage your goods and services
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} disabled={!canEdit}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </DialogTitle>
                <DialogDescription>
                  {editingProduct 
                    ? 'Update the product information below.'
                    : 'Enter the product details to create a new product.'
                  }
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Product Name *</Label>
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
                      onValueChange={(value: Product['type']) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Goods">Goods</SelectItem>
                        <SelectItem value="Service">Service</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="salesPrice">Sales Price *</Label>
                    <Input
                      id="salesPrice"
                      type="number"
                      step="0.01"
                      value={formData.salesPrice}
                      onChange={(e) => setFormData({ ...formData, salesPrice: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="purchasePrice">Purchase Price *</Label>
                    <Input
                      id="purchasePrice"
                      type="number"
                      step="0.01"
                      value={formData.purchasePrice}
                      onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="taxPercentage">Tax Percentage *</Label>
                    <Input
                      id="taxPercentage"
                      type="number"
                      step="0.01"
                      value={formData.taxPercentage}
                      onChange={(e) => setFormData({ ...formData, taxPercentage: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hsnCode">HSN Code *</Label>
                    <Input
                      id="hsnCode"
                      value={formData.hsnCode}
                      onChange={(e) => {
                        const hsn = e.target.value;
                        const info = getHSNInfo(hsn);
                        setFormData({
                          ...formData,
                          hsnCode: hsn,
                          taxPercentage: info ? info.gstPercent.toString() : formData.taxPercentage,
                          description: info ? info.description : formData.description,
                          category: info?.category ?? formData.category,
                        });
                      }}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit *</Label>
                    <Select 
                      value={formData.unit} 
                      onValueChange={(value) => setFormData({ ...formData, unit: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Piece">Piece</SelectItem>
                        <SelectItem value="Kg">Kg</SelectItem>
                        <SelectItem value="Meter">Meter</SelectItem>
                        <SelectItem value="Hour">Hour</SelectItem>
                        <SelectItem value="Box">Box</SelectItem>
                        <SelectItem value="Set">Set</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter product description"
                  />
                </div>

                {formData.type === 'Goods' && (
                  <div className="space-y-2">
                    <Label htmlFor="stockQty">Opening Stock Quantity</Label>
                    <Input
                      id="stockQty"
                      type="number"
                      step="0.01"
                      value={formData.stockQty}
                      onChange={(e) => setFormData({ ...formData, stockQty: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingProduct ? 'Update Product' : 'Add Product'}
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
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="border border-border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Sales Price</TableHead>
              <TableHead className="text-right">Purchase Price</TableHead>
              <TableHead className="text-center">Tax %</TableHead>
              <TableHead>HSN Code</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
                      <Package className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-muted-foreground">{product.unit}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={product.type === 'Goods' ? 'default' : 'secondary'}>
                    {product.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{product.category}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(product.salesPrice)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(product.purchasePrice)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline">{product.taxPercentage}%</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{product.hsnCode}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(product)}
                      disabled={!canEdit}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(product.id)}
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

      {filteredProducts.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No products found.</p>
        </div>
      )}
      </>
      )}
    </div>
  );
}