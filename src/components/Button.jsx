import { ArrowRight } from "lucide-react";
import React from "react";

const Button = React.forwardRef(({
  children,
  onClick,
  type = "button",
  showArrow = true,
  className = "",
  disabled = false,
}, ref) => {
  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      className={`laundryheap-btn flex items-center justify-center gap-2 ${className}`}
      disabled={disabled}
    >
      {children}
      {showArrow && <ArrowRight size={18} />}
    </button>
  );
});

Button.displayName = "Button";

export default Button;
