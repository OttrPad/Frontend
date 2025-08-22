import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useClickOutside } from "@/hooks/useClickOutside";
import { toast } from "react-toastify";

interface ProfileHeaderProps {
  fixed?: boolean;
  className?: string;
}

export function ProfileHeader({
  fixed = false,
  className = "",
}: ProfileHeaderProps) {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useClickOutside<HTMLDivElement>(() =>
    setShowDropdown(false)
  );

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully");
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
    }
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.email) return "U";
    return user.email.charAt(0).toUpperCase();
  };

  // Get user display name
  const getUserDisplayName = () => {
    return (
      user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User"
    );
  };

  if (loading) {
    return (
      <header
        className={`relative z-20 p-6 md:p-8 ${
          fixed
            ? "fixed top-0 left-0 right-0 bg-black/20 backdrop-blur-md border-b border-white/10"
            : ""
        } ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-orange-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg animate-pulse"></div>
            <div>
              <h1 className="text-xl font-bold text-white">OttrPad</h1>
              <p className="text-xs text-white/50">Collaborative Editor</p>
            </div>
          </div>
          <div className="w-8 h-8 bg-white/10 rounded-full animate-pulse"></div>
        </div>
      </header>
    );
  }

  return (
    <header
      className={`relative z-20 p-6 md:p-8 ${
        fixed ? "fixed top-0 left-0 right-0 bg-black/20 backdrop-blur-md" : ""
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        {/* Logo/Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-orange-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
            <svg
              className="w-6 h-6 text-black font-bold"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">OttrPad</h1>
            <p className="text-xs text-white/50">Collaborative Editor</p>
          </div>
        </div>

        {/* User Profile Section */}
        {user && (
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <Button
              variant="outline"
              size="sm"
              className="bg-white/[0.05] backdrop-blur-md border-white/[0.1] text-white hover:bg-white/[0.08] hover:border-white/[0.15] transition-all duration-200 p-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-5 5v-5zM21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </Button>

            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <div
                className="flex items-center space-x-3 bg-white/[0.05] backdrop-blur-md border border-white/[0.1] rounded-xl px-4 py-2 hover:bg-white/[0.08] transition-all duration-200 cursor-pointer"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                {/* Profile Avatar */}
                <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-black font-semibold text-sm">
                    {getUserInitials()}
                  </span>
                </div>

                {/* User Info */}
                <div className="hidden sm:block">
                  <p className="text-white font-medium text-sm">
                    {getUserDisplayName()}
                  </p>
                  <p className="text-white/50 text-xs">{user.email}</p>
                </div>

                {/* Dropdown Arrow */}
                <svg
                  className={`w-4 h-4 text-white/70 transition-transform duration-200 ${
                    showDropdown ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>

              {/* Dropdown Menu */}
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800/90 backdrop-blur-md border border-white/10 rounded-xl shadow-xl py-2 z-50">
                  <div className="px-4 py-2 border-b border-white/10">
                    <p className="text-white font-medium text-sm">
                      {getUserDisplayName()}
                    </p>
                    <p className="text-white/50 text-xs">{user.email}</p>
                  </div>

                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      // Add profile settings functionality here
                      toast.info("Profile settings coming soon!");
                    }}
                    className="w-full text-left px-4 py-2 text-white/80 hover:text-white hover:bg-white/5 transition-colors text-sm"
                  >
                    Profile Settings
                  </button>

                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      // Add preferences functionality here
                      toast.info("Preferences coming soon!");
                    }}
                    className="w-full text-left px-4 py-2 text-white/80 hover:text-white hover:bg-white/5 transition-colors text-sm"
                  >
                    Preferences
                  </button>

                  <div className="border-t border-white/10 mt-2">
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        handleSignOut();
                      }}
                      className="w-full text-left px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-sm"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sign In Button - shown when not authenticated */}
        {!user && (
          <Button
            onClick={() => navigate("/")}
            className="bg-gradient-to-r from-orange-400 to-orange-500 text-black font-semibold hover:from-orange-500 hover:to-orange-600 transition-all duration-200"
          >
            Sign In
          </Button>
        )}
      </div>
    </header>
  );
}
