import { ChangeEvent } from "react";

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  id,
  className = "",
  disabled = false,
}) {
  // Provide a no-op onChange handler for disabled/readOnly inputs to avoid React warnings
  const handleChange = disabled ? () => {} : onChange;
  
  return (
    <div className="input-container">
      <input
        id={id}
        type={type}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        readOnly={disabled}
        className={`laundryheap-input ${className}`}
      />
      {required && (
        <p className="text-xs text-center mt-1 text-white opacity-70">*This field is mandatory</p>
      )}
    </div>
  );
}

export default Input;
