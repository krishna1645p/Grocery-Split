import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Plus,
  Users,
  Trash2,
  UserPlus,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { OrderHistory } from "@/components/grocery/OrderHistory";
import { BalancesTab } from "@/components/BalancesTab";
// @ts-ignore
import { supabase } from "@/lib/supabase";
import { useState } from "react";

export interface GroupMember {
  id: string;
  name: string;
  email: string | null;
  user_id: string | null;
}

interface GroupDetailPageProps {
  userId: string;
  groupId: string;
  groupName: string;
  members: GroupMember[];
  onBack: () => void;
  onNewOrder: () => void;
  onMembersChanged?: () => void;
  profileName?: string;
  refreshTrigger?: string | null;
  membersTrigger?: string | null;
}

function AddMemberForm({
  groupId,
  groupName,
  invitedBy,
  onAdded,
  onCancel,
}: {
  groupId: string;
  groupName: string;
  invitedBy: string;
  onAdded: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (email.trim()) {
        const { data: existing } = await supabase
          .from("group_members")
          .select("id")
          .eq("group_id", groupId)
          .eq("email", email.trim())
          .maybeSingle();

        if (existing) {
          alert("A member with this email is already in the group.");
          setSaving(false);
          return;
        }
      }

      const { error } = await supabase.from("group_members").insert({
        group_id: groupId,
        name: name.trim(),
        email: email.trim() || null,
        user_id: null,
      });

      if (error) throw error;

      // Send invite email (best-effort, never blocks UI)
      if (email.trim()) {
        supabase.functions.invoke("notify-member-added", {
          body: {
            memberEmail: email.trim(),
            memberName: name.trim(),
            groupName,
            invitedByName: invitedBy ?? "Someone",
          },
        }).catch(() => {});
      }
      onAdded();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2 bg-white border rounded-xl px-3 py-2 shadow-sm">
      <Input
        placeholder="Name *"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-8 text-sm w-32 border-0 shadow-none focus-visible:ring-0 px-1"
        autoFocus
      />
      <Input
        placeholder="Email (optional)"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
        className="h-8 text-sm w-48 border-0 shadow-none focus-visible:ring-0 px-1"
      />
      <button
        onClick={handleSave}
        disabled={saving || !name.trim()}
        className="w-7 h-7 rounded-full flex items-center justify-center bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0"
        title="Add member"
      >
        {saving ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Check className="w-3.5 h-3.5" />
        )}
      </button>
      <button
        onClick={onCancel}
        className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors shrink-0"
        title="Cancel"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function GroupDetailPage({
  userId,
  groupId,
  groupName,
  members,
  onBack,
  onNewOrder,
  onMembersChanged,
  profileName = "Someone",
  refreshTrigger,
  membersTrigger,
}: GroupDetailPageProps) {
  const [addingMember, setAddingMember] = useState(false);
  const [activeTab, setActiveTab] = useState<"orders" | "balances">("orders");

  const handleMemberAdded = () => {
    setAddingMember(false);
    onMembersChanged?.();
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Groups</span>
          </button>
          <span className="text-muted-foreground/50">/</span>
          <h1 className="font-bold text-lg truncate flex-1">{groupName}</h1>
          <div className="flex items-center gap-2 shrink-0">
            <Button onClick={onNewOrder} className="gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Order</span>
              <span className="sm:hidden">Order</span>
            </Button>
            <button
              onClick={async () => {
                if (
                  !confirm(
                    `Delete group "${groupName}"? This will remove all orders, items, and members.`,
                  )
                )
                  return;
                try {
                  const { error } = await supabase
                    .from("groups")
                    .delete()
                    .eq("id", groupId);
                  if (error) throw error;
                  onBack();
                } catch (err) {
                  alert(
                    err instanceof Error
                      ? err.message
                      : "Failed to delete group",
                  );
                }
              }}
              className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              title="Delete group"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Members row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground mr-1">
            <Users className="w-4 h-4" /> Members:
          </span>
          {members.map((m, idx) => (
            <div
              key={m.id ?? idx}
              className="flex items-center gap-1.5 bg-white border rounded-full pl-2.5 pr-3 py-1 shadow-sm"
              title={m.email ?? undefined}
            >
              <div className="w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold uppercase">
                {m.name.charAt(0)}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{m.name}</span>
                {m.email && (
                  <span className="text-xs text-muted-foreground">
                    {m.email}
                  </span>
                )}
              </div>
            </div>
          ))}

          {addingMember ? (
            <AddMemberForm
              groupId={groupId}
              groupName={groupName}
              invitedBy={profileName || "Someone"}
              onAdded={handleMemberAdded}
              onCancel={() => setAddingMember(false)}
            />
          ) : (
            <button
              onClick={() => setAddingMember(true)}
              className="flex items-center gap-1.5 border border-dashed rounded-full pl-2.5 pr-3 py-1 text-sm text-muted-foreground hover:text-primary hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add Member
            </button>
          )}
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-secondary/50 rounded-xl p-1 w-fit">
          {(["orders", "balances"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                activeTab === tab
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "orders" && (
          <OrderHistory
            userId={userId}
            filterGroupId={groupId}
            refreshTrigger={refreshTrigger}
            onNewOrder={onNewOrder}
          />
        )}

        {activeTab === "balances" && (
          <BalancesTab groupId={groupId} currentUserId={userId} currentUserName={members.find(m => m.user_id === userId)?.name ?? ''} />
        )}
      </main>
    </div>
  );
}
