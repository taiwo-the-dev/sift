import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-transparent text-sm font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-200 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md",
        brand:
          "bg-brand text-brand-foreground shadow-sm hover:bg-brand-hover hover:shadow-md",
        outline:
          "border-border bg-background text-foreground shadow-xs hover:border-input hover:bg-muted",
        ghost: "text-foreground hover:bg-muted",
      },
      size: {
        default: "h-9 gap-2 px-3.5",
        sm: "h-8 gap-1.5 px-3 text-xs",
        lg: "h-12 gap-2 px-5 text-sm",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
