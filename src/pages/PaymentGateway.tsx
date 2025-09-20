import React, { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAppStore } from '@/store/AppStore';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/rbac';
import { isRazorpayAvailable } from '@/lib/razorpay';
import PaymentComponent from '@/components/ui/payment-component';

export default function PaymentGateway() {
  const { state } = useAppStore();
  const { user } = useAuth();
  const { toast } = useToast();
  const canMakePayments = hasPermission(user, 'payments:make');
  
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    contactId: '',
    description: '',
  });

  const contacts = state.contacts || [];
  const selectedContact = contacts.find(c => c.id === paymentForm.contactId);

  const handleFormChange = (field: string, value: string) => {
    setPaymentForm(prev => ({ ...prev, [field]: value }));
  };

  const handlePaymentSuccess = (payment: any) => {
    console.log('Payment successful:', payment);
    toast({
      title: "Payment Successful",
      description: "Payment processed successfully.",
    });
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    toast({
      title: "Payment Failed",
      description: error,
      variant: "destructive",
    });
  };

  if (!canMakePayments) {
    return (
      <div className="p-6">
        <Alert>
          <AlertDescription>
            You don't have permission to access the payment gateway.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!isRazorpayAvailable()) {
    return (
      <div className="p-6">
        <Alert>
          <AlertDescription>
            Payment gateway is not configured. Please contact your administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Payment Gateway</h1>
        <p className="text-muted-foreground">Process payments securely with Razorpay</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Create Payment
            </CardTitle>
            <CardDescription>
              Set up payment details and process payment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact">Select Contact</Label>
              <Select 
                value={paymentForm.contactId} 
                onValueChange={(value) => handleFormChange('contactId', value)}
              >
                <SelectTrigger id="contact">
                  <SelectValue placeholder="Choose a contact..." />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map(contact => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={paymentForm.amount}
                onChange={(e) => handleFormChange('amount', e.target.value)}
                min="0"
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Payment description..."
                value={paymentForm.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div>
          {paymentForm.amount && paymentForm.contactId ? (
            <PaymentComponent
              amount={parseFloat(paymentForm.amount)}
              description={paymentForm.description}
              contactId={paymentForm.contactId}
              contactName={selectedContact?.name}
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={handlePaymentError}
            />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center p-8">
                <div className="text-center text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4" />
                  <p>Fill in the payment details to proceed</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
