import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Higher-order component for lazy loading with loading state
 */
interface LazyComponentOptions {
  fallback?: React.ReactNode;
  delay?: number;
  minLoadingTime?: number;
}

export function withLazyLoading(
  importFunc: () => Promise<{ default: React.ComponentType }>,
  options: LazyComponentOptions = {}
) {
  const {
    fallback = (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    ),
    delay = 200,
    minLoadingTime = 300,
  } = options;

  // Create lazy component with minimum loading time
  const LazyComponent = lazy(async () => {
    const startTime = Date.now();
    const componentPromise = importFunc();
    
    // Ensure minimum loading time for better UX
    const [component] = await Promise.all([
      componentPromise,
      new Promise(resolve => setTimeout(resolve, Math.max(0, minLoadingTime - (Date.now() - startTime))))
    ]);
    
    return component;
  });

  return function WrappedComponent(props: Record<string, unknown>) {
    return (
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// Export lazy-loaded components for immediate use
export const LazyDashboard = withLazyLoading(
  () => import('@/pages/Dashboard'),
  { minLoadingTime: 200 }
);

export const LazyInvoices = withLazyLoading(
  () => import('@/pages/transactions/Invoices'),
  { minLoadingTime: 300 }
);

export const LazyContacts = withLazyLoading(
  () => import('@/pages/masters/Contacts'),
  { minLoadingTime: 250 }
);

export const LazyProducts = withLazyLoading(
  () => import('@/pages/masters/Products'),
  { minLoadingTime: 250 }
);

export const LazyPayments = withLazyLoading(
  () => import('@/pages/transactions/Payments'),
  { minLoadingTime: 300 }
);

export const LazyReports = withLazyLoading(
  () => import('@/pages/Reports'),
  { minLoadingTime: 400 }
);

export const LazyPaymentGateway = withLazyLoading(
  () => import('@/pages/PaymentGateway'),
  { minLoadingTime: 300 }
);