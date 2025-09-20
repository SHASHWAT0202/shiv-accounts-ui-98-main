/**
 * Service Worker registration and management utilities
 */

export interface ServiceWorkerConfig {
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private config: ServiceWorkerConfig = {};

  async register(swUrl: string, config: ServiceWorkerConfig = {}) {
    this.config = config;

    if (!('serviceWorker' in navigator)) {
      console.log('Service Worker not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register(swUrl);
      this.registration = registration;

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New content available
              this.config.onUpdate?.(registration);
            } else {
              // Content cached for offline use
              this.config.onSuccess?.(registration);
            }
          }
        });
      });

      // Handle controller change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });

      console.log('Service Worker registered successfully');
      this.config.onSuccess?.(registration);

    } catch (error) {
      console.error('Service Worker registration failed:', error);
      this.config.onError?.(error as Error);
    }
  }

  async unregister() {
    if (!this.registration) return false;

    try {
      const result = await this.registration.unregister();
      console.log('Service Worker unregistered');
      return result;
    } catch (error) {
      console.error('Service Worker unregistration failed:', error);
      return false;
    }
  }

  async update() {
    if (!this.registration) return;

    try {
      await this.registration.update();
      console.log('Service Worker update triggered');
    } catch (error) {
      console.error('Service Worker update failed:', error);
    }
  }

  skipWaiting() {
    if (!this.registration || !this.registration.waiting) return;

    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  async getVersion(): Promise<string | null> {
    if (!this.registration || !this.registration.active) return null;

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.version);
      };

      this.registration!.active!.postMessage(
        { type: 'GET_VERSION' },
        [messageChannel.port2]
      );
    });
  }

  // Cache management
  async clearCache(cacheName?: string) {
    if (!('caches' in window)) return;

    try {
      if (cacheName) {
        await caches.delete(cacheName);
      } else {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      console.log('Cache cleared');
    } catch (error) {
      console.error('Cache clearing failed:', error);
    }
  }

  async getCacheSize(): Promise<number> {
    if (!('caches' in window)) return 0;

    try {
      const cacheNames = await caches.keys();
      let totalSize = 0;

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        
        for (const key of keys) {
          const response = await cache.match(key);
          if (response) {
            const blob = await response.blob();
            totalSize += blob.size;
          }
        }
      }

      return totalSize;
    } catch (error) {
      console.error('Cache size calculation failed:', error);
      return 0;
    }
  }

  // Network status monitoring
  isOnline(): boolean {
    return navigator.onLine;
  }

  addNetworkStatusListener(callback: (isOnline: boolean) => void) {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }

  // Background sync (if supported)
  async requestBackgroundSync(tag: string) {
    if (!this.registration || !('serviceWorker' in navigator)) {
      console.log('Background Sync not supported');
      return;
    }

    try {
      // Type assertion for sync API
      const registration = this.registration as ServiceWorkerRegistration & {
        sync?: { register: (tag: string) => Promise<void> };
      };
      
      if (registration.sync) {
        await registration.sync.register(tag);
        console.log('Background sync registered:', tag);
      }
    } catch (error) {
      console.error('Background sync registration failed:', error);
    }
  }

  // Push notifications setup
  async subscribeToPush(vapidKey: string) {
    if (!this.registration || !('PushManager' in window)) {
      console.log('Push notifications not supported');
      return null;
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidKey) as BufferSource,
      });

      console.log('Push subscription created');
      return subscription;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return null;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

// Export singleton instance
export const serviceWorkerManager = new ServiceWorkerManager();

// Default registration function
export const registerServiceWorker = async (config?: ServiceWorkerConfig) => {
  const swUrl = `${import.meta.env.BASE_URL}sw.js`;
  await serviceWorkerManager.register(swUrl, config);
};

// Utility to show update available notification
export const showUpdateAvailableNotification = (registration: ServiceWorkerRegistration) => {
  // This can be integrated with your toast system
  console.log('New version available! Please refresh the page.');
  
  // Example with confirm dialog
  if (confirm('A new version is available. Would you like to update?')) {
    serviceWorkerManager.skipWaiting();
  }
};

// Performance monitoring utilities
export const measureCachePerformance = async () => {
  const startTime = performance.now();
  
  try {
    const cacheSize = await serviceWorkerManager.getCacheSize();
    const endTime = performance.now();
    
    return {
      cacheSize,
      accessTime: endTime - startTime,
    };
  } catch (error) {
    console.error('Cache performance measurement failed:', error);
    return { cacheSize: 0, accessTime: 0 };
  }
};

// Network quality detection
export const detectNetworkQuality = (): Promise<'slow' | 'medium' | 'fast'> => {
  return new Promise((resolve) => {
    const connection = (navigator as { connection?: { effectiveType?: string; downlink?: number } }).connection;
    
    if (connection) {
      const { effectiveType, downlink } = connection;
      
      if (effectiveType === 'slow-2g' || effectiveType === '2g' || (downlink && downlink < 1)) {
        resolve('slow');
      } else if (effectiveType === '3g' || (downlink && downlink < 5)) {
        resolve('medium');
      } else {
        resolve('fast');
      }
    } else {
      // Fallback: measure image load time
      const img = new Image();
      const startTime = Date.now();
      
      img.onload = () => {
        const loadTime = Date.now() - startTime;
        if (loadTime > 1000) resolve('slow');
        else if (loadTime > 500) resolve('medium');
        else resolve('fast');
      };
      
      img.onerror = () => resolve('slow');
      img.src = `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>')}`;
    }
  });
};