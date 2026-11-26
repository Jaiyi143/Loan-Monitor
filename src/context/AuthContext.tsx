import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import type { Profile } from "../types/database";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  authLoading: boolean;
  isPasswordRecovery: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  finishPasswordRecovery: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [recoveryUserId, setRecoveryUserId] = useState<string | null>(null);
  const [profileResult, setProfileResult] = useState<{
    userId: string;
    profile: Profile | null;
    error: string | null;
  } | null>(null);

  const user = session?.user ?? null;
  const userId = user?.id;
  const currentProfile = profileResult?.userId === userId ? profileResult : null;

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
      if (event === "PASSWORD_RECOVERY") setRecoveryUserId(nextSession?.user.id ?? null);
      if (!nextSession) {
        setRecoveryUserId(null);
        setProfileResult(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;

    let active = true;
    void supabase.from("profiles").select("*").eq("id", userId).single().then(({ data, error }) => {
      if (!active) return;
      setProfileResult({
        userId,
        profile: data,
        error: error ? "Profile could not be loaded. Ask your lender to check your account." : null,
      });
    });

    return () => {
      active = false;
    };
  }, [userId]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile: currentProfile?.profile ?? null,
        loading: authLoading || Boolean(userId && !currentProfile),
        authLoading,
        isPasswordRecovery: Boolean(userId && userId === recoveryUserId),
        error: currentProfile?.error ?? null,
        signOut,
        finishPasswordRecovery: () => setRecoveryUserId(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
