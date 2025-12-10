import { createContext, useContext, useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useToast } from "../hooks/use-toast";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut } from "firebase/auth";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { isAuthorizedAdmin } from "../lib/admin-config";

const AdminAuthContext = createContext(undefined);

export function AdminAuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const { toast } = useToast();
  const location = useLocation();
  
  // Use ref to track admin route status - updates immediately, no async delays
  const isAdminRouteRef = useRef(false);
  
  // Update ref immediately when route changes
  useEffect(() => {
    const isAdmin = location.pathname.startsWith('/admin');
    isAdminRouteRef.current = isAdmin;
  }, [location.pathname]);
  
  // Check if current route is an admin route
  const isAdminRoute = location.pathname.startsWith('/admin');

  // Listen for authentication state changes
  // IMPORTANT: Only check admin authorization if user is on admin routes
  // Don't interfere with driver authentication flow
  useEffect(() => {
    // CRITICAL: Only listen to auth changes if we're on an admin route
    // Completely skip all auth processing for driver routes
    const currentPath = location.pathname;
    const isCurrentlyAdminRoute = currentPath.startsWith('/admin');
    
    if (!isCurrentlyAdminRoute) {
      // Not on admin route - completely disable admin auth context
      // Don't set up any listeners, don't check anything
      setIsAuthenticated(false);
      setIsAuthorized(false);
      setCurrentUser(null);
      setIsLoading(false);
      // Return early - no listener set up
      return () => {
        // Cleanup function - nothing to clean up since no listener was set
      };
    }
    
    let isListenerActive = true;
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // CRITICAL: Check ref FIRST (synchronous, no async delay)
      // This prevents ANY processing if not on admin route
      if (!isAdminRouteRef.current) {
        // Silently ignore - not on admin route
        return;
      }
      
      // Also check if listener was disabled
      if (!isListenerActive) {
        return;
      }
      
      // Double-check current path (for safety)
      const checkPath = window.location.pathname;
      if (!checkPath || !checkPath.startsWith('/admin')) {
        return;
      }

      if (firebaseUser) {
        // Get email from user object or token claims
        let userEmail = firebaseUser.email;
        
        if (!userEmail && firebaseUser.accessToken) {
          try {
            const idTokenResult = await firebaseUser.getIdTokenResult();
            userEmail = idTokenResult.claims.email || userEmail;
          } catch (tokenError) {
            // Silently handle token error
          }
        }
        
        // If no email, can't check authorization
        if (!userEmail) {
          setIsAuthenticated(false);
          setIsAuthorized(false);
          setCurrentUser(null);
          setIsLoading(false);
          return;
        }
        
        // User is authenticated, now check authorization (only on admin routes)
        const authorized = await checkAdminAuthorization(userEmail);
        
        if (authorized) {
          setIsAuthenticated(true);
          setIsAuthorized(true);
          setCurrentUser({
            email: userEmail,
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
          });
        } else {
          // User is authenticated but not authorized for admin
          // Only sign out if they're trying to access admin routes
          setIsAuthenticated(false);
          setIsAuthorized(false);
          setCurrentUser(null);
          await firebaseSignOut(auth);
          toast({
            title: "Access Denied",
            description: "Your email is not authorized to access the admin panel.",
            variant: "destructive",
          });
        }
      } else {
        // User is not authenticated
        setIsAuthenticated(false);
        setIsAuthorized(false);
        setCurrentUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      isListenerActive = false; // Disable listener before unsubscribing
      unsubscribe();
    };
  }, [toast, isAdminRoute, location.pathname]);

  // Check if email is authorized (check Firestore first, fallback to local config)
  const checkAdminAuthorization = async (email) => {
    if (!email) return false;
    
    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      // First, check Firestore authorized_emails collection
      try {
        const authorizedEmailRef = doc(db, 'authorized_emails', normalizedEmail);
        const authorizedEmailDoc = await getDoc(authorizedEmailRef);
        
        if (authorizedEmailDoc.exists()) {
          // Email found in Firestore - authorized
          return true;
        }
      } catch (firestoreError) {
        // If Firestore check fails (e.g., permission denied), fall back to local config
        console.warn('Could not check Firestore authorized_emails, falling back to local config:', firestoreError);
      }
      
      // Fallback to local configuration for backwards compatibility
      const authorized = isAuthorizedAdmin(email);
      return authorized;
    } catch (error) {
      console.error('Error checking admin authorization:', error);
      return false;
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      const result = await signInWithPopup(auth, provider);
      
      // Force token refresh to ensure email is in the token for Firestore rules
      try {
        await result.user.getIdTokenResult(true); // Force refresh
      } catch (tokenError) {
        // Silently handle token refresh error
      }
      
      // Check authorization after successful authentication
      const authorized = await checkAdminAuthorization(result.user.email);
      
      if (!authorized) {
        await firebaseSignOut(auth);
        toast({
          title: "Access Denied",
          description: "Your email is not authorized to access the admin panel.",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Welcome to Admin Panel",
        description: "You have successfully signed in.",
      });
      return true;
    } catch (error) {
      console.error('Error signing in:', error);
      toast({
        title: "Sign in failed",
        description: "Unable to sign in. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
      setIsAuthenticated(false);
      setIsAuthorized(false);
      toast({
        title: "Signed out successfully",
        description: "You have been signed out.",
      });
      return true;
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Sign out failed",
        description: "Unable to sign out. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const value = {
    currentUser,
    isAuthenticated,
    isAuthorized,
    isLoading,
    signInWithGoogle,
    signOut,
  };

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
}
