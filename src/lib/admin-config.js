/**
 * Admin Configuration
 * 
 * This file contains the list of authorized admin emails.
 * In production, you might want to move this to environment variables
 * or a more secure configuration system.
 */

// List of authorized admin emails
export const AUTHORIZED_ADMIN_EMAILS = [
  'hari@laundryheap.com',
  'admin@laundryheap.com',
  'bharath@laundryheap.com',
  'sudhanva@laundryheap.com',
  // Add more authorized emails here
];

/**
 * Check if an email is authorized to access the admin panel
 * @param {string} email - The email to check
 * @returns {boolean} - True if authorized, false otherwise
 */
export function isAuthorizedAdmin(email) {
  if (!email) return false;
  
  const normalizedEmail = email.toLowerCase().trim();
  return AUTHORIZED_ADMIN_EMAILS.some(authorizedEmail => 
    authorizedEmail.toLowerCase() === normalizedEmail
  );
}
