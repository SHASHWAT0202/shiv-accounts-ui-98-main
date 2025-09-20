import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./components/Layout/MainLayout";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import { AuthProvider, ProtectedRoute } from "./context/AuthContext";
import { TestPayment } from "./pages/TestPayment";
import { setupPreloading } from "./utils/performanceUtils";
import { 
  LazyDashboard,
  LazyReports,
  LazyContacts,
  LazyProducts,
  LazyInvoices,
  LazyPayments,
  LazyPaymentGateway
} from "./utils/performance";

// Lazy load remaining components
import { withLazyLoading } from "./utils/performance";

const LazyTaxMaster = withLazyLoading(() => import("./pages/masters/Tax"));
const LazyChartOfAccounts = withLazyLoading(() => import("./pages/masters/Accounts"));
const LazyPurchaseOrders = withLazyLoading(() => import("./pages/transactions/PurchaseOrders"));
const LazySalesOrders = withLazyLoading(() => import("./pages/transactions/SalesOrders"));
const LazyVendorBills = withLazyLoading(() => import("./pages/transactions/VendorBills"));
const LazyLedger = withLazyLoading(() => import("./pages/Ledger"));

const queryClient = new QueryClient();

// Setup preloading on app start
setupPreloading();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<LazyDashboard />} />
              <Route path="reports" element={<LazyReports />} />
              <Route path="ledger" element={<LazyLedger />} />
              <Route path="payment-gateway" element={<LazyPaymentGateway />} />
              <Route path="test-payment" element={<TestPayment />} />
            
              {/* Masters Routes */}
              <Route path="masters/contacts" element={<LazyContacts />} />
              <Route path="masters/products" element={<LazyProducts />} />
              <Route path="masters/tax" element={<LazyTaxMaster />} />
              <Route path="masters/accounts" element={<LazyChartOfAccounts />} />
            
              {/* Transactions Routes */}
              <Route path="transactions/purchase-orders" element={<LazyPurchaseOrders />} />
              <Route path="transactions/vendor-bills" element={<LazyVendorBills />} />
              <Route path="transactions/sales-orders" element={<LazySalesOrders />} />
              <Route path="transactions/invoices" element={<LazyInvoices />} />
              <Route path="transactions/payments" element={<LazyPayments />} />
            </Route>
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
