import React, { useState } from 'react';
import { CreditCard, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import PaymentComponent from './payment-component';
import type { Invoice, Payment } from '@/types';

interface PaymentModalProps {
  // Trigger component
  trigger?: React.ReactNode;
  
  // Modal props
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  
  // Payment props
  invoice?: Invoice;
  amount?: number;
  description?: string;
  contactId?: string;
  contactName?: string;
  
  // Callbacks
  onPaymentSuccess?: (payment: Omit<Payment, 'id'>) => void;
  onPaymentError?: (error: string) => void;
  
  // Styling
  className?: string;
}

export default function PaymentModal({
  trigger,
  open,
  onOpenChange,
  invoice,
  amount,
  description,
  contactId,
  contactName,
  onPaymentSuccess,
  onPaymentError,
  className = ''
}: PaymentModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Use controlled or uncontrolled state
  const modalOpen = open !== undefined ? open : isOpen;
  const setModalOpen = onOpenChange || setIsOpen;

  const handlePaymentSuccess = (payment: Omit<Payment, 'id'>) => {
    if (onPaymentSuccess) {
      onPaymentSuccess(payment);
    }
    // Close modal on successful payment
    setModalOpen(false);
  };

  const handlePaymentError = (error: string) => {
    if (onPaymentError) {
      onPaymentError(error);
    }
    // Keep modal open on error so user can retry
  };

  const defaultTrigger = (
    <Button variant="default" className="gap-2">
      <CreditCard className="h-4 w-4" />
      Make Payment
    </Button>
  );

  const modalTitle = invoice 
    ? `Pay Invoice ${invoice.invoiceNumber}`
    : 'Make Payment';

  const modalDescription = invoice
    ? `Complete payment for invoice ${invoice.invoiceNumber} to ${invoice.customerName}`
    : description || 'Complete your payment securely with Razorpay';

  return (
    <Dialog open={modalOpen} onOpenChange={setModalOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      
      <DialogContent className={`sm:max-w-md ${className}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {modalTitle}
          </DialogTitle>
          <DialogDescription>
            {modalDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <PaymentComponent
            invoice={invoice}
            amount={amount}
            description={description}
            contactId={contactId}
            contactName={contactName}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
          />
        </div>

        <div className="flex justify-end mt-4">
          <Button
            variant="outline"
            onClick={() => setModalOpen(false)}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}