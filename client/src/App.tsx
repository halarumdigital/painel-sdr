import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import NotFound from "@/pages/not-found";
import SdrDashboard from "@/pages/sdr-dashboard";
import UsersPage from "@/pages/users";
import Login from "@/pages/login";
import { Loader2 } from "lucide-react";

function Router() {
  const { isAuthenticated, isLoading, login, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const isAdmin = user?.role === "admin";

  return (
    <Switch>
      <Route path="/login">
        {isAuthenticated ? <Redirect to="/dashboard" /> : <Login onLogin={login} />}
      </Route>
      <Route path="/dashboard">
        {isAuthenticated ? <SdrDashboard /> : <Redirect to="/login" />}
      </Route>
      <Route path="/users">
        {!isAuthenticated ? (
          <Redirect to="/login" />
        ) : !isAdmin ? (
          <Redirect to="/dashboard" />
        ) : (
          <UsersPage />
        )}
      </Route>
      <Route path="/">
        {isAuthenticated ? <Redirect to="/dashboard" /> : <Redirect to="/login" />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
