import { useState, useRef, useEffect, useCallback } from 'react';
import { NetworkOptimizer } from '@/utils/performanceUtils';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  quality?: 'low' | 'medium' | 'high' | 'auto';
  lazy?: boolean;
  placeholder?: string;
  fallback?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  quality = 'auto',
  lazy = true,
  placeholder,
  fallback,
  className,
  onLoad,
  onError,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const imgRef = useRef<HTMLImageElement>(null);
  const [currentSrc, setCurrentSrc] = useState<string>('');

  // Get optimal quality based on network conditions
  const getOptimalQuality = useCallback(() => {
    if (quality === 'auto') {
      return NetworkOptimizer.getOptimalImageQuality();
    }
    return quality;
  }, [quality]);

  // Generate optimized image URLs
  const generateOptimizedSrc = useCallback((originalSrc: string, targetQuality: string) => {
    // For demo purposes, we'll use URL parameters to indicate quality
    // In production, you would integrate with image optimization services like:
    // - Cloudinary
    // - ImageKit
    // - AWS CloudFront
    // - Vercel Image Optimization
    
    const url = new URL(originalSrc, window.location.origin);
    url.searchParams.set('quality', targetQuality);
    url.searchParams.set('format', 'webp');
    
    if (width) url.searchParams.set('w', width.toString());
    if (height) url.searchParams.set('h', height.toString());
    
    return url.toString();
  }, [width, height]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before image enters viewport
        threshold: 0.1,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, isInView]);

  // Update src when component mounts or network conditions change
  useEffect(() => {
    if (isInView) {
      const optimalQuality = getOptimalQuality();
      const optimizedSrc = generateOptimizedSrc(src, optimalQuality);
      setCurrentSrc(optimizedSrc);
    }
  }, [src, isInView, quality]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    if (fallback && currentSrc !== fallback) {
      setCurrentSrc(fallback);
      setHasError(false);
    } else {
      onError?.();
    }
  };

  // Show placeholder while loading
  if (!isInView || (!isLoaded && !hasError)) {
    return (
      <div
        ref={imgRef}
        className={`bg-gray-200 animate-pulse flex items-center justify-center ${className}`}
        style={{ width, height }}
        {...props}
      >
        {placeholder ? (
          <img src={placeholder} alt={alt} className="opacity-50" />
        ) : (
          <svg
            className="w-8 h-8 text-gray-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
    );
  }

  // Show error state
  if (hasError && !fallback) {
    return (
      <div
        className={`bg-red-100 border border-red-300 rounded flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <span className="text-red-600 text-sm">Failed to load image</span>
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={currentSrc}
      alt={alt}
      width={width}
      height={height}
      className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
      onLoad={handleLoad}
      onError={handleError}
      loading={lazy ? 'lazy' : 'eager'}
      decoding="async"
      {...props}
    />
  );
};

// Progressive image component for critical images
export const ProgressiveImage: React.FC<OptimizedImageProps & {
  lowQualitySrc?: string;
}> = ({ lowQualitySrc, ...props }) => {
  const [isHighQualityLoaded, setIsHighQualityLoaded] = useState(false);
  
  return (
    <div className="relative">
      {/* Low quality image loads first */}
      {lowQualitySrc && !isHighQualityLoaded && (
        <OptimizedImage
          {...props}
          src={lowQualitySrc}
          quality="low"
          lazy={false}
          className={`absolute inset-0 blur-sm scale-105 ${props.className}`}
        />
      )}
      
      {/* High quality image */}
      <OptimizedImage
        {...props}
        onLoad={() => {
          setIsHighQualityLoaded(true);
          props.onLoad?.();
        }}
        className={`transition-opacity duration-500 ${
          isHighQualityLoaded ? 'opacity-100' : 'opacity-0'
        } ${props.className}`}
      />
    </div>
  );
};

// Responsive image component
export const ResponsiveImage: React.FC<OptimizedImageProps & {
  srcSet?: {
    mobile: string;
    tablet: string;
    desktop: string;
  };
}> = ({ srcSet, ...props }) => {
  const [currentSrc, setCurrentSrc] = useState(props.src);
  
  useEffect(() => {
    const updateSrc = () => {
      if (!srcSet) return;
      
      const width = window.innerWidth;
      if (width < 768) {
        setCurrentSrc(srcSet.mobile);
      } else if (width < 1024) {
        setCurrentSrc(srcSet.tablet);
      } else {
        setCurrentSrc(srcSet.desktop);
      }
    };
    
    updateSrc();
    window.addEventListener('resize', updateSrc);
    
    return () => window.removeEventListener('resize', updateSrc);
  }, [srcSet]);
  
  return <OptimizedImage {...props} src={currentSrc} />;
};