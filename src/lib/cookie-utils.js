/**
 * Cookie utility functions for managing authentication tokens
 * 
 * Note: Firebase custom tokens are single-use tokens. Once used to sign in,
 * Firebase maintains the session. The cookie is stored as a backup reference,
 * but Firebase Auth handles session persistence automatically.
 */

const TOKEN_COOKIE_NAME = 'lh_driver_auth_token';
const TOKEN_EXPIRY_DAYS = 1; // Token cookie expires in 1 day (Firebase handles actual session)

/**
 * Set a cookie with the given name and value
 */
export function setCookie(name, value, days = TOKEN_EXPIRY_DAYS) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  const expiresString = expires.toUTCString();
  
  // Set cookie with secure flags
  document.cookie = `${name}=${value};expires=${expiresString};path=/;SameSite=Strict;Secure=${window.location.protocol === 'https:'}`;
}

/**
 * Get a cookie by name
 */
export function getCookie(name) {
  const nameEQ = name + '=';
  const cookies = document.cookie.split(';');
  
  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i];
    while (cookie.charAt(0) === ' ') {
      cookie = cookie.substring(1, cookie.length);
    }
    if (cookie.indexOf(nameEQ) === 0) {
      return cookie.substring(nameEQ.length, cookie.length);
    }
  }
  return null;
}

/**
 * Delete a cookie by name
 */
export function deleteCookie(name) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Strict`;
}

/**
 * Save authentication token to cookie
 */
export function saveAuthToken(token) {
  setCookie(TOKEN_COOKIE_NAME, token, TOKEN_EXPIRY_DAYS);
}

/**
 * Get authentication token from cookie
 */
export function getAuthToken() {
  return getCookie(TOKEN_COOKIE_NAME);
}

/**
 * Clear authentication token from cookie
 */
export function clearAuthToken() {
  deleteCookie(TOKEN_COOKIE_NAME);
}

/**
 * Check if authentication token exists
 */
export function hasAuthToken() {
  return getAuthToken() !== null;
}

