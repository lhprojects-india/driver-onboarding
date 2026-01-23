import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"

import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 transform hover:scale-[1.02]",
  {
    variants: {
      variant: {
        default: "bg-brand-blue text-white hover:bg-brand-shadeBlue shadow-md hover:shadow-lg",
        destructive:
          "bg-brand-shadePink text-white hover:bg-brand-pink shadow-md hover:shadow-lg",
        outline:
          "border-2 border-brand-blue bg-background hover:bg-brand-lightBlue hover:text-brand-shadeBlue text-brand-blue shadow-sm hover:shadow-md",
        secondary:
          "bg-brand-lightTeal text-gray-900 hover:bg-brand-teal shadow-md hover:shadow-lg",
        ghost: "hover:bg-brand-lightBlue hover:text-brand-blue",
        link: "text-brand-blue underline-offset-4 hover:underline hover:text-brand-shadeBlue",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
