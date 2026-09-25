import { supabaseClient } from "./auth.js";
import { createContext, useContext, useState, useEffect } from "react";

const authContext = createContext(null);

export function authProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = false;

    async function loadSession() {
      const {
        data: { session },
        error,
      } = await supabaseClient.auth.getSession;

      //session means all the necessary details of authenticated user
      if (!mounted) return;

      if (error) {
        console.error("Failed to load auth session:", error.message);
        setSession(null);
        setUser(null);
      } else {
        setSession(session);
        setUser(session?.user ?? null);
      }
      setLoading(false)

    }

    loadSession()

    //wheever auth related event occurs call this callback function
    const {} =  supabaseClient.auth.onAuthStateChange((_event,nextSession)=>{
        if(!mounted)return 
        setSession(nextSession)
        setUser(nextSession?.user??null)
        setLoading(false)
    })
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
    <authContext.Provider
      value={{
        session,
        user,
        loading,
        isAuthenticated: Boolean(session),
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </authContext.Provider>
  );
}


export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}