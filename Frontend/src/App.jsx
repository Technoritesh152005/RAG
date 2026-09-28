import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./auth/authProvider.jsx";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import WorkspacePage from "./pages/WorkspacePage";
import { WorkspaceSocketProvider } from "./realtime/WorkspaceSocketProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ApplicationContent() {
  const { loading, isAuthenticated } = useAuth();
  const [authMode, setAuthMode] = useState(null);

  if (loading) {
    return <main>Loading session...</main>;
  }

  if (!isAuthenticated) {
    if (!authMode) {
      return (
        <HomePage
          onSignIn={() => setAuthMode("login")}
          onGetStarted={() => setAuthMode("signup")}
        />
      );
    }

    return (
      <LoginPage
        key={authMode}
        initialMode={authMode}
        onHome={() => setAuthMode(null)}
      />
    );
  }

  return (
    <WorkspaceSocketProvider>
      <WorkspacePage />
    </WorkspaceSocketProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ApplicationContent />
      </AuthProvider>
    </QueryClientProvider>
  );
}
