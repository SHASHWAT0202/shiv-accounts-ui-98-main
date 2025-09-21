import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, DollarSign, Users, Clock } from 'lucide-react';

export default function InvoicingUserDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoicing Dashboard</h1>
          <p className="text-muted-foreground">
            Invoicing User - Manage invoices and transactions
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          <FileText className="w-4 h-4 mr-1" />
          Invoicing User
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Pending completion
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent Invoices</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Awaiting payment
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Invoices</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Active customers
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common invoicing tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between p-2 border rounded">
              <span>Create Invoice</span>
              <Badge variant="default">Available</Badge>
            </div>
            <div className="flex items-center justify-between p-2 border rounded">
              <span>Manage Customers</span>
              <Badge variant="default">Available</Badge>
            </div>
            <div className="flex items-center justify-between p-2 border rounded">
              <span>Record Payments</span>
              <Badge variant="default">Available</Badge>
            </div>
            <div className="flex items-center justify-between p-2 border rounded">
              <span>View Reports</span>
              <Badge variant="default">Available</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
            <CardDescription>
              Latest invoice activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                No recent invoices
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
