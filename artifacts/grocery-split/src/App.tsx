// @ts-ignore
import { supabase } from "../../../lib/supabase";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import { Leaf, Loader2 } from "lucide-react";

const queryClient = new QueryClient();

async function claimGroupMemberships(userId: string, email: string) {
  await supabase
    .from('group_members')
    .update({ user_id: userId })
    .eq('email', email)
    .is('user_id', null);
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      if (session?.user?.email) {
        claimGroupMemberships(session.user.id, session.user.email);
      }
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: string, session: Session | null) => {
        if (event === 'SIGNED_IN' && session?.user?.email) {
          claimGroupMemberships(session.user.id, session.user.email);
        }
        setSession(session);
        setLoading(false);
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: "https://shared-order-tracker--kp161145.replit.app" },
    });
    if (error) alert(error.message);
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) alert(error.message);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="bg-card border rounded-2xl p-8 w-full max-w-sm shadow-lg text-center space-y-6">
          <div className="flex flex-col items-center gap-3">
            <div className="bg-primary text-primary-foreground p-3 rounded-2xl shadow-md">
              <Leaf className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold">GrocerySplit</h1>
            <p className="text-muted-foreground text-sm">
              Sign in to create and manage shared grocery orders with your roommates.
            </p>
          </div>
          <button
            onClick={signInWithGoogle}
            className="w-full py-3 px-4 rounded-xl bg-foreground text-background font-semibold text-sm hover:opacity-90 transition-opacity"
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
        <Home
          userId={session.user.id}
          userEmail={session.user.email}
          onSignOut={signOut}
        />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
