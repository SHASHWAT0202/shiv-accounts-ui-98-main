import * as React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  compact?: boolean;
  touchFeedback?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hover = false, compact = false, touchFeedback = false, ...props }, ref) => {
    const [isPressed, setIsPressed] = React.useState(false);
    
    const handleTouchStart = () => {
      if (touchFeedback) {
        setIsPressed(true);
      }
    };
    
    const handleTouchEnd = () => {
      if (touchFeedback) {
        setIsPressed(false);
      }
    };
    
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg border bg-card text-card-foreground shadow-sm",
          // Mobile optimizations
          "touch-manipulation",
          // Hover effects
          hover && "transition-all duration-200 hover:shadow-md hover:bg-accent/5",
          // Compact mode for mobile
          compact && "p-3 text-sm",
          // Touch feedback
          touchFeedback && "cursor-pointer select-none",
          touchFeedback && isPressed && "scale-98 shadow-sm transition-transform duration-100",
          className
        )}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  compact?: boolean;
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, compact = false, ...props }, ref) => (
    <div 
      ref={ref} 
      className={cn(
        "flex flex-col space-y-1.5",
        compact ? "p-3 pb-2" : "p-4 sm:p-6",
        className
      )} 
      {...props} 
    />
  ),
);
CardHeader.displayName = "CardHeader";

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  size?: 'sm' | 'md' | 'lg';
  responsive?: boolean;
}

const CardTitle = React.forwardRef<HTMLParagraphElement, CardTitleProps>(
  ({ className, size = 'md', responsive = true, ...props }, ref) => {
    const sizeClasses = {
      sm: "text-lg font-semibold",
      md: "text-xl sm:text-2xl font-semibold",
      lg: "text-2xl sm:text-3xl font-bold",
    };
    
    return (
      <h3 
        ref={ref} 
        className={cn(
          "leading-none tracking-tight",
          responsive ? sizeClasses[size] : `text-${size === 'sm' ? 'lg' : size === 'md' ? '2xl' : '3xl'} font-semibold`,
          className
        )} 
        {...props} 
      />
    );
  }
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p 
      ref={ref} 
      className={cn(
        "text-sm sm:text-base text-muted-foreground leading-relaxed", 
        className
      )} 
      {...props} 
    />
  ),
);
CardDescription.displayName = "CardDescription";

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  compact?: boolean;
  scroll?: boolean;
}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, compact = false, scroll = false, ...props }, ref) => (
    <div 
      ref={ref} 
      className={cn(
        compact ? "p-3 pt-0" : "p-4 pt-0 sm:p-6 sm:pt-0",
        scroll && "overflow-auto max-h-96",
        className
      )} 
      {...props} 
    />
  ),
);
CardContent.displayName = "CardContent";

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  compact?: boolean;
  direction?: 'row' | 'column';
}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, compact = false, direction = 'row', ...props }, ref) => (
    <div 
      ref={ref} 
      className={cn(
        "flex items-center",
        compact ? "p-3 pt-0" : "p-4 pt-0 sm:p-6 sm:pt-0",
        direction === 'column' ? "flex-col space-y-2" : "space-x-2",
        // Mobile responsive
        "flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2",
        className
      )} 
      {...props} 
    />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
