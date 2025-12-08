// Data validation utilities for the driver onboarding process

export const validationRules = {
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: "Please enter a valid email address"
  },
  name: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-Z\s]+$/,
    message: "Name must be 2-50 characters and contain only letters and spaces"
  },
  phone: {
    required: true,
    pattern: /^[+]?[0-9\s\-()]{10,15}$/,
    message: "Please enter a valid phone number"
  },
  city: {
    required: true,
    message: "Please select a city"
  },
  vehicle: {
    required: true,
    minLength: 3,
    maxLength: 50,
    message: "Vehicle description must be 3-50 characters"
  },
  licensePlate: {
    required: true,
    minLength: 3,
    maxLength: 20,
    pattern: /^[A-Z0-9\s-]+$/i,
    message: "License plate must be 3-20 characters and contain only letters, numbers, spaces, and hyphens"
  },
  address: {
    required: true,
    minLength: 10,
    maxLength: 200,
    message: "Address must be 10-200 characters"
  },
  otp: {
    required: true,
    pattern: /^\d{6}$/,
    message: "Please enter a valid 6-digit verification code"
  }
};

export const validateField = (fieldName, value) => {
  const rules = validationRules[fieldName];
  if (!rules) return { isValid: true, message: "" };

  const errors = [];

  // Check required
  if (rules.required && (!value || value.toString().trim() === "")) {
    errors.push("This field is required");
  }

  // If field has value, check other rules
  if (value && value.toString().trim() !== "") {
    // Check min length
    if (rules.minLength && value.length < rules.minLength) {
      errors.push(`Must be at least ${rules.minLength} characters`);
    }

    // Check max length
    if (rules.maxLength && value.length > rules.maxLength) {
      errors.push(`Must be no more than ${rules.maxLength} characters`);
    }

    // Check pattern
    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push(rules.message || "Invalid format");
    }
  }

  return {
    isValid: errors.length === 0,
    message: errors.join(", ")
  };
};

// Sanitize input data
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 1000); // Limit length
};

// Validate and sanitize all form data
export const validateAndSanitize = (formData) => {
  const sanitizedData = {};
  const errors = {};

  Object.keys(formData).forEach(fieldName => {
    const value = formData[fieldName];
    const sanitizedValue = sanitizeInput(value);

    sanitizedData[fieldName] = sanitizedValue;

    const validation = validateField(fieldName, sanitizedValue);
    if (!validation.isValid) {
      errors[fieldName] = validation.message;
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    data: sanitizedData,
    errors
  };
};
