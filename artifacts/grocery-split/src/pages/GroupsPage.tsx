// @ts-ignore
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Users, ShoppingBag, Calendar, Leaf, Loader2, ArrowRight } from 'lucide-react';
import { CreateGroupDialog } from '@/components/groups/CreateGroupDialog';
import { AnimatePresence, motion } from 'framer-motion';

export interface GroupMember {
  id: string;
  name: string;
  email: string | null;
  user_id: string | null;
}

interface GroupOrder {
  id: string;
  order_name: string;
  created_at: string;
}

export interface GroupRow {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  group_members: GroupMember[];
  orders: GroupOrder[];
}

interface GroupsPageProps {
  userId: string;
  userEmail?: string;
  onGroupClick: (group: GroupRow) => void;
  onSignOut: () => void;
}

export function GroupsPage({ userId, userEmail, onGroupClick, onSignOut }: GroupsPageProps) {
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetchGroups = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: memberRows, error: memberError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId);
      if (memberError) throw memberError;

      const groupIds = [...new Set((memberRows ?? []).map((r: { group_id: string }) => r.group_id))];

      if (groupIds.length === 0) {
        setGroups([]);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('groups')
        .select(`
          id, name, created_by, created_at,
          group_members ( id, name, email, user_id ),
          orders ( id, order_name, created_at )
        `)
        .in('id', groupIds)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setGroups((data as GroupRow[]) ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGroups(); }, [userId]);

  const latestOrderDate = (orders: GroupOrder[]) => {
    if (!orders?.length) return null;
    return [...orders].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0].created_at;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-lg shadow-sm">
              <Leaf className="w-5 h-5" />
            </div>
            <h1 className="font-bold text-xl tracking-tight">GrocerySplit</h1>
          </div>
          <div className="flex items-center gap-3">
            {userEmail && (
              <span className="text-sm text-muted-foreground hidden sm:block truncate max-w-[200px]">
                {userEmail}
              </span>
            )}
            <button
              onClick={onSignOut}
              className="text-sm font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Your Groups</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Shared expense groups with roommates and friends
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" /> New Group
          </Button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-24 text-muted-foreground gap-3">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading your groups...
          </div>
        )}

        {!loading && error && (
          <Card className="p-6 border-destructive/30 bg-destructive/5 text-destructive text-sm">
            {error}
          </Card>
        )}

        {!loading && !error && groups.length === 0 && (
          <Card className="p-16 border-dashed border-2 flex flex-col items-center justify-center text-center bg-secondary/20">
            <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-5 border">
              <Users className="w-10 h-10 text-muted-foreground/40" />
            </div>
            <h3 className="text-xl font-bold mb-2">No groups yet</h3>
            <p className="text-muted-foreground max-w-sm text-sm mb-6">
              Create a group for your apartment or roommates to start tracking and splitting grocery orders.
            </p>
            <Button onClick={() => setShowCreate(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Create your first group
            </Button>
          </Card>
        )}

        {!loading && !error && groups.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnimatePresence>
              {groups.map((group, i) => {
                const memberList = group.group_members ?? [];
                const orderList = group.orders ?? [];
                const lastOrder = latestOrderDate(orderList);
                return (
                  <motion.div
                    key={group.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.25 }}
                  >
                    <button
                      type="button"
                      onClick={() => onGroupClick(group)}
                      className="w-full text-left"
                    >
                      <Card className="p-5 h-full hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="bg-primary/10 text-primary p-2.5 rounded-xl">
                            <Users className="w-5 h-5" />
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all mt-1" />
                        </div>

                        <h3 className="font-bold text-lg text-foreground mb-3 group-hover:text-primary transition-colors leading-snug">
                          {group.name}
                        </h3>

                        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Users className="w-3.5 h-3.5" />
                            {memberList.length} member{memberList.length !== 1 ? 's' : ''}
                          </span>
                          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <ShoppingBag className="w-3.5 h-3.5" />
                            {orderList.length} order{orderList.length !== 1 ? 's' : ''}
                          </span>
                        </div>

                        {lastOrder && (
                          <p className="text-xs text-muted-foreground mt-2.5 flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" />
                            Last order {new Date(lastOrder).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-1 mt-3">
                          {memberList.slice(0, 5).map((m) => (
                            <div
                              key={m.id}
                              className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold border-2 border-background -ml-1 first:ml-0"
                              title={m.name}
                            >
                              {m.name.charAt(0).toUpperCase()}
                            </div>
                          ))}
                          {memberList.length > 5 && (
                            <div className="w-7 h-7 rounded-full bg-secondary text-muted-foreground flex items-center justify-center text-xs font-bold border-2 border-background -ml-1">
                              +{memberList.length - 5}
                            </div>
                          )}
                        </div>
                      </Card>
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

      <AnimatePresence>
        {showCreate && (
          <CreateGroupDialog
            userId={userId}
            userEmail={userEmail}
            onClose={() => setShowCreate(false)}
            onCreated={() => { setShowCreate(false); fetchGroups(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
