import React, { createContext, useEffect, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import supabase from "@/lib/supabaseClient";

interface UserContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userProfile: {
    id: string;
    email: string;
    name: string;
    avatar: string | null;
    initials: string;
  } | null;
  signOut: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: React.ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error("Error getting initial session:", error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      // Invalidate session globally and clear cookies
      // Use global scope when available; fall back to default signOut signature
      // Supabase types may not include the 'scope' option in some SDK versions.
      await (
        supabase.auth.signOut as unknown as (args?: {
          scope?: "global" | "local";
        }) => Promise<void>
      )({ scope: "global" });
    } finally {
      // Proactively clear local auth state
      setSession(null);
      setUser(null);
      // Hard redirect to root to avoid stale state and ensure SPA bootstraps unauthenticated
      const target = `${window.location.origin}/`;
      window.location.replace(target);
    }
  };

  // Create a normalized user profile object
  const userProfile = user
    ? {
        id: user.id,
        email: user.email || "",
        name:
          user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
        avatar: user.user_metadata?.avatar_url || null,
        initials: (user.email || "U").charAt(0).toUpperCase(),
      }
    : null;

  const value: UserContextType = {
    user,
    session,
    loading,
    userProfile,
    signOut,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

// Export the context for use in the custom hook
export { UserContext };
