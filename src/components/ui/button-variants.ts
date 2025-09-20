import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 touch-manipulation select-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground active:bg-accent/80",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70",
        ghost: "hover:bg-accent hover:text-accent-foreground active:bg-accent/80",
        link: "text-primary underline-offset-4 hover:underline active:text-primary/80",
      },
      size: {
        default: "h-10 px-4 py-2 min-h-[44px]", // Increased min-height for better touch targets
        sm: "h-9 rounded-md px-3 min-h-[40px]",
        lg: "h-11 rounded-md px-8 min-h-[48px]",
        icon: "h-10 w-10 min-h-[44px] min-w-[44px]", // Ensure minimum touch target size
        mobile: "h-12 px-6 py-3 text-base min-h-[48px]", // Larger size for mobile
      },
      responsive: {
        true: "sm:h-10 sm:px-4 sm:py-2 sm:text-sm h-12 px-6 py-3 text-base", // Responsive sizing
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      responsive: false,
    },
  }
);