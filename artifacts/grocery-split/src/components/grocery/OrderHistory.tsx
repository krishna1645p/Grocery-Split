// @ts-ignore
import { supabase } from '../../../../../lib/supabase';
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { computePersonSummaries } from "@/hooks/use-grocery-store";
import { History, ChevronDown, ChevronUp, Store, Calendar, ExternalLink, Loader2, ShoppingBasket } from "lucide-react";
import { Button } from "@/components/ui/button";
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

function OrderCard({ order }: { order: RawOrder }) {
  const [expanded, setExpanded] = useState(false);

  const members = order.groups?.group_members ?? [];
  const adj = order.adjustments[0] ?? { tax: 0, delivery: 0, tip: 0, promo: 0 };
  const items = order.items.map((i) => ({
    basePrice: i.base_price,
    quantity: i.quantity,
    requestedByIndex: i.requested_by_index,
    splitType: i.split_type as 'self' | 'all' | 'selected',
    splitWithIndices: i.split_with_indices ?? [],
  }));

  const { personSummaries, totalItemsSubtotal, totalAdjustments, grandTotal } =
    computePersonSummaries(members, items, adj);

  const createdAt = new Date(order.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Card className="overflow-hidden border shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full text-left p-5 flex items-center justify-between gap-4 hover:bg-secondary/20 transition-colors"
      >
        <div className="flex items-start gap-4 min-w-0">
          <div className="bg-primary/10 text-primary p-2.5 rounded-xl shrink-0">
            <Store className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-foreground truncate">{order.order_name}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs font-normal">{order.store}</Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {createdAt}
              </span>
              <span className="text-xs text-muted-foreground">
                {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                {members.length > 0 && ` · ${members.length} member${members.length !== 1 ? 's' : ''}`}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <p className="text-lg font-bold text-primary font-mono hidden sm:block">
            {formatCurrency(grandTotal)}
          </p>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t"
          >
            <div className="p-5 space-y-6 bg-secondary/10">

              {order.items.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Items</h4>
                  <div className="rounded-xl border overflow-hidden bg-card">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-secondary/50 border-b text-xs text-muted-foreground uppercase">
                        <tr>
                          <th className="px-4 py-3">Item</th>
                          <th className="px-4 py-3 text-right">Price</th>
                          <th className="px-4 py-3 text-center">Qty</th>
                          <th className="px-4 py-3 text-right">Total</th>
                          <th className="px-4 py-3">By</th>
                          <th className="px-4 py-3">Split</th>
                          <th className="px-4 py-3 text-center">Link</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {order.items.map((item) => (
                          <tr key={item.id} className="hover:bg-secondary/20 transition-colors">
                            <td className="px-4 py-3 font-medium">{item.name}</td>
                            <td className="px-4 py-3 text-right font-mono text-muted-foreground">{formatCurrency(item.base_price)}</td>
                            <td className="px-4 py-3 text-center font-mono">x{item.quantity}</td>
                            <td className="px-4 py-3 text-right font-mono font-semibold">{formatCurrency(item.base_price * item.quantity)}</td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {members[item.requested_by_index]?.name ?? '—'}
                            </td>
                            <td className="px-4 py-3">
                              {item.split_type === 'self' && <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">Self</Badge>}
                              {item.split_type === 'all' && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">Everyone</Badge>}
                              {item.split_type === 'selected' && (
                                <span className="text-xs text-muted-foreground">
                                  {(item.split_with_indices ?? []).map((i) => members[i]?.name ?? '?').join(', ')}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {item.link ? (
                                <a href={item.link} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-secondary text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors">
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              ) : <span className="text-muted-foreground/30">-</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {(adj.tax > 0 || adj.delivery > 0 || adj.tip > 0 || adj.promo > 0) && (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Adjustments</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {adj.tax > 0 && (
                      <div className="bg-card border rounded-xl p-3 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Tax</p>
                        <p className="font-mono font-semibold text-orange-600">+{formatCurrency(adj.tax)}</p>
                      </div>
                    )}
                    {adj.delivery > 0 && (
                      <div className="bg-card border rounded-xl p-3 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Delivery</p>
                        <p className="font-mono font-semibold text-orange-600">+{formatCurrency(adj.delivery)}</p>
                      </div>
                    )}
                    {adj.tip > 0 && (
                      <div className="bg-card border rounded-xl p-3 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Tip</p>
                        <p className="font-mono font-semibold text-orange-600">+{formatCurrency(adj.tip)}</p>
                      </div>
                    )}
                    {adj.promo > 0 && (
                      <div className="bg-card border rounded-xl p-3 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Promo</p>
                        <p className="font-mono font-semibold text-primary">-{formatCurrency(adj.promo)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {personSummaries.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Per-Person Breakdown</h4>
                  <div className="rounded-xl border overflow-hidden bg-card">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-secondary/50 border-b text-xs text-muted-foreground uppercase">
                        <tr>
                          <th className="px-4 py-3">Person</th>
                          <th className="px-4 py-3 text-right hidden sm:table-cell">Items</th>
                          <th className="px-4 py-3 text-right hidden sm:table-cell">Fees</th>
                          <th className="px-4 py-3 text-right font-bold text-foreground">Owes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {personSummaries.map((p) => (
                          <tr key={p.index} className="hover:bg-secondary/20 transition-colors">
                            <td className="px-4 py-3 font-medium flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                                {p.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p>{p.name}</p>
                                {members[p.index]?.email && (
                                  <p className="text-xs text-muted-foreground">{members[p.index].email}</p>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-muted-foreground hidden sm:table-cell">{formatCurrency(p.itemsTotal)}</td>
                            <td className="px-4 py-3 text-right font-mono text-muted-foreground hidden sm:table-cell">
                              <span className={p.adjustmentsTotal > 0 ? "text-orange-500" : p.adjustmentsTotal < 0 ? "text-primary" : ""}>
                                {p.adjustmentsTotal > 0 ? '+' : ''}{formatCurrency(p.adjustmentsTotal)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-foreground">{formatCurrency(p.finalPayable)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-secondary/20 border-t-2 font-bold">
                        <tr>
                          <td className="px-4 py-3">Total</td>
                          <td className="px-4 py-3 text-right font-mono hidden sm:table-cell">{formatCurrency(totalItemsSubtotal)}</td>
                          <td className="px-4 py-3 text-right font-mono hidden sm:table-cell">{formatCurrency(totalAdjustments)}</td>
                          <td className="px-4 py-3 text-right font-mono text-primary">{formatCurrency(grandTotal)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
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
          .eq('created_by', userId)
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
        <div className="bg-primary/10 text-primary p-2 rounded-xl">
          <History className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Order History</h2>
          <p className="text-sm text-muted-foreground mt-0.5">All orders you've submitted</p>
        </div>
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
          <p className="text-muted-foreground max-w-sm">
            Submit your first order above and it'll appear here for future reference.
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
