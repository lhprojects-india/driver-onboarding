import { useAdminAuth } from "../context/AdminAuthContext";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function AdminProtectedRoute({ children }) {
  const { isAuthenticated, isAuthorized, isLoading } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAuthorized) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
