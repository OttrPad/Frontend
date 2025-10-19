import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/hooks/useUser";

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { user, loading } = useUser();

  useEffect(() => {
    // After OAuth, Supabase will have set the session; just route the user
    if (!loading) {
      if (user) {
        navigate("/join", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-svh flex items-center justify-center text-orange-400">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 border-2 border-orange-400/30 border-t-orange-400 rounded-full animate-spin"></div>
        <span className="text-lg font-medium">Signing you in…</span>
      </div>
    </div>
  );
}
