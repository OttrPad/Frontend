import { useState, useEffect } from "react";
import type { User, Session } from "@supabase/supabase-js";
import supabase from "@/lib/supabaseClient";
import { useRunStore } from "@/store/workspace";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
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
    await supabase.auth.signOut();
    // Clear execution run outputs and reset running flag on logout
    try {
      const runStore = useRunStore.getState();
      runStore.clearOutputs();
      useRunStore.setState({ isRunning: false });
    } catch (e) {
      // Non-fatal; log and continue
      console.warn("Failed to clear run store on sign out", e);
    }
  };

  return {
    user,
    session,
    loading,
    signOut,
  };
}
