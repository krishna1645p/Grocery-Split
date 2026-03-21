import { supabase } from "../../../lib/supabase";
import { useEffect, useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setSession(session);
      setLoading(false);
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      alert(error.message);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert(error.message);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f6f8f6",
          fontFamily: "sans-serif",
        }}
      >
        Loading...
      </div>
    );
  }

  if (!session) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f6f8f6",
          fontFamily: "sans-serif",
          padding: "1rem",
        }}
      >
        <div
          style={{
            background: "white",
            padding: "2rem",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "420px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            textAlign: "center",
          }}
        >
          <h1 style={{ marginBottom: "0.5rem" }}>GrocerySplit</h1>
          <p style={{ color: "#666", marginBottom: "1.5rem" }}>
            Sign in to create and manage shared grocery orders.
          </p>
          <button
            onClick={signInWithGoogle}
            style={{
              padding: "0.9rem 1.2rem",
              borderRadius: "10px",
              border: "none",
              cursor: "pointer",
              width: "100%",
              fontSize: "1rem",
              background: "#111",
              color: "white",
            }}
          >
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div
          style={{
            minHeight: "100vh",
            background: "#f6f8f6",
          }}
        >
          <div
            style={{
              maxWidth: "1200px",
              margin: "0 auto",
              padding: "1rem",
            }}
          >
            <div
              style={{
                background: "white",
                borderRadius: "16px",
                padding: "1rem 1.25rem",
                marginBottom: "1rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                boxShadow: "0 6px 20px rgba(0,0,0,0.05)",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              <div>
                <h1 style={{ margin: 0, fontSize: "1.5rem" }}>GrocerySplit</h1>
                <p style={{ margin: "0.35rem 0 0", color: "#666" }}>
                  Signed in as {session.user.email}
                </p>
              </div>

              <button
                onClick={signOut}
                style={{
                  padding: "0.7rem 1rem",
                  borderRadius: "10px",
                  border: "1px solid #ddd",
                  background: "white",
                  cursor: "pointer",
                }}
              >
                Logout
              </button>
            </div>

            <WouterRouter>
              <Router />
            </WouterRouter>
          </div>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
