import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { initiateRazorpayPayment, isRazorpayAvailable, loadRazorpayScript } from '@/lib/razorpay';
import type { Invoice } from '@/types';

export function TestPayment() {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Mock invoice for testing
  const testInvoice: Invoice = {
    id: 'test-invoice-1',
    invoiceNumber: 'TEST-001',
    date: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    customerId: 'test-customer',
    customerName: 'Test Customer',
    items: [
      {
        id: 'test-item-1',
        productId: 'test-product',
        productName: 'Test Product',
        quantity: 1,
        unitPrice: 100,
        taxPercentage: 18,
        amount: 118,
      }
    ],
    subtotal: 100,
    taxAmount: 18,
    total: 118,
    paidAmount: 0,
    status: 'Draft',
    notes: 'Test invoice for payment testing',
  };

  const testPayment = async () => {
    setIsLoading(true);
    setError('');
    setStatus('Initializing payment...');

    try {
      // Check if Razorpay is available
      if (!isRazorpayAvailable()) {
        throw new Error('Razorpay is not configured. Please check environment variables.');
      }

      setStatus('Loading Razorpay script...');
      
      // Test script loading
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay script');
      }

      setStatus('Opening payment modal...');

      await initiateRazorpayPayment(
        testInvoice,
        (response) => {
          setStatus(`Payment successful! Payment ID: ${response.razorpay_payment_id}`);
          setIsLoading(false);
        },
        (error) => {
          setError(error.message || 'Payment failed');
          setIsLoading(false);
        }
      );

    } catch (err) {
      const errorMessage = (err as Error).message || 'Unknown error occurred';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const checkEnvironment = () => {
    const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID;
    const keySecret = import.meta.env.VITE_RAZORPAY_KEY_SECRET;
    
    return {
      keyId: keyId ? `${keyId.substring(0, 10)}...` : 'Not configured',
      keySecret: keySecret ? `${keySecret.substring(0, 10)}...` : 'Not configured',
      isConfigured: !!(keyId && keySecret)
    };
  };

  const envCheck = checkEnvironment();

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Razorpay Payment Test</CardTitle>
          <CardDescription>
            Test the Razorpay payment integration with a mock invoice
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Environment Check */}
          <div className="space-y-2">
            <h4 className="font-medium">Environment Configuration</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Razorpay Key ID:</div>
              <Badge variant={envCheck.keyId !== 'Not configured' ? 'default' : 'destructive'}>
                {envCheck.keyId}
              </Badge>
              <div>Razorpay Key Secret:</div>
              <Badge variant={envCheck.keySecret !== 'Not configured' ? 'default' : 'destructive'}>
                {envCheck.keySecret}
              </Badge>
            </div>
          </div>

          {/* Test Invoice Details */}
          <div className="space-y-2">
            <h4 className="font-medium">Test Invoice</h4>
            <div className="bg-gray-50 p-3 rounded text-sm">
              <div>Invoice: {testInvoice.invoiceNumber}</div>
              <div>Customer: {testInvoice.customerName}</div>
              <div>Amount: ₹{testInvoice.total}</div>
            </div>
          </div>

          {/* Status */}
          {status && (
            <Alert>
              <AlertDescription>{status}</AlertDescription>
            </Alert>
          )}

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Test Payment Button */}
          <Button 
            onClick={testPayment} 
            disabled={!envCheck.isConfigured || isLoading}
            className="w-full"
          >
            {isLoading ? 'Processing...' : 'Test Payment (₹118)'}
          </Button>

          {/* Instructions */}
          <div className="text-sm text-gray-600 space-y-2">
            <h4 className="font-medium">Test Payment Instructions:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Use test card: <code>4111 1111 1111 1111</code></li>
              <li>Any future expiry date (e.g., 12/25)</li>
              <li>Any 3-digit CVV (e.g., 123)</li>
              <li>Use any name for cardholder</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}