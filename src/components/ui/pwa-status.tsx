import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  X, 
  CheckCircle,
  AlertCircle,
  Smartphone
} from 'lucide-react';
import { serviceWorkerManager } from '@/utils/serviceWorker';

interface PWAStatusProps {
  onInstallPrompt?: () => void;
  className?: string;
}

export const PWAStatus: React.FC<PWAStatusProps> = ({ 
  onInstallPrompt,
  className 
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [cacheSize, setCacheSize] = useState<number>(0);
  const [networkSpeed, setNetworkSpeed] = useState<'slow' | 'medium' | 'fast'>('medium');

  useEffect(() => {
    // Network status listener
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Install prompt listener
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setIsInstallable(true);
      
      // Show install prompt after a delay
      setTimeout(() => {
        setShowInstallPrompt(true);
      }, 5000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check cache size
    serviceWorkerManager.getCacheSize().then(setCacheSize);

    // Detect network speed
    const connection = (navigator as { connection?: { effectiveType?: string; downlink?: number; addEventListener?: (event: string, callback: () => void) => void } })?.connection;
    if (connection) {
      const updateNetworkSpeed = () => {
        const { effectiveType, downlink } = connection;
        if (effectiveType === 'slow-2g' || effectiveType === '2g' || (downlink && downlink < 1)) {
          setNetworkSpeed('slow');
        } else if (effectiveType === '3g' || (downlink && downlink < 5)) {
          setNetworkSpeed('medium');
        } else {
          setNetworkSpeed('fast');
        }
      };
      
      updateNetworkSpeed();
      connection.addEventListener?.('change', updateNetworkSpeed);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (isInstallable) {
      onInstallPrompt?.();
      setShowInstallPrompt(false);
    }
  };

  const handleUpdateApp = () => {
    serviceWorkerManager.skipWaiting();
    setShowUpdatePrompt(false);
  };

  const formatCacheSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getNetworkBadgeColor = () => {
    switch (networkSpeed) {
      case 'slow': return 'destructive';
      case 'medium': return 'secondary';
      case 'fast': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <div className={className}>
      {/* Network Status */}
      <div className="flex items-center gap-2 mb-4">
        {isOnline ? (
          <div className="flex items-center gap-2 text-green-600">
            <Wifi className="h-4 w-4" />
            <span className="text-sm">Online</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-red-600">
            <WifiOff className="h-4 w-4" />
            <span className="text-sm">Offline</span>
          </div>
        )}
        
        <Badge variant={getNetworkBadgeColor()}>
          {networkSpeed.toUpperCase()}
        </Badge>
        
        {cacheSize > 0 && (
          <Badge variant="outline">
            Cache: {formatCacheSize(cacheSize)}
          </Badge>
        )}
      </div>

      {/* Update Available Notification */}
      {showUpdatePrompt && (
        <Card className="mb-4 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <RefreshCw className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900">Update Available</h4>
                <p className="text-sm text-blue-700 mt-1">
                  A new version of the app is ready. Update now for the latest features and improvements.
                </p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={handleUpdateApp}>
                    Update Now
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setShowUpdatePrompt(false)}
                  >
                    Later
                  </Button>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowUpdatePrompt(false)}
                className="h-auto p-1"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Install App Prompt */}
      {showInstallPrompt && (
        <Card className="mb-4 border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Smartphone className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-green-900">Install App</h4>
                <p className="text-sm text-green-700 mt-1">
                  Install Shiv Accounts on your device for a faster, app-like experience with offline access.
                </p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={handleInstallApp}>
                    <Download className="h-4 w-4 mr-2" />
                    Install
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setShowInstallPrompt(false)}
                  >
                    Not Now
                  </Button>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowInstallPrompt(false)}
                className="h-auto p-1"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Network Status Badge Component
export const NetworkStatusBadge: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4 text-red-600" />
            <span className="text-sm font-medium text-red-900">
              You're offline
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowDetails(!showDetails)}
              className="h-auto p-1"
            >
              <AlertCircle className="h-4 w-4" />
            </Button>
          </div>
          
          {showDetails && (
            <div className="mt-2 pt-2 border-t border-red-200">
              <p className="text-xs text-red-700">
                Some features may be limited. Changes will sync when you're back online.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// PWA Install Button Component
export const PWAInstallButton: React.FC<{ 
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
}> = ({ variant = 'default', size = 'default' }) => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('PWA installation accepted');
    }
    
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  if (!isInstallable) return null;

  return (
    <Button variant={variant} size={size} onClick={handleInstall}>
      <Download className="h-4 w-4 mr-2" />
      Install App
    </Button>
  );
};