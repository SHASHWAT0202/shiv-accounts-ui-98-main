const express = require('express');
const cors = require('cors');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 3001;

// Debug: Check environment variables
console.log('Environment check:');
console.log('Working directory:', process.cwd());
console.log('__dirname:', __dirname);
console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID ? 'Set' : 'Not set');
console.log('VITE_RAZORPAY_KEY_ID:', process.env.VITE_RAZORPAY_KEY_ID ? 'Set' : 'Not set');
console.log('RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? 'Set' : 'Not set');
console.log('VITE_RAZORPAY_KEY_SECRET:', process.env.VITE_RAZORPAY_KEY_SECRET ? 'Set' : 'Not set');
console.log('All env keys:', Object.keys(process.env).filter(key => key.includes('RAZOR')));

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET || process.env.VITE_RAZORPAY_KEY_SECRET,
});

// In-memory storage for demo (use database in production)
const payments = [];
const orders = [];

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Payment server is running' });
});

// Create Razorpay order
app.post('/api/payment/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt, notes } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        error: 'Invalid amount', 
        message: 'Amount must be greater than 0' 
      });
    }

    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      notes: notes || {},
    };

    console.log('Creating Razorpay order with options:', options);

    const order = await razorpay.orders.create(options);
    
    // Store order for verification later
    orders.push({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      status: order.status,
      created_at: new Date(),
      notes: order.notes
    });

    console.log('Order created successfully:', order.id);

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status
      }
    });

  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ 
      error: 'Order creation failed', 
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Verify payment
app.post('/api/payment/verify', async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      invoice_id,
      contact_id,
      amount 
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ 
        error: 'Missing payment details', 
        message: 'Order ID, Payment ID, and Signature are required' 
      });
    }

    // Generate expected signature
    const razorpay_secret = process.env.RAZORPAY_KEY_SECRET || process.env.VITE_RAZORPAY_KEY_SECRET;
    
    if (!razorpay_secret) {
      console.error('Razorpay secret key is not configured');
      return res.status(500).json({ 
        error: 'Configuration error', 
        message: 'Payment gateway is not properly configured' 
      });
    }

    const generated_signature = crypto
      .createHmac('sha256', razorpay_secret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    console.log('Payment verification:', {
      received_signature: razorpay_signature,
      generated_signature,
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id
    });

    if (generated_signature !== razorpay_signature) {
      console.error('Signature verification failed');
      return res.status(400).json({ 
        error: 'Invalid signature', 
        message: 'Payment verification failed due to signature mismatch' 
      });
    }

    // Find the order
    const order = orders.find(o => o.id === razorpay_order_id);
    if (!order) {
      return res.status(404).json({ 
        error: 'Order not found', 
        message: 'The specified order could not be found' 
      });
    }

    // Fetch payment details from Razorpay
    let paymentDetails;
    try {
      paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);
      console.log('Payment details fetched:', paymentDetails);
    } catch (fetchError) {
      console.error('Error fetching payment details:', fetchError);
      // Continue with verification even if we can't fetch details
    }

    // Store payment record
    const payment = {
      id: `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount: order.amount / 100, // Convert back to rupees
      currency: order.currency,
      status: paymentDetails?.status || 'captured',
      method: paymentDetails?.method || 'unknown',
      invoice_id,
      contact_id,
      created_at: new Date(),
      verified_at: new Date(),
      payment_details: paymentDetails
    };

    payments.push(payment);

    console.log('Payment verified and stored:', payment.id);

    res.json({
      success: true,
      message: 'Payment verified successfully',
      payment: {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        created_at: payment.created_at
      }
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ 
      error: 'Payment verification failed', 
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get payment details
app.get('/api/payment/:payment_id', (req, res) => {
  try {
    const { payment_id } = req.params;
    
    const payment = payments.find(p => p.id === payment_id || p.razorpay_payment_id === payment_id);
    
    if (!payment) {
      return res.status(404).json({ 
        error: 'Payment not found', 
        message: 'The specified payment could not be found' 
      });
    }

    res.json({
      success: true,
      payment: {
        id: payment.id,
        razorpay_payment_id: payment.razorpay_payment_id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        created_at: payment.created_at,
        verified_at: payment.verified_at
      }
    });

  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ 
      error: 'Failed to fetch payment', 
      message: error.message 
    });
  }
});

// List all payments
app.get('/api/payments', (req, res) => {
  try {
    const { invoice_id, contact_id, status, limit = 50 } = req.query;
    
    let filteredPayments = [...payments];
    
    if (invoice_id) {
      filteredPayments = filteredPayments.filter(p => p.invoice_id === invoice_id);
    }
    
    if (contact_id) {
      filteredPayments = filteredPayments.filter(p => p.contact_id === contact_id);
    }
    
    if (status) {
      filteredPayments = filteredPayments.filter(p => p.status === status);
    }

    // Sort by created_at desc and limit results
    filteredPayments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    filteredPayments = filteredPayments.slice(0, parseInt(limit));

    res.json({
      success: true,
      payments: filteredPayments.map(p => ({
        id: p.id,
        razorpay_payment_id: p.razorpay_payment_id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        method: p.method,
        invoice_id: p.invoice_id,
        contact_id: p.contact_id,
        created_at: p.created_at,
        verified_at: p.verified_at
      })),
      total: filteredPayments.length
    });

  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ 
      error: 'Failed to fetch payments', 
      message: error.message 
    });
  }
});

// Webhook endpoint for Razorpay (optional)
app.post('/api/payment/webhook', (req, res) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'];
    const webhookBody = JSON.stringify(req.body);
    
    // Verify webhook signature (optional but recommended)
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.warn('RAZORPAY_WEBHOOK_SECRET not configured');
    }
    
    const expectedSignature = webhookSecret ? crypto
      .createHmac('sha256', webhookSecret)
      .update(webhookBody)
      .digest('hex') : null;

    console.log('Webhook received:', req.body);

    // Process webhook event
    const event = req.body.event;
    const paymentEntity = req.body.payload?.payment?.entity;

    if (event === 'payment.captured' && paymentEntity) {
      console.log('Payment captured via webhook:', paymentEntity.id);
      // Update payment status in your database
    }

    res.json({ status: 'ok' });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong' 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not found', 
    message: `Route ${req.method} ${req.path} not found` 
  });
});

app.listen(port, () => {
  console.log(`Payment server running on port ${port}`);
  console.log(`Razorpay Key ID: ${process.env.VITE_RAZORPAY_KEY_ID ? 'Configured' : 'Missing'}`);
  console.log(`Razorpay Key Secret: ${process.env.VITE_RAZORPAY_KEY_SECRET ? 'Configured' : 'Missing'}`);
});

module.exports = app;
