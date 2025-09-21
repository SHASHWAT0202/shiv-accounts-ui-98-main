import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, FileText, DollarSign, Eye } from 'lucide-react';

export default function ContactMasterDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contact Dashboard</h1>
          <p className="text-muted-foreground">
            Contact Master - View your invoices and make payments
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          <User className="w-4 h-4 mr-1" />
          Contact Master
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Total invoices
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹0</div>
            <p className="text-xs text-muted-foreground">
              Amount due
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹0</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Account Status</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Active</div>
            <p className="text-xs text-muted-foreground">
              Account in good standing
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Available Actions</CardTitle>
            <CardDescription>
              Actions available to Contact Master
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between p-2 border rounded">
              <span>View My Invoices</span>
              <Badge variant="default">Available</Badge>
            </div>
            <div className="flex items-center justify-between p-2 border rounded">
              <span>Make Payments</span>
              <Badge variant="default">Available</Badge>
            </div>
            <div className="flex items-center justify-between p-2 border rounded">
              <span>View Payment History</span>
              <Badge variant="default">Available</Badge>
            </div>
            <div className="flex items-center justify-between p-2 border rounded">
              <span>Download Invoices</span>
              <Badge variant="default">Available</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
            <CardDescription>
              Your latest invoices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                No invoices found
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
