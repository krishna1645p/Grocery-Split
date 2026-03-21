// @ts-ignore
import { supabase } from '../../../../../lib/supabase';
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { computePersonSummaries } from "@/hooks/use-grocery-store";
import {
  History,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  Store,
  Calendar,
  Package,
  ExternalLink,
  Loader2,
  ShoppingBasket,
  Receipt,
  Truck,
  HeartHandshake,
  Tags,
  Users,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface RawItem {
  id: string;
  name: string;
  link: string | null;
  base_price: number;
  quantity: number;
  requested_by_index: number;
  split_type: string;
  split_with_indices: number[];
}

interface RawAdjustment {
  tax: number;
  delivery: number;
  tip: number;
  promo: number;
}

interface RawMember {
  id: string;
  name: string;
  email: string | null;
}

interface RawOrder {
  id: string;
  order_name: string;
  store: string;
  created_at: string;
  groups: {
    id: string;
    name: string;
    group_members: RawMember[];
  } | null;
  items: RawItem[];
  adjustments: RawAdjustment[];
}

interface OrderHistoryProps {
  userId: string;
  refreshTrigger?: string | null;
}

function SplitBadge({ type }: { type: string }) {
  if (type === 'self') return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs font-normal">Self</Badge>;
  if (type === 'all') return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-normal">Everyone</Badge>;
  return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs font-normal">Selected</Badge>;
}

function AdjustmentPill({ icon, label, value, positive }: { icon: React.ReactNode; label: string; value: number; positive: boolean }) {
  if (value === 0) return null;
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-card border rounded-xl">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        {icon}
        {label}
      </div>
      <span className={`font-mono font-semibold text-sm ${positive ? 'text-orange-600' : 'text-primary'}`}>
        {positive ? '+' : '-'}{formatCurrency(value)}
      </span>
    </div>
  );
}

function OrderCard({ order }: { order: RawOrder }) {
  const [expanded, setExpanded] = useState(false);

  const members = order.groups?.group_members ?? [];
  const adj = order.adjustments[0] ?? { tax: 0, delivery: 0, tip: 0, promo: 0 };

  const itemsForCalc = order.items.map((i) => ({
    basePrice: i.base_price,
    quantity: i.quantity,
    requestedByIndex: i.requested_by_index,
    splitType: i.split_type as 'self' | 'all' | 'selected',
    splitWithIndices: i.split_with_indices ?? [],
  }));

  const { personSummaries, totalItemsSubtotal, totalAdjustments, grandTotal } =
    computePersonSummaries(members, itemsForCalc, adj);

  const hasAdjustments = adj.tax > 0 || adj.delivery > 0 || adj.tip > 0 || adj.promo > 0;

  const createdAt = new Date(order.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const getMemberName = (idx: number) => members[idx]?.name ?? '—';

  const getSplitDescription = (item: RawItem) => {
    if (item.split_type === 'self') return getMemberName(item.requested_by_index);
    if (item.split_type === 'all') return `All ${members.length}`;
    return (item.split_with_indices ?? []).map((i) => getMemberName(i)).join(', ');
  };

  return (
    <Card className="overflow-hidden border shadow-sm bg-card">
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="w-full text-left"
        aria-expanded={expanded}
      >
        <div className="p-5 flex items-center gap-4 hover:bg-secondary/20 transition-colors">
          <div className="bg-primary/10 text-primary p-2.5 rounded-xl shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground truncate leading-snug">{order.order_name}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Store className="w-3.5 h-3.5 shrink-0" />
                {order.store}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                {createdAt}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Package className="w-3.5 h-3.5 shrink-0" />
                {order.items.length} item{order.items.length !== 1 ? 's' : ''}
              </span>
              {members.length > 0 && (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  {members.length} member{members.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total</p>
              <p className="text-xl font-bold text-primary font-mono">{formatCurrency(grandTotal)}</p>
            </div>
            <div className="text-muted-foreground bg-secondary/60 rounded-lg p-1.5">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t bg-secondary/10">
              <div className="p-5 space-y-6">

                {/* Items Table */}
                {order.items.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5" /> Items
                    </h4>
                    <div className="rounded-xl border overflow-hidden bg-card shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-secondary/60 border-b">
                            <tr>
                              <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Item</th>
                              <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Price</th>
                              <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Qty</th>
                              <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Total</th>
                              <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Requested By</th>
                              <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Split</th>
                              <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center w-10"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {order.items.map((item) => (
                              <tr key={item.id} className="hover:bg-secondary/20 transition-colors">
                                <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{item.name}</td>
                                <td className="px-4 py-3 text-right font-mono text-muted-foreground">{formatCurrency(item.base_price)}</td>
                                <td className="px-4 py-3 text-center font-mono text-muted-foreground">×{item.quantity}</td>
                                <td className="px-4 py-3 text-right font-mono font-semibold">{formatCurrency(item.base_price * item.quantity)}</td>
                                <td className="px-4 py-3 hidden md:table-cell">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold uppercase shrink-0">
                                      {getMemberName(item.requested_by_index).charAt(0)}
                                    </div>
                                    <span className="text-muted-foreground">{getMemberName(item.requested_by_index)}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 hidden sm:table-cell">
                                  <div className="flex flex-col gap-1">
                                    <SplitBadge type={item.split_type} />
                                    {item.split_type === 'selected' && (
                                      <span className="text-xs text-muted-foreground truncate max-w-[140px]" title={getSplitDescription(item)}>
                                        {getSplitDescription(item)}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {item.link ? (
                                    <a
                                      href={item.link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-secondary text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                                      title="Open link"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  ) : (
                                    <span className="text-muted-foreground/25 text-xs">—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-secondary/30 border-t font-semibold">
                            <tr>
                              <td className="px-4 py-3 text-muted-foreground" colSpan={3}>Items subtotal</td>
                              <td className="px-4 py-3 text-right font-mono">{formatCurrency(totalItemsSubtotal)}</td>
                              <td colSpan={3} className="hidden md:table-cell" />
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Adjustments */}
                {hasAdjustments && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5" /> Adjustments
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                      <AdjustmentPill icon={<Receipt className="w-4 h-4 text-red-400" />} label="Tax" value={adj.tax} positive={true} />
                      <AdjustmentPill icon={<Truck className="w-4 h-4 text-orange-400" />} label="Delivery" value={adj.delivery} positive={true} />
                      <AdjustmentPill icon={<HeartHandshake className="w-4 h-4 text-amber-400" />} label="Tip" value={adj.tip} positive={true} />
                      <AdjustmentPill icon={<Tags className="w-4 h-4 text-primary" />} label="Promo" value={adj.promo} positive={false} />
                    </div>
                    {totalAdjustments !== 0 && (
                      <p className="text-xs text-muted-foreground mt-2 px-1">
                        Net adjustment: <span className={`font-semibold font-mono ${totalAdjustments > 0 ? 'text-orange-600' : 'text-primary'}`}>
                          {totalAdjustments > 0 ? '+' : ''}{formatCurrency(totalAdjustments)}
                        </span>
                      </p>
                    )}
                  </div>
                )}

                {/* Per-Person Breakdown */}
                {personSummaries.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> Per-Person Cost Breakdown
                    </h4>
                    <div className="rounded-xl border overflow-hidden bg-card shadow-sm">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-secondary/60 border-b">
                          <tr>
                            <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Member</th>
                            <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right hidden sm:table-cell">Items</th>
                            <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right hidden sm:table-cell">Fees & Savings</th>
                            <th className="px-4 py-3 text-xs font-bold text-foreground uppercase tracking-wide text-right">Owes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {personSummaries.map((p) => (
                            <tr key={p.index} className="hover:bg-secondary/20 transition-colors">
                              <td className="px-4 py-3 font-medium">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold uppercase shrink-0">
                                    {p.name.charAt(0)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-foreground leading-snug">{p.name}</p>
                                    {members[p.index]?.email && (
                                      <p className="text-xs text-muted-foreground truncate">{members[p.index].email}</p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-muted-foreground hidden sm:table-cell">
                                {formatCurrency(p.itemsTotal)}
                              </td>
                              <td className="px-4 py-3 text-right font-mono hidden sm:table-cell">
                                <span className={
                                  p.adjustmentsTotal > 0 ? 'text-orange-500' :
                                  p.adjustmentsTotal < 0 ? 'text-primary' : 'text-muted-foreground'
                                }>
                                  {p.adjustmentsTotal > 0 ? '+' : ''}{formatCurrency(p.adjustmentsTotal)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="font-mono font-bold text-base text-foreground">
                                  {formatCurrency(p.finalPayable)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-secondary/30 border-t-2 border-border font-bold">
                          <tr>
                            <td className="px-4 py-3 text-foreground">Grand Total</td>
                            <td className="px-4 py-3 text-right font-mono text-muted-foreground hidden sm:table-cell">{formatCurrency(totalItemsSubtotal)}</td>
                            <td className="px-4 py-3 text-right font-mono text-muted-foreground hidden sm:table-cell">{formatCurrency(totalAdjustments)}</td>
                            <td className="px-4 py-3 text-right font-mono text-lg text-primary">{formatCurrency(grandTotal)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export function OrderHistory({ userId, refreshTrigger }: OrderHistoryProps) {
  const [orders, setOrders] = useState<RawOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchOrders() {
      setLoading(true);
      setError(null);
      try {
        // Step 1: find all group_ids where this user is a member
        const { data: memberRows, error: memberError } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', userId);

        if (memberError) throw memberError;

        const groupIds: string[] = [...new Set((memberRows ?? []).map((r: { group_id: string }) => r.group_id))];

        if (groupIds.length === 0) {
          if (!cancelled) { setOrders([]); setLoading(false); }
          return;
        }

        // Step 2: fetch all orders belonging to those groups, with related data
        const { data, error: fetchError } = await supabase
          .from('orders')
          .select(`
            id,
            order_name,
            store,
            created_at,
            groups (
              id,
              name,
              group_members ( id, name, email )
            ),
            items ( id, name, link, base_price, quantity, requested_by_index, split_type, split_with_indices ),
            adjustments ( tax, delivery, tip, promo )
          `)
          .in('group_id', groupIds)
          .order('created_at', { ascending: false });

        if (cancelled) return;
        if (fetchError) throw fetchError;
        setOrders((data as RawOrder[]) ?? []);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load orders');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchOrders();
    return () => { cancelled = true; };
  }, [userId, refreshTrigger]);

  return (
    <section>
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-primary/10 text-primary p-2.5 rounded-xl">
          <History className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Order History</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            All orders where you're a group member
          </p>
        </div>
        {orders.length > 0 && (
          <Badge className="ml-auto font-mono text-sm">{orders.length}</Badge>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-3">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading your orders...
        </div>
      )}

      {!loading && error && (
        <Card className="p-6 border-destructive/30 bg-destructive/5 text-destructive text-sm">
          {error}
        </Card>
      )}

      {!loading && !error && orders.length === 0 && (
        <Card className="p-12 border-dashed border-2 flex flex-col items-center justify-center text-center bg-secondary/30">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
            <ShoppingBasket className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">No orders yet</h3>
          <p className="text-muted-foreground max-w-sm text-sm">
            Submit your first order above and it'll appear here. Click any order card to expand the full breakdown.
          </p>
        </Card>
      )}

      {!loading && !error && orders.length > 0 && (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </section>
  );
}
