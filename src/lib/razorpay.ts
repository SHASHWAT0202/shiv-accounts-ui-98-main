/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Invoice, Payment } from '@/types';

// Razorpay types (since @types/razorpay doesn't exist)
interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

interface RazorpayPaymentSuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayPaymentSuccessResponse) => void;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  theme: {
    color: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => {
      open(): void;
      close(): void;
    };
  }
}

// Razorpay configuration
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

if (!RAZORPAY_KEY_ID) {
  console.warn('Razorpay Key ID not configured. Payment functionality will be disabled.');
}

// API Configuration
interface CreateOrderRequest {
  amount: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}

interface CreateOrderResponse {
  success: boolean;
  order: {
    id: string;
    amount: number;
    currency: string;
    receipt: string;
    status: string;
  };
  error?: string;
  message?: string;
}

interface VerifyPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  invoice_id?: string;
  contact_id?: string;
  amount: number;
}

interface VerifyPaymentResponse {
  success: boolean;
  message: string;
  payment?: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    method: string;
    created_at: string;
  };
  error?: string;
}

// Load Razorpay script dynamically
export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

// Create Razorpay order via backend API
export const createRazorpayOrder = async (
  amount: number, 
  currency: string = 'INR', 
  receipt?: string,
  notes?: Record<string, string>
): Promise<RazorpayOrder> => {
  try {
    const requestBody: CreateOrderRequest = {
      amount,
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      notes: notes || {}
    };

    console.log('Creating order with backend API:', requestBody);

    const response = await fetch(`${API_BASE_URL}/payment/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data: CreateOrderResponse = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || data.error || 'Failed to create order');
    }

    console.log('Order created successfully:', data.order);

    return {
      id: data.order.id,
      amount: data.order.amount,
      currency: data.order.currency,
      receipt: data.order.receipt,
      status: data.order.status
    };

  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    throw new Error(`Failed to create payment order: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Verify payment via backend API
export const verifyRazorpayPayment = async (
  razorpayResponse: RazorpayPaymentSuccessResponse,
  amount: number,
  invoiceId?: string,
  contactId?: string
): Promise<VerifyPaymentResponse> => {
  try {
    const requestBody: VerifyPaymentRequest = {
      razorpay_order_id: razorpayResponse.razorpay_order_id,
      razorpay_payment_id: razorpayResponse.razorpay_payment_id,
      razorpay_signature: razorpayResponse.razorpay_signature,
      amount,
      invoice_id: invoiceId,
      contact_id: contactId
    };

    console.log('Verifying payment with backend API:', requestBody);

    const response = await fetch(`${API_BASE_URL}/payment/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data: VerifyPaymentResponse = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || data.error || 'Payment verification failed');
    }

    console.log('Payment verified successfully:', data.payment);
    return data;

  } catch (error) {
    console.error('Error verifying payment:', error);
    throw new Error(`Payment verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Initialize Razorpay payment with backend integration
export const initiateRazorpayPayment = async (
  invoice: Invoice,
  onSuccess: (paymentData: RazorpayPaymentSuccessResponse, verificationResult: VerifyPaymentResponse) => void,
  onError?: (error: any) => void
): Promise<void> => {
  if (!RAZORPAY_KEY_ID) {
    throw new Error('Razorpay is not configured. Please check your environment variables.');
  }

  // Load Razorpay script
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded) {
    throw new Error('Failed to load Razorpay script. Please check your internet connection.');
  }

  try {
    const paymentAmount = invoice.total - invoice.paidAmount; // Remaining amount
    
    // Create order via backend
    const order = await createRazorpayOrder(
      paymentAmount,
      'INR',
      invoice.invoiceNumber,
      {
        invoice_id: invoice.id,
        customer_name: invoice.customerName,
        customer_id: invoice.customerId
      }
    );

    console.log('Order created for payment:', order);

    // Razorpay options
    const options: RazorpayOptions = {
      key: RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      name: 'Shiv Accounts Cloud',
      description: `Payment for Invoice ${invoice.invoiceNumber}`,
      order_id: order.id,
      handler: async (response: RazorpayPaymentSuccessResponse) => {
        try {
          console.log('Payment successful, verifying...', response);
          
          // Verify payment with backend
          const verificationResult = await verifyRazorpayPayment(
            response,
            paymentAmount,
            invoice.id,
            invoice.customerId
          );
          
          console.log('Payment verification completed:', verificationResult);
          onSuccess(response, verificationResult);
          
        } catch (verificationError) {
          console.error('Payment verification failed:', verificationError);
          if (onError) {
            onError(new Error(`Payment completed but verification failed: ${verificationError instanceof Error ? verificationError.message : 'Unknown error'}`));
          }
        }
      },
      prefill: {
        name: invoice.customerName,
        email: '', // Would be fetched from customer data
        contact: '', // Would be fetched from customer data
      },
      theme: {
        color: '#3B82F6', // Primary blue color
      },
      modal: {
        ondismiss: () => {
          console.log('Razorpay payment modal dismissed');
          if (onError) {
            onError(new Error('Payment was cancelled by user'));
          }
        },
      },
    };

    // Open Razorpay checkout
    const razorpay = new window.Razorpay(options);
    
    // Add error handling for Razorpay initialization
    try {
      razorpay.open();
      console.log('Razorpay payment modal opened successfully');
    } catch (razorpayError) {
      console.error('Failed to open Razorpay modal:', razorpayError);
      if (onError) {
        onError(new Error('Failed to open payment modal'));
      }
    }
  } catch (error) {
    console.error('Error initiating payment:', error);
    if (onError) {
      onError(error);
    } else {
      throw error;
    }
  }
};

// Generic payment initiation function for custom amounts
export const initiateCustomPayment = async (
  amount: number,
  description: string,
  metadata: Record<string, string> = {},
  onSuccess: (paymentData: RazorpayPaymentSuccessResponse, verificationResult: VerifyPaymentResponse) => void,
  onError?: (error: any) => void
): Promise<void> => {
  if (!RAZORPAY_KEY_ID) {
    throw new Error('Razorpay is not configured. Please check your environment variables.');
  }

  // Load Razorpay script
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded) {
    throw new Error('Failed to load Razorpay script. Please check your internet connection.');
  }

  try {
    // Create order via backend
    const order = await createRazorpayOrder(
      amount,
      'INR',
      `receipt_${Date.now()}`,
      metadata
    );

    console.log('Custom payment order created:', order);

    // Razorpay options
    const options: RazorpayOptions = {
      key: RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      name: 'Shiv Accounts Cloud',
      description: description,
      order_id: order.id,
      handler: async (response: RazorpayPaymentSuccessResponse) => {
        try {
          console.log('Custom payment successful, verifying...', response);
          
          // Verify payment with backend
          const verificationResult = await verifyRazorpayPayment(
            response,
            amount,
            metadata.invoice_id,
            metadata.contact_id
          );
          
          console.log('Custom payment verification completed:', verificationResult);
          onSuccess(response, verificationResult);
          
        } catch (verificationError) {
          console.error('Custom payment verification failed:', verificationError);
          if (onError) {
            onError(new Error(`Payment completed but verification failed: ${verificationError instanceof Error ? verificationError.message : 'Unknown error'}`));
          }
        }
      },
      prefill: {
        name: metadata.customer_name || '',
        email: metadata.customer_email || '',
        contact: metadata.customer_phone || '',
      },
      theme: {
        color: '#3B82F6', // Primary blue color
      },
      modal: {
        ondismiss: () => {
          console.log('Custom payment modal dismissed');
          if (onError) {
            onError(new Error('Payment was cancelled by user'));
          }
        },
      },
    };

    // Open Razorpay checkout
    const razorpay = new window.Razorpay(options);
    
    try {
      razorpay.open();
      console.log('Custom payment modal opened successfully');
    } catch (razorpayError) {
      console.error('Failed to open custom payment modal:', razorpayError);
      if (onError) {
        onError(new Error('Failed to open payment modal'));
      }
    }
  } catch (error) {
    console.error('Error initiating custom payment:', error);
    if (onError) {
      onError(error);
    } else {
      throw error;
    }
  }
};

// Verify payment signature (for client-side validation only - backend verification is primary)
export const verifyPaymentSignature = (
  paymentId: string,
  orderId: string,
  signature: string
): boolean => {
  // Client-side verification is not secure as we don't have the secret key
  // This is just for basic validation - real verification happens on backend
  console.log('Client-side payment signature check:', { paymentId, orderId, signature });
  
  // Basic validation - check if all required fields are present
  return !!(paymentId && orderId && signature && 
    paymentId.startsWith('pay_') && 
    orderId.startsWith('order_'));
};

// Convert Razorpay payment to app Payment record
export const createPaymentFromRazorpay = (
  invoice: Invoice,
  razorpayResponse: RazorpayPaymentSuccessResponse,
  verificationResult: VerifyPaymentResponse,
  amount: number
): Omit<Payment, 'id'> => {
  return {
    type: 'Received',
    amount,
    date: new Date(),
    method: 'Online',
    reference: razorpayResponse.razorpay_payment_id,
    contactId: invoice.customerId,
    contactName: invoice.customerName,
    invoiceId: invoice.id,
    notes: `Online payment via Razorpay. Order ID: ${razorpayResponse.razorpay_order_id}. Backend Payment ID: ${verificationResult.payment?.id || 'Unknown'}`,
  };
};

// Create a generic payment record from verification result
export const createGenericPaymentRecord = (
  razorpayResponse: RazorpayPaymentSuccessResponse,
  verificationResult: VerifyPaymentResponse,
  contactId?: string,
  contactName?: string,
  invoiceId?: string
): Omit<Payment, 'id'> => {
  return {
    type: 'Received',
    amount: verificationResult.payment?.amount || 0,
    date: new Date(),
    method: 'Online',
    reference: razorpayResponse.razorpay_payment_id,
    contactId: contactId || '',
    contactName: contactName || 'Unknown',
    invoiceId: invoiceId,
    notes: `Online payment via Razorpay. Order ID: ${razorpayResponse.razorpay_order_id}. Backend Payment ID: ${verificationResult.payment?.id || 'Unknown'}`,
  };
};

// Check if Razorpay is available
export const isRazorpayAvailable = (): boolean => {
  return !!RAZORPAY_KEY_ID;
};

// Format amount for Razorpay (convert to paise)
export const formatAmountForRazorpay = (amount: number): number => {
  return Math.round(amount * 100);
};

// Format amount from Razorpay (convert from paise)
export const formatAmountFromRazorpay = (amountInPaise: number): number => {
  return amountInPaise / 100;
};