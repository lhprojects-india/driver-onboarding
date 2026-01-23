import * as React from "react";
import { cva } from "class-variance-authority";

import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shadow-sm",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-brand-blue text-white hover:bg-brand-shadeBlue shadow-md",
        secondary:
          "border-transparent bg-brand-lightTeal text-gray-900 hover:bg-brand-teal shadow-md",
        destructive:
          "border-transparent bg-brand-shadePink text-white hover:bg-brand-pink shadow-md",
        outline: "text-foreground border-2",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
