// @ts-ignore
import { supabase } from "../../../../../lib/supabase";
import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import {
  Bell,
  BellOff,
  Trash2,
  Loader2,
  RefreshCw,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  Pencil,
  Check,
  X,
  Plus,
  Package,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ───────── Types ───────── */

interface Member {
  id: string;
  name: string;
  email: string | null;
}

interface AlertItem {
  id: string;
  name: string;
  base_price: number;
  quantity: number;
  requested_by: string;
  split_type: "self" | "all" | "selected";
  split_with_indices: number[];
}

interface Alert {
  id: string;
  name: string;
  recurrence_interval: number;
  recurrence_unit: "day" | "week" | "month";
  recurrence_start: string;
  recurrence_end: string | null;
  days_before: number;
  is_active: boolean;
  created_at: string;
  alert_items: AlertItem[];
}

interface AlertsPanelProps {
  groupId: string;
  userId: string;
  members: Member[];
  refreshTrigger?: string | null;
  onNewAlert: () => void;
}

/* ───────── Helpers ───────── */

function recurrenceLabel(alert: Alert) {
  const n = alert.recurrence_interval;
  const unit = n === 1 ? alert.recurrence_unit : `${alert.recurrence_unit}s`;
  return `Every ${n === 1 ? "" : n + " "}${unit}`;
}

function nextOccurrence(alert: Alert): Date | null {
  const start = new Date(alert.recurrence_start + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { recurrence_interval: interval, recurrence_unit: unit } = alert;

  let current = new Date(start);
  while (current < today) {
    if (unit === "day") current.setDate(current.getDate() + interval);
    else if (unit === "week") current.setDate(current.getDate() + interval * 7);
    else current.setMonth(current.getMonth() + interval);
  }

  if (alert.recurrence_end) {
    const end = new Date(alert.recurrence_end + "T00:00:00");
    if (current > end) return null;
  }

  return current;
}

function orderGenerationDate(alert: Alert): Date | null {
  const next = nextOccurrence(alert);
  if (!next) return null;
  const gen = new Date(next);
  gen.setDate(gen.getDate() - alert.days_before);
  return gen;
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function SplitDescription({
  item,
  members,
}: {
  item: AlertItem;
  members: Member[];
}) {
  if (item.split_type === "self") return <span>{item.requested_by}</span>;
  if (item.split_type === "all") return <span>Everyone</span>;
  return (
    <span>
      {item.split_with_indices.map((i) => members[i]?.name ?? "?").join(", ")}
    </span>
  );
}

/* ───────── Editable Alert Item Row ───────── */

function EditableAlertItemRow({
  item,
  members,
  onSaved,
  onDeleted,
}: {
  item: AlertItem;
  members: Member[];
  onSaved: (updated: Partial<AlertItem>) => Promise<void>;
  onDeleted: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(String(item.base_price));
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [requestedBy, setRequestedBy] = useState(item.requested_by);
  const [splitType, setSplitType] = useState(item.split_type);
  const [splitWithIndices, setSplitWithIndices] = useState(
    item.split_with_indices,
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const toggleSelected = (idx: number) => {
    setSplitWithIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx],
    );
  };

  const handleSave = async () => {
    setSaving(true);
    await onSaved({
      name: name.trim(),
      base_price: parseFloat(price) || 0,
      quantity: parseInt(quantity) || 1,
      requested_by: requestedBy,
      split_type: splitType,
      split_with_indices:
        splitType === "all" ? members.map((_, i) => i) : splitWithIndices,
    });
    setSaving(false);
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete item "${item.name}"?`)) return;
    setDeleting(true);
    await onDeleted();
    setDeleting(false);
  };

  if (editing) {
    return (
      <div className="border rounded-xl p-3 bg-primary/5 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="col-span-2 sm:col-span-1 h-8 text-sm bg-white"
            placeholder="Item name"
          />
          <Input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="h-8 text-sm bg-white"
            placeholder="Price"
          />
          <Input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="h-8 text-sm bg-white"
            placeholder="Qty"
          />
          <select
            value={requestedBy}
            onChange={(e) => setRequestedBy(e.target.value)}
            className="border rounded-md px-2 py-1 text-sm bg-white h-8"
          >
            {members.map((m) => (
              <option key={m.id} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Split:</span>
          {(["self", "all", "selected"] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setSplitType(t);
                if (t === "all") setSplitWithIndices(members.map((_, i) => i));
                if (t === "self") setSplitWithIndices([]);
              }}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                splitType === t
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-muted-foreground hover:bg-secondary"
              }`}
            >
              {t === "self" ? "Self" : t === "all" ? "Everyone" : "Selected"}
            </button>
          ))}
          {splitType === "selected" &&
            members.map((m, idx) => (
              <button
                key={m.id}
                onClick={() => toggleSelected(idx)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  splitWithIndices.includes(idx)
                    ? "bg-primary/10 text-primary border-primary/30 font-medium"
                    : "bg-white text-muted-foreground"
                }`}
              >
                {m.name}
              </button>
            ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-primary text-white hover:bg-primary/90"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary/20 group transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{item.name}</span>
          <span className="font-mono text-xs text-muted-foreground">
            {formatCurrency(item.base_price)} × {item.quantity} ={" "}
            <span className="font-semibold text-foreground">
              {formatCurrency(item.base_price * item.quantity)}
            </span>
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Split with: <SplitDescription item={item} members={members} />
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setEditing(true)}
          className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          {deleting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

/* ───────── Alert Card ───────── */

function AlertCard({
  alert,
  members,
  onRefresh,
}: {
  alert: Alert;
  members: Member[];
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(alert.name);
  const [savingName, setSavingName] = useState(false);
  const [addingItem, setAddingItem] = useState(false);

  // New item form state
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemQty, setNewItemQty] = useState("1");
  const [newItemRequestedBy, setNewItemRequestedBy] = useState(
    members[0]?.name ?? "",
  );
  const [newItemSplitType, setNewItemSplitType] = useState<
    "self" | "all" | "selected"
  >("all");
  const [newItemSplitIndices, setNewItemSplitIndices] = useState<number[]>(
    members.map((_, i) => i),
  );
  const [savingNewItem, setSavingNewItem] = useState(false);

  const next = nextOccurrence(alert);
  const genDate = orderGenerationDate(alert);
  const isExpired = !next;

  const handleTogglePause = async () => {
    setToggling(true);
    try {
      const { error } = await supabase
        .from("alerts")
        .update({
          is_active: !alert.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", alert.id);
      if (error) throw error;
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update alert");
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete alert "${alert.name}"? This cannot be undone.`))
      return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("alerts")
        .delete()
        .eq("id", alert.id);
      if (error) throw error;
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete alert");
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveName = async () => {
    if (!nameValue.trim()) return;
    setSavingName(true);
    try {
      const { error } = await supabase
        .from("alerts")
        .update({
          name: nameValue.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", alert.id);
      if (error) throw error;
      setEditingName(false);
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update name");
    } finally {
      setSavingName(false);
    }
  };

  const handleUpdateItem = async (
    itemId: string,
    updated: Partial<AlertItem>,
  ) => {
    const { error } = await supabase
      .from("alert_items")
      .update(updated)
      .eq("id", itemId);
    if (error) throw error;
    onRefresh();
  };

  const handleDeleteItem = async (itemId: string) => {
    const { error } = await supabase
      .from("alert_items")
      .delete()
      .eq("id", itemId);
    if (error) throw error;
    onRefresh();
  };

  const handleAddItem = async () => {
    if (!newItemName.trim() || !newItemPrice) return;
    setSavingNewItem(true);
    try {
      const { error } = await supabase.from("alert_items").insert({
        alert_id: alert.id,
        name: newItemName.trim(),
        base_price: parseFloat(newItemPrice),
        quantity: parseInt(newItemQty) || 1,
        requested_by: newItemRequestedBy,
        split_type: newItemSplitType,
        split_with_indices:
          newItemSplitType === "all"
            ? members.map((_, i) => i)
            : newItemSplitIndices,
      });
      if (error) throw error;
      setNewItemName("");
      setNewItemPrice("");
      setNewItemQty("1");
      setAddingItem(false);
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add item");
    } finally {
      setSavingNewItem(false);
    }
  };

  const totalAmount = alert.alert_items.reduce(
    (sum, it) => sum + it.base_price * it.quantity,
    0,
  );

  return (
    <Card
      className={`overflow-hidden border shadow-sm transition-opacity ${
        !alert.is_active ? "opacity-60" : ""
      }`}
    >
      {/* Header row */}
      <div className="p-4 flex items-center gap-3">
        <button
          onClick={() => setExpanded((p) => !p)}
          className="flex-1 flex items-center gap-3 text-left min-w-0"
        >
          <div
            className={`p-2.5 rounded-xl shrink-0 ${
              alert.is_active
                ? "bg-primary/10 text-primary"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            {alert.is_active ? (
              <Bell className="w-4 h-4" />
            ) : (
              <BellOff className="w-4 h-4" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {editingName ? (
                <div
                  className="flex items-center gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Input
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    className="h-7 text-sm bg-white w-40"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveName();
                      if (e.key === "Escape") setEditingName(false);
                    }}
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={savingName}
                    className="w-6 h-6 rounded-full flex items-center justify-center bg-primary text-white"
                  >
                    {savingName ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Check className="w-3 h-3" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setNameValue(alert.name);
                      setEditingName(false);
                    }}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <p className="font-bold text-foreground truncate">
                  {alert.name}
                </p>
              )}
              {!alert.is_active && (
                <Badge
                  variant="outline"
                  className="text-xs bg-secondary shrink-0"
                >
                  Paused
                </Badge>
              )}
              {isExpired && (
                <Badge
                  variant="outline"
                  className="text-xs bg-orange-50 text-orange-600 border-orange-200 shrink-0"
                >
                  Expired
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <RefreshCw className="w-3 h-3" />
                {recurrenceLabel(alert)}
              </span>
              {next && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  Next due: {formatDate(next)}
                </span>
              )}
              {genDate && alert.days_before > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  Order on: {formatDate(genDate)}
                </span>
              )}
              {totalAmount > 0 && (
                <span className="flex items-center gap-1 text-xs font-mono font-semibold text-primary">
                  {formatCurrency(totalAmount)}
                </span>
              )}
            </div>
          </div>

          <div className="text-muted-foreground bg-secondary/60 rounded-lg p-1.5 shrink-0">
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>
      </div>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t bg-secondary/10 p-5 space-y-5">
              {/* Items */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" /> Items
                </h4>
                <div className="border rounded-xl bg-card overflow-hidden divide-y">
                  {alert.alert_items.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No items yet
                    </p>
                  )}
                  {alert.alert_items.map((item) => (
                    <EditableAlertItemRow
                      key={item.id}
                      item={item}
                      members={members}
                      onSaved={async (updated) =>
                        handleUpdateItem(item.id, updated)
                      }
                      onDeleted={async () => handleDeleteItem(item.id)}
                    />
                  ))}
                </div>

                {/* Add item inline */}
                {addingItem ? (
                  <div className="border rounded-xl p-3 mt-3 bg-card space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <Input
                        placeholder="Item name *"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        className="col-span-2 sm:col-span-1 h-8 text-sm bg-white"
                      />
                      <Input
                        placeholder="Price *"
                        type="number"
                        step="0.01"
                        value={newItemPrice}
                        onChange={(e) => setNewItemPrice(e.target.value)}
                        className="h-8 text-sm bg-white"
                      />
                      <Input
                        placeholder="Qty"
                        type="number"
                        value={newItemQty}
                        onChange={(e) => setNewItemQty(e.target.value)}
                        className="h-8 text-sm bg-white"
                      />
                      <select
                        value={newItemRequestedBy}
                        onChange={(e) => setNewItemRequestedBy(e.target.value)}
                        className="border rounded-md px-2 py-1 text-sm bg-white h-8"
                      >
                        {members.map((m) => (
                          <option key={m.id} value={m.name}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">
                        Split:
                      </span>
                      {(["self", "all", "selected"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => {
                            setNewItemSplitType(t);
                            if (t === "all")
                              setNewItemSplitIndices(members.map((_, i) => i));
                            if (t === "self") setNewItemSplitIndices([]);
                          }}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                            newItemSplitType === t
                              ? "bg-primary text-white border-primary"
                              : "bg-white text-muted-foreground hover:bg-secondary"
                          }`}
                        >
                          {t === "self"
                            ? "Self"
                            : t === "all"
                              ? "Everyone"
                              : "Selected"}
                        </button>
                      ))}
                      {newItemSplitType === "selected" &&
                        members.map((m, idx) => (
                          <button
                            key={m.id}
                            onClick={() =>
                              setNewItemSplitIndices((prev) =>
                                prev.includes(idx)
                                  ? prev.filter((i) => i !== idx)
                                  : [...prev, idx],
                              )
                            }
                            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                              newItemSplitIndices.includes(idx)
                                ? "bg-primary/10 text-primary border-primary/30 font-medium"
                                : "bg-white text-muted-foreground"
                            }`}
                          >
                            {m.name}
                          </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleAddItem}
                        disabled={savingNewItem}
                        className="gap-1.5"
                      >
                        {savingNewItem ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        Save Item
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setAddingItem(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddingItem(true)}
                    className="mt-2 gap-1.5 border-dashed w-full"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </Button>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-dashed">
                <div className="flex gap-2">
                  {/* Edit name */}
                  {!editingName && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setEditingName(true)}
                    >
                      <Pencil className="w-3.5 h-3.5" /> Rename
                    </Button>
                  )}

                  {/* Pause / Resume */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={handleTogglePause}
                    disabled={toggling}
                  >
                    {toggling ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : alert.is_active ? (
                      <BellOff className="w-3.5 h-3.5" />
                    ) : (
                      <Bell className="w-3.5 h-3.5" />
                    )}
                    {alert.is_active ? "Pause" : "Resume"}
                  </Button>
                </div>

                {/* Delete */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 gap-1.5"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  Delete Alert
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

/* ───────── Alerts Panel (main export) ───────── */

export function AlertsPanel({
  groupId,
  userId,
  members,
  refreshTrigger,
  onNewAlert,
}: AlertsPanelProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("alerts")
        .select(
          `
          id, name, recurrence_interval, recurrence_unit,
          recurrence_start, recurrence_end, days_before,
          is_active, created_at,
          alert_items ( id, name, base_price, quantity, requested_by, split_type, split_with_indices )
        `,
        )
        .eq("group_id", groupId)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setAlerts((data as Alert[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts, refreshTrigger]);

  const activeCount = alerts.filter((a) => a.is_active).length;

  return (
    <section>
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-primary/10 text-primary p-2.5 rounded-xl">
          <Bell className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Alerts</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Recurring expenses that auto-generate orders
          </p>
        </div>
        {alerts.length > 0 && (
          <Badge className="ml-auto font-mono text-sm">
            {activeCount} active
          </Badge>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-3">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading alerts...
        </div>
      )}

      {!loading && error && (
        <Card className="p-6 border-destructive/30 bg-destructive/5 text-destructive text-sm">
          {error}
        </Card>
      )}

      {!loading && !error && alerts.length === 0 && (
        <Card className="p-12 border-dashed border-2 flex flex-col items-center justify-center text-center bg-secondary/30">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
            <Bell className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">
            No alerts yet
          </h3>
          <p className="text-muted-foreground max-w-sm text-sm mb-4">
            Create an alert for recurring expenses like rent or utilities.
            Orders will be auto-generated before each due date.
          </p>
          <Button onClick={onNewAlert} className="gap-2">
            <Plus className="w-4 h-4" /> Create First Alert
          </Button>
        </Card>
      )}

      {!loading && !error && alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              members={members}
              onRefresh={fetchAlerts}
            />
          ))}
        </div>
      )}
    </section>
  );
}
