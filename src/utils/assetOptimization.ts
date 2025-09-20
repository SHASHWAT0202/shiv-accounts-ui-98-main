/**
 * Asset optimization utilities for mobile and 4G networks
 */

// Font loading optimization
export class FontOptimizer {
  private static loadedFonts = new Set<string>();
  
  static preloadFont(fontFamily: string, weight = '400', display = 'swap') {
    if (this.loadedFonts.has(fontFamily)) return;
    
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'font';
    link.type = 'font/woff2';
    link.crossOrigin = 'anonymous';
    link.href = `https://fonts.gstatic.com/s/${fontFamily.toLowerCase()}/v1/${fontFamily.toLowerCase()}-${weight}.woff2`;
    
    document.head.appendChild(link);
    this.loadedFonts.add(fontFamily);
  }
  
  static loadGoogleFont(fontFamily: string, weights: string[] = ['400'], display = 'swap') {
    const weightsStr = weights.join(',');
    const fontUrl = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(' ', '+')}:wght@${weightsStr}&display=${display}`;
    
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = fontUrl;
    document.head.appendChild(link);
  }
  
  static enableFontDisplay() {
    // Add font-display: swap to existing fonts
    const style = document.createElement('style');
    style.textContent = `
      @font-face {
        font-family: system-ui;
        font-display: swap;
      }
      * {
        font-display: swap;
      }
    `;
    document.head.appendChild(style);
  }
}

// CSS optimization
export class CSSOptimizer {
  static inlineCriticalCSS(css: string) {
    const style = document.createElement('style');
    style.textContent = css;
    style.setAttribute('data-critical', 'true');
    document.head.appendChild(style);
  }
  
  static async loadNonCriticalCSS(href: string) {
    return new Promise<void>((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.media = 'print'; // Load with low priority
      link.onload = () => {
        link.media = 'all'; // Apply styles after load
        resolve();
      };
      link.onerror = reject;
      document.head.appendChild(link);
    });
  }
  
  static removeUnusedCSS() {
    // This would typically be done at build time
    // But we can remove some runtime styles if needed
    const unusedSelectors = [
      '.unused-class',
      '.debug-only',
      '.development-only'
    ];
    
    const styleSheets = Array.from(document.styleSheets);
    styleSheets.forEach(sheet => {
      try {
        const rules = Array.from(sheet.cssRules || []);
        rules.forEach((rule, index) => {
          if (rule instanceof CSSStyleRule) {
            if (unusedSelectors.some(selector => rule.selectorText?.includes(selector))) {
              sheet.deleteRule(index);
            }
          }
        });
      } catch (e) {
        // Can't access cross-origin stylesheets
      }
    });
  }
}

// JavaScript optimization
export class JSOptimizer {
  static preloadModule(modulePath: string) {
    const link = document.createElement('link');
    link.rel = 'modulepreload';
    link.href = modulePath;
    document.head.appendChild(link);
  }
  
  static async loadModuleWhenIdle(importFunc: () => Promise<unknown>) {
    return new Promise((resolve) => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(async () => {
          const module = await importFunc();
          resolve(module);
        });
      } else {
        setTimeout(async () => {
          const module = await importFunc();
          resolve(module);
        }, 100);
      }
    });
  }
  
  static enableTreeShaking() {
    // Mark unused exports for build tools
    if (import.meta.env.DEV) {
      console.log('Tree shaking enabled - unused exports will be removed in production');
    }
  }
}

// Resource hints optimization
export class ResourceHints {
  static addDNSPrefetch(domains: string[]) {
    domains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = `//${domain}`;
      document.head.appendChild(link);
    });
  }
  
  static addPreconnect(urls: string[]) {
    urls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = url;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  }
  
  static addPrefetch(urls: string[]) {
    urls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      document.head.appendChild(link);
    });
  }
  
  static addPreload(url: string, as: string, type?: string) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = as;
    if (type) link.type = type;
    document.head.appendChild(link);
  }
}

// Compression utilities
export class CompressionOptimizer {
  static enableGzip() {
    // This is typically handled by the server
    // But we can add headers to request compressed content
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Accept-Encoding';
    meta.content = 'gzip, deflate, br';
    document.head.appendChild(meta);
  }
  
  static compressJSON(data: object): string {
    // Simple JSON compression by removing whitespace
    return JSON.stringify(data).replace(/\s+/g, '');
  }
  
  static async loadCompressedImage(url: string): Promise<Blob> {
    const response = await fetch(url, {
      headers: {
        'Accept': 'image/webp,image/avif,image/*,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
      },
    });
    
    return response.blob();
  }
}

// Asset bundling optimization
export class BundleOptimizer {
  private static loadedChunks = new Set<string>();
  
  static async loadChunk(chunkName: string, importFunc: () => Promise<unknown>) {
    if (this.loadedChunks.has(chunkName)) {
      return;
    }
    
    this.loadedChunks.add(chunkName);
    
    try {
      await importFunc();
      console.log(`Chunk ${chunkName} loaded successfully`);
    } catch (error) {
      console.error(`Failed to load chunk ${chunkName}:`, error);
      this.loadedChunks.delete(chunkName);
    }
  }
  
  static preloadCriticalChunks() {
    // Preload the most important chunks
    const criticalChunks = [
      { name: 'auth', import: () => import('@/context/AuthContext') },
      { name: 'dashboard', import: () => import('@/pages/Dashboard') },
      { name: 'ui-components', import: () => import('@/components/ui/button') },
    ];
    
    criticalChunks.forEach(chunk => {
      JSOptimizer.preloadModule(chunk.name);
    });
  }
  
  static async loadRouteChunk(routeName: string) {
    const routeImports: Record<string, () => Promise<unknown>> = {
      'dashboard': () => import('@/pages/Dashboard'),
      'contacts': () => import('@/pages/masters/Contacts'),
      'products': () => import('@/pages/masters/Products'),
      'invoices': () => import('@/pages/transactions/Invoices'),
      'payments': () => import('@/pages/transactions/Payments'),
      'reports': () => import('@/pages/Reports'),
    };
    
    const importFunc = routeImports[routeName];
    if (importFunc) {
      return this.loadChunk(routeName, importFunc);
    }
  }
}

// Mobile-specific optimizations
export class MobileOptimizer {
  static optimizeForMobile() {
    // Disable hover effects on touch devices
    if ('ontouchstart' in window) {
      document.documentElement.classList.add('touch-device');
      const style = document.createElement('style');
      style.textContent = `
        .touch-device *:hover {
          /* Disable hover effects on touch devices */
        }
        
        .touch-device * {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
        }
        
        .touch-device input, .touch-device textarea, .touch-device [contenteditable] {
          -webkit-user-select: text;
          user-select: text;
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  static optimizeScrolling() {
    // Enable smooth scrolling
    document.documentElement.style.scrollBehavior = 'smooth';
    
    // Add momentum scrolling for iOS
    const style = document.createElement('style');
    style.textContent = `
      * {
        -webkit-overflow-scrolling: touch;
      }
      
      /* Optimize scroll performance */
      .scroll-container {
        transform: translateZ(0);
        will-change: scroll-position;
      }
    `;
    document.head.appendChild(style);
  }
  
  static enablePullToRefresh() {
    let startY = 0;
    let currentY = 0;
    const pullThreshold = 100;
    
    document.addEventListener('touchstart', (e) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
      }
    });
    
    document.addEventListener('touchmove', (e) => {
      if (window.scrollY === 0 && startY) {
        currentY = e.touches[0].clientY;
        const pullDistance = currentY - startY;
        
        if (pullDistance > pullThreshold) {
          // Trigger refresh
          window.location.reload();
        }
      }
    });
    
    document.addEventListener('touchend', () => {
      startY = 0;
      currentY = 0;
    });
  }
}

// Main optimization initializer
export const initializeAssetOptimizations = () => {
  // Font optimizations
  FontOptimizer.enableFontDisplay();
  
  // Resource hints
  ResourceHints.addDNSPrefetch([
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'api.example.com', // Replace with your API domain
  ]);
  
  ResourceHints.addPreconnect([
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
  ]);
  
  // Bundle optimizations
  BundleOptimizer.preloadCriticalChunks();
  
  // Mobile optimizations
  MobileOptimizer.optimizeForMobile();
  MobileOptimizer.optimizeScrolling();
  
  // Compression
  CompressionOptimizer.enableGzip();
  
  // Clean up unused CSS (be careful with this in production)
  if (import.meta.env.PROD) {
    setTimeout(() => {
      CSSOptimizer.removeUnusedCSS();
    }, 5000); // Wait for initial render
  }
  
  console.log('Asset optimizations initialized');
};