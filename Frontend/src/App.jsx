import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./auth/authProvider"
import LoginPage from "./pages/LoginPage";
import WorkspacePage from "./pages/WorkspacePage";

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

  if (loading) {
    return <main>Loading session...</main>;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <WorkspacePage />;
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