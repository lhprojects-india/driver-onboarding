import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Loader2, Shield } from "lucide-react";

export default function AdminLogin() {
  const { signInWithGoogle, isLoading, isAuthenticated, isAuthorized } = useAdminAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const navigate = useNavigate();

  // Add admin-page class to body to enable text selection
  useEffect(() => {
    document.body.classList.add('admin-page');
    
    // Cleanup: remove class when component unmounts
    return () => {
      document.body.classList.remove('admin-page');
    };
  }, []);

  // Redirect to admin dashboard if already authenticated and authorized
  useEffect(() => {
    if (isAuthenticated && isAuthorized) {
      navigate('/admin', { replace: true });
    }
  }, [isAuthenticated, isAuthorized, navigate]);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const success = await signInWithGoogle();
      if (success) {
        navigate('/admin', { replace: true });
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  // Show loading if user is authenticated and we're redirecting
  if (isAuthenticated && isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Redirecting to admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            Laundryheap Admin
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Driver Onboarding Management System
          </p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">Admin Sign In</CardTitle>
            <CardDescription>
              Use your authorized Google account to access the admin panel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-sm text-gray-700">
                <strong className="text-blue-900">Restricted Access:</strong> Only pre-authorized email addresses can access this panel. Contact your system administrator if you need access.
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleGoogleSignIn}
              disabled={isLoading || isSigningIn}
              className="w-full h-12 bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-300 shadow-sm"
              size="lg"
            >
              {(isLoading || isSigningIn) ? (
                <>
                  <Loader2 className="mr-3 h-5 w-5 animate-spin text-blue-600" />
                  <span className="text-gray-600">Signing in...</span>
                </>
              ) : (
                <>
                  <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC04"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span className="font-medium">Sign in with Google</span>
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="text-center mt-8">
          <p className="text-xs text-gray-500">
            © 2025 Laundryheap · Driver Onboarding Admin Panel
          </p>
        </div>
      </div>
    </div>
  );
}
