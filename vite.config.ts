import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Optimize for mobile and 4G networks
    target: ['es2015', 'chrome58', 'firefox57', 'safari11'],
    rollupOptions: {
      output: {
        // Manual chunk splitting for optimal loading
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@radix-ui/react-slot', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-charts': ['recharts'],
          'vendor-utils': ['clsx', 'class-variance-authority', 'date-fns'],
          
          // Feature chunks
          'auth': ['./src/context/AuthContext.tsx', './src/pages/Login.tsx'],
          'dashboard': ['./src/pages/Dashboard.tsx'],
          'masters': [
            './src/pages/masters/Contacts.tsx',
            './src/pages/masters/Products.tsx',
            './src/pages/masters/Tax.tsx',
            './src/pages/masters/Accounts.tsx'
          ],
          'transactions': [
            './src/pages/transactions/Invoices.tsx',
            './src/pages/transactions/Payments.tsx',
            './src/pages/transactions/PurchaseOrders.tsx',
            './src/pages/transactions/SalesOrders.tsx',
            './src/pages/transactions/VendorBills.tsx'
          ],
          'reports': ['./src/pages/Reports.tsx', './src/pages/Ledger.tsx'],
          'payments': ['./src/pages/PaymentGateway.tsx', './src/pages/TestPayment.tsx'],
        },
        // Optimize chunk naming for caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? 
            chunkInfo.facadeModuleId.split('/').pop()?.replace('.tsx', '').replace('.ts', '') : 
            'chunk';
          return `assets/[name]-[hash].js`;
        },
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') ?? [];
          const extType = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            return `assets/images/[name]-[hash].[ext]`;
          }
          if (/css/i.test(extType)) {
            return `assets/css/[name]-[hash].[ext]`;
          }
          return `assets/[name]-[hash].[ext]`;
        },
      },
    },
    // Optimize chunk size for mobile networks
    chunkSizeWarningLimit: 1000,
    // Enable source maps for debugging but optimize for production
    sourcemap: false,
    // Minify for smaller bundle size
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  // Performance optimizations
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'recharts',
      'clsx',
      'class-variance-authority',
    ],
    exclude: ['@vite/client', '@vite/env'],
  },
  // Enable preload for critical resources
  experimental: {
    renderBuiltUrl(filename) {
      return {
        relative: true,
        runtime: `window.__vitePreload("${filename}")`,
      };
    },
  },
}));
