import React, { useState } from 'react';
import { CreditCard, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  initiateRazorpayPayment, 
  initiateCustomPayment, 
  isRazorpayAvailable,
  createPaymentFromRazorpay,
  createGenericPaymentRecord
} from '@/lib/razorpay';
import type { Invoice, Payment } from '@/types';

interface PaymentComponentProps {
  // For invoice payments
  invoice?: Invoice;
  
  // For custom payments
  amount?: number;
  description?: string;
  contactId?: string;
  contactName?: string;
  
  // Common props
  onPaymentSuccess?: (payment: Omit<Payment, 'id'>) => void;
  onPaymentError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function PaymentComponent({
  invoice,
  amount,
  description,
  contactId,
  contactName,
  onPaymentSuccess,
  onPaymentError,
  disabled = false,
  className = ''
}: PaymentComponentProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

  // Determine if this is an invoice payment or custom payment
  const isInvoicePayment = !!invoice;
  const paymentAmount = isInvoicePayment 
    ? (invoice.total - invoice.paidAmount) 
    : (amount || 0);
  
  const paymentDescription = isInvoicePayment 
    ? `Payment for Invoice ${invoice.invoiceNumber}`
    : (description || 'Payment');

  // Check if Razorpay is available
  if (!isRazorpayAvailable()) {
    return (
      <Alert className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Payment gateway is not configured. Please contact administrator.
        </AlertDescription>
      </Alert>
    );
  }

  // Validate inputs
  if (paymentAmount <= 0) {
    return (
      <Alert className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Invalid payment amount. Amount must be greater than zero.
        </AlertDescription>
      </Alert>
    );
  }

  const handlePayment = async () => {
    setIsProcessing(true);
    setPaymentStatus('processing');

    try {
      if (isInvoicePayment && invoice) {
        // Invoice payment
        await initiateRazorpayPayment(
          invoice,
          (razorpayResponse, verificationResult) => {
            console.log('Invoice payment successful:', { razorpayResponse, verificationResult });
            
            // Create payment record
            const paymentRecord = createPaymentFromRazorpay(
              invoice,
              razorpayResponse,
              verificationResult,
              paymentAmount
            );

            setPaymentStatus('success');
            setIsProcessing(false);

            toast({
              title: "Payment Successful",
              description: `Payment of ₹${paymentAmount.toFixed(2)} completed successfully`,
            });

            if (onPaymentSuccess) {
              onPaymentSuccess(paymentRecord);
            }
          },
          (error) => {
            console.error('Invoice payment error:', error);
            setPaymentStatus('error');
            setIsProcessing(false);

            const errorMessage = error instanceof Error ? error.message : 'Payment failed';
            
            toast({
              title: "Payment Failed",
              description: errorMessage,
              variant: "destructive",
            });

            if (onPaymentError) {
              onPaymentError(errorMessage);
            }
          }
        );
      } else {
        // Custom payment
        const metadata = {
          contact_id: contactId || '',
          customer_name: contactName || '',
          description: description || ''
        };

        await initiateCustomPayment(
          paymentAmount,
          paymentDescription,
          metadata,
          (razorpayResponse, verificationResult) => {
            console.log('Custom payment successful:', { razorpayResponse, verificationResult });
            
            // Create payment record
            const paymentRecord = createGenericPaymentRecord(
              razorpayResponse,
              verificationResult,
              contactId,
              contactName
            );

            setPaymentStatus('success');
            setIsProcessing(false);

            toast({
              title: "Payment Successful",
              description: `Payment of ₹${paymentAmount.toFixed(2)} completed successfully`,
            });

            if (onPaymentSuccess) {
              onPaymentSuccess(paymentRecord);
            }
          },
          (error) => {
            console.error('Custom payment error:', error);
            setPaymentStatus('error');
            setIsProcessing(false);

            const errorMessage = error instanceof Error ? error.message : 'Payment failed';
            
            toast({
              title: "Payment Failed",
              description: errorMessage,
              variant: "destructive",
            });

            if (onPaymentError) {
              onPaymentError(errorMessage);
            }
          }
        );
      }
    } catch (error) {
      console.error('Payment initiation error:', error);
      setPaymentStatus('error');
      setIsProcessing(false);

      const errorMessage = error instanceof Error ? error.message : 'Failed to initiate payment';
      
      toast({
        title: "Payment Error",
        description: errorMessage,
        variant: "destructive",
      });

      if (onPaymentError) {
        onPaymentError(errorMessage);
      }
    }
  };

  const getStatusBadge = () => {
    switch (paymentStatus) {
      case 'processing':
        return <Badge variant="secondary">Processing...</Badge>;
      case 'success':
        return <Badge variant="default" className="bg-green-500">Success</Badge>;
      case 'error':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return null;
    }
  };

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Razorpay Payment
          {getStatusBadge()}
        </CardTitle>
        <CardDescription>
          {paymentDescription}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Amount:</span>
            <span className="text-lg font-bold">₹{paymentAmount.toFixed(2)}</span>
          </div>
          
          {isInvoicePayment && invoice && (
            <>
              <div className="flex justify-between items-center text-sm">
                <span>Invoice:</span>
                <span>{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Customer:</span>
                <span>{invoice.customerName}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Total Amount:</span>
                <span>₹{invoice.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Paid Amount:</span>
                <span>₹{invoice.paidAmount.toFixed(2)}</span>
              </div>
            </>
          )}
          
          {!isInvoicePayment && contactName && (
            <div className="flex justify-between items-center text-sm">
              <span>Payee:</span>
              <span>{contactName}</span>
            </div>
          )}
        </div>

        <Button 
          onClick={handlePayment}
          disabled={disabled || isProcessing || paymentStatus === 'success'}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing Payment...
            </>
          ) : paymentStatus === 'success' ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Payment Completed
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4 mr-2" />
              Pay ₹{paymentAmount.toFixed(2)}
            </>
          )}
        </Button>

        {paymentStatus === 'success' && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Payment completed successfully! The transaction has been verified and recorded.
            </AlertDescription>
          </Alert>
        )}

        {paymentStatus === 'error' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Payment failed. Please try again or contact support if the issue persists.
            </AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-muted-foreground text-center">
          Powered by Razorpay • Secure payments
        </div>
      </CardContent>
    </Card>
  );
}