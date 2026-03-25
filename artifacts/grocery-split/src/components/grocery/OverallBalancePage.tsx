// @ts-ignore
import { supabase } from "../../../../../lib/supabase";
import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { computePersonSummaries } from "@/hooks/use-grocery-store";
import {
  Wallet,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  ArrowRight,
} from "lucide-react";

/* ───────── types ───────── */

interface RawMember {
  id: string;
  name: string;
  email: string | null;
  user_id: string | null;
}

interface RawItem {
  base_price: number;
  quantity: number;
  requested_by: string;
  split_type: string;
  split_with_indices: number[];
}

interface RawAdjustment {
  tax: number;
  delivery: number;
  tip: number;
  promo_savings: number;
}

interface RawOrder {
  id: string;
  paid_by_name: string | null;
  items: RawItem[];
  adjustments: RawAdjustment[];
}

interface RawGroup {
  id: string;
  name: string;
  group_members: RawMember[];
  orders: RawOrder[];
}

/**
 * Net balance per person (from the logged-in user's perspective):
 *   positive → they owe YOU
 *   negative → YOU owe them
 *   zero with hasTransactions → show dash
 */
interface PersonBalance {
  name: string;
  userId: string | null;
  /** groups this person appears in with the logged-in user */
  groups: string[];
  /** net amount: positive = they owe you, negative = you owe them */
  net: number;
  /** true if there was any shared order history (even if net = 0) */
  hasTransactions: boolean;
}

interface OverallBalancePageProps {
  userId: string;
  refreshTrigger?: string | null;
}

/* ───────── main component ───────── */

export function OverallBalancePage({
  userId,
  refreshTrigger,
}: OverallBalancePageProps) {
  const [balances, setBalances] = useState<PersonBalance[]>([]);
  const [myName, setMyName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calculate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Find all groups the logged-in user belongs to
      const { data: memberRows, error: memberError } = await supabase
        .from("group_members")
        .select("group_id, name")
        .eq("user_id", userId);
      if (memberError) throw memberError;

      if (!memberRows || memberRows.length === 0) {
        setBalances([]);
        setLoading(false);
        return;
      }

      // Try to infer the user's display name from any group membership
      const inferredName: string | null = memberRows[0]?.name ?? null;
      setMyName(inferredName);

      const groupIds = [
        ...new Set(memberRows.map((r: { group_id: string }) => r.group_id)),
      ];

      // 2. Fetch groups with members and orders
      const { data: groupsData, error: groupsError } = await supabase
        .from("groups")
        .select(
          `
          id,
          name,
          group_members ( id, name, email, user_id ),
          orders (
            id,
            paid_by_name,
            items ( base_price, quantity, requested_by, split_type, split_with_indices ),
            adjustments ( tax, delivery, tip, promo_savings )
          )
        `,
        )
        .in("id", groupIds);
      if (groupsError) throw groupsError;

      const groups: RawGroup[] = groupsData ?? [];

      // 3. Also fetch settled payments (if payments table exists)
      let paymentsMap: Record<string, Record<string, number>> = {};
      try {
        const { data: payments } = await supabase
          .from("payments")
          .select("paid_by, paid_to, amount, group_id")
          .in("group_id", groupIds);

        // Build a map: payerUserId → payeeUserId → total paid
        for (const p of payments ?? []) {
          if (!paymentsMap[p.paid_by]) paymentsMap[p.paid_by] = {};
          paymentsMap[p.paid_by][p.paid_to] =
            (paymentsMap[p.paid_by][p.paid_to] ?? 0) + p.amount;
        }
      } catch {
        // payments table may not exist yet — that's fine
      }

      // 4. Accumulate net debts per other-person name (across all groups)
      //    debtMap[otherPersonName] = { net, hasTransactions, groups, userId }
      //    net > 0 → they owe me; net < 0 → I owe them
      const debtMap: Record<
        string,
        {
          net: number;
          hasTransactions: boolean;
          groups: Set<string>;
          userId: string | null;
        }
      > = {};

      const ensureEntry = (
        name: string,
        uid: string | null,
        groupName: string,
      ) => {
        if (!debtMap[name]) {
          debtMap[name] = {
            net: 0,
            hasTransactions: false,
            groups: new Set(),
            userId: uid,
          };
        }
        debtMap[name].groups.add(groupName);
        if (uid && !debtMap[name].userId) debtMap[name].userId = uid;
      };

      for (const group of groups) {
        const members = group.group_members ?? [];
        const myMemberInGroup = members.find((m) => m.user_id === userId);
        if (!myMemberInGroup) continue;

        const myIndex = members.indexOf(myMemberInGroup);

        for (const order of group.orders ?? []) {
          const adj = order.adjustments?.[0] ?? {
            tax: 0,
            delivery: 0,
            tip: 0,
            promo_savings: 0,
          };

          const items = (order.items ?? []).map((i: RawItem) => ({
            basePrice: i.base_price,
            quantity: i.quantity,
            requestedByIndex: members.findIndex(
              (m) => m.name === i.requested_by,
            ),
            splitType: i.split_type as "self" | "all" | "selected",
            splitWithIndices: i.split_with_indices ?? [],
          }));

          const { personSummaries } = computePersonSummaries(members, items, {
            tax: adj.tax,
            delivery: adj.delivery,
            tip: adj.tip,
            promo: adj.promo_savings,
          });

          // Resolve who paid
          const payerName = order.paid_by_name;
          const payerIndex = payerName
            ? members.findIndex((m) => m.name === payerName)
            : 0;
          const resolvedPayerIndex = payerIndex >= 0 ? payerIndex : 0;
          const payerMember = members[resolvedPayerIndex];

          const myShare = personSummaries.find((p) => p.index === myIndex);

          // Mark all other members as having transactions with me if we share this order
          for (const otherMember of members) {
            if (otherMember.user_id === userId) continue;
            ensureEntry(otherMember.name, otherMember.user_id, group.name);
            debtMap[otherMember.name].hasTransactions = true;
          }

          if (!myShare || myShare.finalPayable < 0.005) continue;

          if (resolvedPayerIndex === myIndex) {
            // I paid — everyone else owes me their share
            for (const p of personSummaries) {
              if (p.index === myIndex) continue;
              const otherMember = members[p.index];
              if (!otherMember || p.finalPayable < 0.005) continue;
              ensureEntry(otherMember.name, otherMember.user_id, group.name);
              debtMap[otherMember.name].net += p.finalPayable;
              debtMap[otherMember.name].hasTransactions = true;
            }
          } else {
            // Someone else paid — I owe the payer my share
            if (payerMember && payerMember.user_id !== userId) {
              ensureEntry(payerMember.name, payerMember.user_id, group.name);
              debtMap[payerMember.name].net -= myShare.finalPayable;
              debtMap[payerMember.name].hasTransactions = true;
            }
          }
        }
      }

      // 5. Apply payments to net amounts
      for (const [otherUserId, toPayers] of Object.entries(paymentsMap)) {
        for (const [toUserId, amount] of Object.entries(toPayers)) {
          // Find names from groups
          for (const group of groups) {
            const members = group.group_members ?? [];
            const fromMember = members.find((m) => m.user_id === otherUserId);
            const toMember = members.find((m) => m.user_id === toUserId);
            if (!fromMember || !toMember) continue;

            if (otherUserId === userId) {
              // I paid someone → reduces what I owe them (their net should increase by amount)
              if (debtMap[toMember.name]) {
                debtMap[toMember.name].net += amount;
              }
            } else if (toUserId === userId) {
              // Someone paid me → reduces what they owe me (their net decreases)
              if (debtMap[fromMember.name]) {
                debtMap[fromMember.name].net -= amount;
              }
            }
          }
        }
      }

      // 6. Convert to array and round
      const result: PersonBalance[] = Object.entries(debtMap)
        .map(([name, entry]) => ({
          name,
          userId: entry.userId,
          groups: [...entry.groups],
          net: Math.round(entry.net * 100) / 100,
          hasTransactions: entry.hasTransactions,
        }))
        // Sort: people who owe me most → people I owe most → settled
        .sort((a, b) => {
          if (a.net !== 0 || b.net !== 0) return b.net - a.net;
          return a.name.localeCompare(b.name);
        });

      setBalances(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load balances");
    } finally {
      setLoading(false);
    }
  }, [userId, refreshTrigger]);

  useEffect(() => {
    calculate();
  }, [calculate]);

  /* ── derived totals ── */
  const totalOwedToMe = balances
    .filter((b) => b.net > 0.005)
    .reduce((s, b) => s + b.net, 0);
  const totalIOwe = balances
    .filter((b) => b.net < -0.005)
    .reduce((s, b) => s + Math.abs(b.net), 0);
  const netPosition = totalOwedToMe - totalIOwe;

  return (
    <section>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-primary/10 text-primary p-2.5 rounded-xl">
          <Wallet className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Overall Balances</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Your net position across all groups
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-3">
          <Loader2 className="w-5 h-5 animate-spin" />
          Calculating balances...
        </div>
      )}

      {!loading && error && (
        <Card className="p-6 border-destructive/30 bg-destructive/5 text-destructive text-sm">
          {error}
        </Card>
      )}

      {!loading && !error && (
        <>
          {/* Summary cards */}
          {balances.some((b) => b.hasTransactions) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              <Card className="p-4 flex items-center gap-3 border bg-card">
                <div className="p-2 rounded-lg bg-emerald-50">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Owed to you
                  </p>
                  <p className="text-lg font-bold font-mono text-emerald-600">
                    {formatCurrency(totalOwedToMe)}
                  </p>
                </div>
              </Card>

              <Card className="p-4 flex items-center gap-3 border bg-card">
                <div className="p-2 rounded-lg bg-orange-50">
                  <TrendingDown className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    You owe
                  </p>
                  <p className="text-lg font-bold font-mono text-orange-600">
                    {formatCurrency(totalIOwe)}
                  </p>
                </div>
              </Card>

              <Card
                className={`p-4 flex items-center gap-3 border bg-card ${
                  netPosition > 0.005
                    ? "border-emerald-200 bg-emerald-50/30"
                    : netPosition < -0.005
                      ? "border-orange-200 bg-orange-50/30"
                      : ""
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    netPosition > 0.005
                      ? "bg-emerald-100"
                      : netPosition < -0.005
                        ? "bg-orange-100"
                        : "bg-secondary"
                  }`}
                >
                  <Wallet
                    className={`w-4 h-4 ${
                      netPosition > 0.005
                        ? "text-emerald-600"
                        : netPosition < -0.005
                          ? "text-orange-600"
                          : "text-muted-foreground"
                    }`}
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Net position
                  </p>
                  <p
                    className={`text-lg font-bold font-mono ${
                      netPosition > 0.005
                        ? "text-emerald-600"
                        : netPosition < -0.005
                          ? "text-orange-600"
                          : "text-muted-foreground"
                    }`}
                  >
                    {netPosition >= 0 ? "+" : ""}
                    {formatCurrency(netPosition)}
                  </p>
                </div>
              </Card>
            </div>
          )}

          {/* Balance list */}
          {balances.length === 0 ? (
            <Card className="p-12 border-dashed border-2 flex flex-col items-center justify-center text-center bg-secondary/30">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                <Wallet className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                No balances yet
              </h3>
              <p className="text-muted-foreground max-w-sm text-sm">
                Once you share orders with group members, your balances will
                appear here.
              </p>
            </Card>
          ) : (
            <Card className="overflow-hidden border shadow-sm bg-card">
              <div className="bg-secondary/40 border-b px-5 py-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  People
                </span>
                <Badge variant="outline" className="ml-auto font-mono text-xs">
                  {balances.length}
                </Badge>
              </div>

              <div className="divide-y divide-border">
                {balances.map((b) => {
                  const isSettled = Math.abs(b.net) < 0.005;
                  const theyOweMe = b.net > 0.005;
                  const iOweThem = b.net < -0.005;

                  return (
                    <div
                      key={b.name}
                      className={`flex items-center gap-4 px-5 py-4 transition-colors ${
                        isSettled
                          ? "opacity-50 hover:opacity-70"
                          : "hover:bg-secondary/20"
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold uppercase shrink-0 ${
                          isSettled
                            ? "bg-muted text-muted-foreground"
                            : theyOweMe
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {b.name.charAt(0)}
                      </div>

                      {/* Name + groups */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-semibold leading-snug ${
                            isSettled
                              ? "text-muted-foreground"
                              : "text-foreground"
                          }`}
                        >
                          {b.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {b.groups.join(", ")}
                        </p>
                      </div>

                      {/* Balance label + amount */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isSettled ? (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Minus className="w-3.5 h-3.5" />
                            <span className="font-mono text-sm font-medium">
                              —
                            </span>
                          </div>
                        ) : theyOweMe ? (
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                              <ArrowRight className="w-3 h-3" />
                              owes you
                            </span>
                            <span className="font-mono font-bold text-base text-emerald-600">
                              {formatCurrency(b.net)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="text-xs text-orange-600 font-medium flex items-center gap-1">
                              <ArrowRight className="w-3 h-3 rotate-180" />
                              you owe
                            </span>
                            <span className="font-mono font-bold text-base text-orange-600">
                              {formatCurrency(Math.abs(b.net))}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Legend note */}
          {balances.some(
            (b) => Math.abs(b.net) < 0.005 && b.hasTransactions,
          ) && (
            <p className="text-xs text-muted-foreground mt-3 px-1 flex items-center gap-1.5">
              <Minus className="w-3 h-3" />
              Greyed-out rows with — mean you've had shared orders but currently
              owe each other nothing.
            </p>
          )}
        </>
      )}
    </section>
  );
}
