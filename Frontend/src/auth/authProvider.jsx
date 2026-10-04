import { createContext, useContext, useEffect, useState } from "react";
import { supabaseClient } from "./auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  //this runs when authcontext provider gets mounted 
  useEffect(() => {
    let mounted = true;

    //wheneevr the auth state change this trigger the event and makes a call to callback function
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    //it return the register authentication state or session in this browser
    supabaseClient.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;

      if (error) {
        console.error("Failed to load auth session:", error.message);
        setSession(null);
        setUser(null);
      } else {
        setSession(data.session);
        setUser(data.session?.user ?? null);
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  }

  async function signInWithGoogle() {
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) throw error;
    return data;
  }

  async function signUp(email, password) {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
    });

    if (error) throw error;
    return data;
  }

  async function signOut() {
    const { error } = await supabaseClient.auth.signOut();

    if (error) throw error;

    setSession(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        isAuthenticated: Boolean(session),
        signIn,
        signInWithGoogle,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}