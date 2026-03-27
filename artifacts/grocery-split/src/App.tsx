// @ts-ignore
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import { GroupsPage, type GroupRow } from "@/pages/GroupsPage";
import { GroupDetailPage, type GroupMember } from "@/pages/GroupDetailPage";
import { NamePromptModal } from "@/components/NamePromptModal";
import { Leaf, Loader2 } from "lucide-react";

const queryClient = new QueryClient();

async function claimGroupMemberships(userId: string, email: string, displayName?: string) {
  try {
    const update: Record<string, string> = { user_id: userId };
    if (displayName) update.name = displayName;
    await supabase
      .from("group_members")
      .update(update)
      .eq("email", email)
      .is("user_id", null);
  } catch {
    // best-effort — never block sign-in
  }
}

type Screen =
  | { type: "groups" }
  | { type: "group-detail"; group: GroupRow }
  | { type: "new-order"; group: GroupRow; members: GroupMember[] };

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<Screen>({ type: "groups" });
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [membersTrigger, setMembersTrigger] = useState<string | null>(null);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [profileName, setProfileName] = useState("");

  const checkProfile = async (userId: string, userEmail: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .single();
    if (data) {
      setProfileName(data.display_name);
      const emailPrefix = userEmail.split("@")[0] ?? "";
      if (data.display_name === emailPrefix) {
        setShowNamePrompt(true);
      }
    }
  };

  const handleSaveName = async (name: string) => {
    if (!session) return;
    await supabase
      .from("profiles")
      .update({ display_name: name, updated_at: new Date().toISOString() })
      .eq("id", session.user.id);
    setProfileName(name);
    setShowNamePrompt(false);
  };

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }: { data: { session: Session | null } }) => {
        if (session?.user?.email) {
          claimGroupMemberships(session.user.id, session.user.email, session.user.user_metadata?.full_name);
          checkProfile(session.user.id, session.user.email);
        }
        setSession(session);
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: string, session: Session | null) => {
        if (event === "SIGNED_IN" && session?.user?.email) {
          claimGroupMemberships(session.user.id, session.user.email, session.user.user_metadata?.full_name);
          checkProfile(session.user.id, session.user.email);
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
      options: {
        redirectTo: "https://grocerysplit.com",
      },
    });
    if (error) alert(error.message);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setScreen({ type: "groups" });
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
              Sign in to create and manage shared grocery orders with your
              roommates.
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
        {screen.type === "groups" && (
          <GroupsPage
            userId={session.user.id}
            userEmail={session.user.email}
            onGroupClick={(group) => setScreen({ type: "group-detail", group })}
            onSignOut={signOut}
          />
        )}

        {screen.type === "group-detail" && (
          <GroupDetailPage
            userId={session.user.id}
            groupId={screen.group.id}
            groupName={screen.group.name}
            members={screen.group.group_members ?? []}
            profileName={profileName}
            onBack={() => setScreen({ type: "groups" })}
            onNewOrder={() =>
              setScreen({
                type: "new-order",
                group: screen.group,
                members: screen.group.group_members ?? [],
              })
            }
            refreshTrigger={lastOrderId}
            membersTrigger={membersTrigger}
            onMembersChanged={async () => {
              setMembersTrigger(Date.now().toString());
              const { data } = await supabase
                .from("groups")
                .select(
                  "id, name, created_by, group_members ( id, name, email, user_id )",
                )
                .eq("id", screen.type === "group-detail" ? screen.group.id : "")
                .single();
              if (data)
                setScreen({ type: "group-detail", group: data as GroupRow });
            }}
          />
        )}

        {screen.type === "new-order" && (
          <Home
            key={`order-${screen.group.id}`}
            userId={session.user.id}
            groupId={screen.group.id}
            groupName={screen.group.name}
            members={screen.members}
            onBack={() =>
              setScreen({ type: "group-detail", group: screen.group })
            }
            onOrderSubmitted={(orderId) => {
              setLastOrderId(orderId);
              setScreen({ type: "group-detail", group: screen.group });
            }}
          />
        )}

        {showNamePrompt && (
          <NamePromptModal defaultName={profileName} onSave={handleSaveName} />
        )}

        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
