import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva("inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0", {
  variants: {
    variant: {
      default: "bg-primary text-white hover:bg-primary-container",
      destructive: "bg-red-600 text-white hover:bg-red-700",
      outline: "border border-line bg-white text-primary hover:bg-surface-low",
      secondary: "bg-surface-container text-ink hover:bg-surface-high",
      ghost: "text-muted hover:bg-surface-low hover:text-primary",
      link: "text-primary underline-offset-4 hover:underline",
    },
    size: { default: "h-10 px-4 py-2", sm: "h-9 rounded-lg px-3 text-xs", lg: "h-11 px-6", icon: "size-10" },
  },
  defaultVariants: { variant: "default", size: "default" },
});
export function Button({ className, variant, size, asChild = false, ...props }: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
