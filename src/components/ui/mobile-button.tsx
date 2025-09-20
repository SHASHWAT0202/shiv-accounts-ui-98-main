import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button-variants";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  touchFeedback?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    responsive,
    asChild = false, 
    loading = false,
    touchFeedback = true,
    disabled,
    children,
    ...props 
  }, ref) => {
    const [isPressed, setIsPressed] = React.useState(false);
    
    const Comp = asChild ? Slot : "button";
    
    const handleTouchStart = () => {
      if (touchFeedback && !disabled) {
        setIsPressed(true);
      }
    };
    
    const handleTouchEnd = () => {
      if (touchFeedback) {
        setIsPressed(false);
      }
    };
    
    const isDisabled = disabled || loading;
    
    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, responsive }),
          // Touch feedback classes
          touchFeedback && isPressed && !isDisabled && "scale-95 transition-transform duration-100",
          // Loading state
          loading && "opacity-70 cursor-not-allowed",
          className
        )}
        ref={ref}
        disabled={isDisabled}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </Comp>
    );
  }
);

Button.displayName = "MobileButton";

export { Button };