import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from './loading-spinner';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  placeholderClassName?: string;
  quality?: number;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className,
  placeholderClassName,
  quality = 75,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    // Reset states when src changes
    setIsLoading(true);
    setError(false);

    const img = new Image();
    img.src = src;

    img.onload = () => {
      setCurrentSrc(src);
      setIsLoading(false);
    };

    img.onerror = () => {
      setError(true);
      setIsLoading(false);
    };

    // Generate low-quality placeholder
    const generatePlaceholder = async () => {
      try {
        const response = await fetch(src);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setCurrentSrc(base64data);
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        console.error('Error generating placeholder:', err);
      }
    };

    generatePlaceholder();

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  if (error) {
    return (
      <div 
        className={cn(
          'bg-gray-100 flex items-center justify-center',
          className
        )}
        {...props}
      >
        <span className="text-sm text-gray-500">Failed to load image</span>
      </div>
    );
  }

  return (
    <div className="relative">
      {isLoading && (
        <div 
          className={cn(
            'absolute inset-0 flex items-center justify-center bg-gray-100',
            placeholderClassName
          )}
        >
          <LoadingSpinner size="sm" />
        </div>
      )}
      <img
        src={currentSrc}
        alt={alt}
        className={cn(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100',
          className
        )}
        loading="lazy"
        decoding="async"
        {...props}
      />
    </div>
  );
}; 