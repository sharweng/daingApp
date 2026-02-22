import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";

/**
 * Google OAuth Callback Page
 * Handles the redirect from Google OAuth and processes the authentication.
 */
export default function GoogleCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get("token");
      const error = searchParams.get("error");

      if (error) {
        showToast(`Google sign-in failed: ${error}`);
        navigate("/login", { replace: true });
        return;
      }

      if (token) {
        try {
          // Store the token and redirect to home
          login(token);
          showToast("Successfully signed in with Google!");
          navigate("/", { replace: true });
        } catch (err) {
          console.error("Error processing Google callback:", err);
          showToast("Failed to complete sign-in. Please try again.");
          navigate("/login", { replace: true });
        }
      } else {
        // No token or error - redirect to login
        navigate("/login", { replace: true });
      }
    };

    handleCallback();
  }, [searchParams, login, navigate, showToast]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card max-w-md text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
        <p className="text-slate-600">Completing sign-in...</p>
      </div>
    </div>
  );
}
