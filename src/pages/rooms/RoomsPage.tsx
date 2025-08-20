import { Navigate } from "react-router-dom";
import { RoomManager } from "@/components/room-manager";
import { ProfileHeader } from "@/components/profile-header";
import { useAuth } from "@/hooks/useAuth";

export default function RoomsPage() {
  const { user, loading } = useAuth();

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-gradient-to-br from-slate-950 via-black to-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-orange-400 to-orange-500 rounded-xl animate-pulse mb-4 mx-auto"></div>
          <p className="text-white/70">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="relative min-h-svh flex flex-col overflow-hidden bg-gradient-to-br from-slate-950 via-black to-slate-900">
      {/* Modern gradient background */}
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/95 via-black/90 to-slate-900/95"></div>

      {/* Sophisticated grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
          linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
        `,
          backgroundSize: "40px 40px",
        }}
      ></div>

      {/* Subtle animated gradients */}
      <div className="absolute top-0 left-1/4 w-72 h-72 bg-orange-400/[0.08] rounded-full blur-3xl animate-pulse"></div>
      <div
        className="absolute bottom-0 right-1/4 w-80 h-80 bg-amber-400/[0.06] rounded-full blur-3xl animate-pulse"
        style={{ animationDelay: "2s" }}
      ></div>
      <div
        className="absolute top-1/2 left-0 w-64 h-64 bg-orange-300/[0.05] rounded-full blur-3xl animate-pulse"
        style={{ animationDelay: "4s" }}
      ></div>

      {/* Huge OttrPad background text */}
      <div className="absolute inset-0 flex items-end justify-center select-none pointer-events-none overflow-hidden pb-8">
        <div className="text-center transform scale-150">
          <h1 className="text-[28vw] sm:text-[25vw] md:text-[22vw] lg:text-[20vw] xl:text-[18vw] 2xl:text-[16vw] font-black text-orange-400/[0.09] leading-none tracking-tighter whitespace-nowrap">
            OttrPad
          </h1>
        </div>
      </div>

      {/* Profile Header */}
      <ProfileHeader fixed={false} />

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-6xl">
          <RoomManager />
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-center">
        <p className="text-orange-300/70 text-xs">
          © 2024 OttrPad. Collaborate. Create. Code.
        </p>
      </div>
    </div>
  );
}
