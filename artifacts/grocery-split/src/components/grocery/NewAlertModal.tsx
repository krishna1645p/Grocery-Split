// @ts-ignore
import { supabase } from "../../../../../lib/supabase";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import {
  X,
  Plus,
  Trash2,
  Bell,
  Loader2,
  Check,
  Calendar,
  RefreshCw,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ───────── Types ───────── */

interface Member {
  id: string;
  name: string;
  email: string | null;
}

interface AlertItem {
  id: string; // local only for keying
  name: string;
  base_price: string;
  quantity: string;
  requested_by: string;
  split_type: "self" | "all" | "selected";
  split_with_indices: number[];
}

interface NewAlertModalProps {
  groupId: string;
  userId: string;
  members: Member[];
  onClose: () => void;
  onCreated: () => void;
}

/* ───────── Split Badge ───────── */

function SplitBadge({ type }: { type: string }) {
  if (type === "self")
    return (
      <Badge
        variant="outline"
        className="bg-orange-50 text-orange-700 border-orange-200 text-xs font-normal"
      >
        Self
      </Badge>
    );
  if (type === "all")
    return (
      <Badge
        variant="outline"
        className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-normal"
      >
        Everyone
      </Badge>
    );
  return (
    <Badge
      variant="outline"
      className="bg-purple-50 text-purple-700 border-purple-200 text-xs font-normal"
    >
      Selected
    </Badge>
  );
}

/* ───────── Alert Item Row ───────── */

function AlertItemRow({
  item,
  members,
  onChange,
  onDelete,
}: {
  item: AlertItem;
  members: Member[];
  onChange: (updated: AlertItem) => void;
  onDelete: () => void;
}) {
  const toggleSelected = (idx: number) => {
    const current = item.split_with_indices;
    const next = current.includes(idx)
      ? current.filter((i) => i !== idx)
      : [...current, idx];
    onChange({ ...item, split_with_indices: next });
  };

  return (
    <div className="border rounded-xl p-4 bg-card space-y-3">
      {/* Row 1: name, price, qty, requested by */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Input
          placeholder="Item name *"
          value={item.name}
          onChange={(e) => onChange({ ...item, name: e.target.value })}
          className="col-span-2 sm:col-span-1 bg-white"
        />
        <Input
          placeholder="Price *"
          type="number"
          step="0.01"
          value={item.base_price}
          onChange={(e) => onChange({ ...item, base_price: e.target.value })}
          className="bg-white"
        />
        <Input
          placeholder="Qty"
          type="number"
          value={item.quantity}
          onChange={(e) => onChange({ ...item, quantity: e.target.value })}
          className="bg-white"
        />
        <select
          value={item.requested_by}
          onChange={(e) => onChange({ ...item, requested_by: e.target.value })}
          className="border rounded-md px-3 py-2 text-sm bg-white"
        >
          {members.map((m) => (
            <option key={m.id} value={m.name}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      {/* Row 2: split type + selected members */}
      <div className="flex items-start gap-3 flex-wrap">
        <span className="text-xs font-medium text-muted-foreground mt-1">
          Split:
        </span>
        <div className="flex gap-1.5 flex-wrap">
          {(["self", "all", "selected"] as const).map((t) => (
            <button
              key={t}
              onClick={() =>
                onChange({
                  ...item,
                  split_type: t,
                  split_with_indices:
                    t === "all"
                      ? members.map((_, i) => i)
                      : t === "self"
                        ? []
                        : item.split_with_indices,
                })
              }
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                item.split_type === t
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-muted-foreground hover:bg-secondary"
              }`}
            >
              {t === "self" ? "Self" : t === "all" ? "Everyone" : "Selected"}
            </button>
          ))}
        </div>

        {item.split_type === "selected" && (
          <div className="flex gap-1.5 flex-wrap mt-0.5">
            {members.map((m, idx) => (
              <button
                key={m.id}
                onClick={() => toggleSelected(idx)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  item.split_with_indices.includes(idx)
                    ? "bg-primary/10 text-primary border-primary/30 font-medium"
                    : "bg-white text-muted-foreground border-border hover:bg-secondary"
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Row 3: total + delete */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-mono">
          Total:{" "}
          <span className="font-semibold text-foreground">
            {formatCurrency(
              (parseFloat(item.base_price) || 0) *
                (parseInt(item.quantity) || 1),
            )}
          </span>
        </span>
        <button
          onClick={onDelete}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" /> Remove
        </button>
      </div>
    </div>
  );
}

/* ───────── Main Modal ───────── */

export function NewAlertModal({
  groupId,
  userId,
  members,
  onClose,
  onCreated,
}: NewAlertModalProps) {
  // Basic info
  const [alertName, setAlertName] = useState("");

  // Recurrence
  const [recurrenceInterval, setRecurrenceInterval] = useState("1");
  const [recurrenceUnit, setRecurrenceUnit] = useState<
    "day" | "week" | "month"
  >("month");
  const [recurrenceStart, setRecurrenceStart] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [recurrenceEnd, setRecurrenceEnd] = useState("");
  const [daysBefore, setDaysBefore] = useState("3");

  // Items
  const [items, setItems] = useState<AlertItem[]>([
    {
      id: crypto.randomUUID(),
      name: "",
      base_price: "",
      quantity: "1",
      requested_by: members[0]?.name ?? "",
      split_type: "all",
      split_with_indices: members.map((_, i) => i),
    },
  ]);

  const [saving, setSaving] = useState(false);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: "",
        base_price: "",
        quantity: "1",
        requested_by: members[0]?.name ?? "",
        split_type: "all",
        split_with_indices: members.map((_, i) => i),
      },
    ]);
  };

  const updateItem = (id: string, updated: AlertItem) => {
    setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
  };

  const deleteItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const totalAmount = items.reduce(
    (sum, it) =>
      sum + (parseFloat(it.base_price) || 0) * (parseInt(it.quantity) || 1),
    0,
  );

  const handleSave = async () => {
    if (!alertName.trim()) {
      alert("Alert name is required.");
      return;
    }
    if (!recurrenceStart) {
      alert("Start date is required.");
      return;
    }
    const validItems = items.filter((it) => it.name.trim() && it.base_price);
    if (validItems.length === 0) {
      alert("Add at least one item with a name and price.");
      return;
    }

    setSaving(true);
    try {
      // 1. Insert alert
      const { data: alertData, error: alertError } = await supabase
        .from("alerts")
        .insert({
          group_id: groupId,
          created_by: userId,
          name: alertName.trim(),
          recurrence_interval: parseInt(recurrenceInterval) || 1,
          recurrence_unit: recurrenceUnit,
          recurrence_start: recurrenceStart,
          recurrence_end: recurrenceEnd || null,
          days_before: parseInt(daysBefore) || 0,
          is_active: true,
        })
        .select()
        .single();

      if (alertError) throw alertError;

      // 2. Insert alert items
      const itemPayloads = validItems.map((it) => ({
        alert_id: alertData.id,
        name: it.name.trim(),
        base_price: parseFloat(it.base_price),
        quantity: parseInt(it.quantity) || 1,
        requested_by: it.requested_by,
        split_type: it.split_type,
        split_with_indices: it.split_with_indices,
      }));

      const { error: itemsError } = await supabase
        .from("alert_items")
        .insert(itemPayloads);

      if (itemsError) throw itemsError;

      onCreated();
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create alert");
    } finally {
      setSaving(false);
    }
  };

  // Human-readable recurrence summary
  const recurrenceSummary = () => {
    const interval = parseInt(recurrenceInterval) || 1;
    const unit = interval === 1 ? recurrenceUnit : `${recurrenceUnit}s`;
    const start = recurrenceStart
      ? new Date(recurrenceStart + "T00:00:00").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "—";
    const end = recurrenceEnd
      ? new Date(recurrenceEnd + "T00:00:00").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "no end date";
    const before =
      parseInt(daysBefore) > 0
        ? `, order generated ${daysBefore} day${parseInt(daysBefore) !== 1 ? "s" : ""} before`
        : "";
    return `Every ${interval === 1 ? "" : interval + " "}${unit} starting ${start}, until ${end}${before}`;
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          className="relative z-10 w-full sm:max-w-2xl bg-background rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col"
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="bg-primary/10 text-primary p-2 rounded-xl">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-lg">New Alert</h2>
                <p className="text-xs text-muted-foreground">
                  Set up a recurring expense
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body — scrollable */}
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
            {/* Alert Name */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">
                Alert Name
              </label>
              <Input
                placeholder="e.g. Rent, Electricity, Internet"
                value={alertName}
                onChange={(e) => setAlertName(e.target.value)}
                className="bg-white text-base"
              />
            </div>

            {/* Recurrence */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" /> Recurrence
              </label>
              <div className="border rounded-xl p-4 bg-secondary/10 space-y-4">
                {/* Repeat every N unit */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm text-muted-foreground font-medium">
                    Repeat every
                  </span>
                  <select
                    value={recurrenceInterval}
                    onChange={(e) => setRecurrenceInterval(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm bg-white w-20"
                  >
                    {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-1.5">
                    {(["day", "week", "month"] as const).map((u) => (
                      <button
                        key={u}
                        onClick={() => setRecurrenceUnit(u)}
                        className={`text-sm px-4 py-2 rounded-lg border transition-colors ${
                          recurrenceUnit === u
                            ? "bg-primary text-white border-primary"
                            : "bg-white text-muted-foreground hover:bg-secondary"
                        }`}
                      >
                        {u.charAt(0).toUpperCase() + u.slice(1)}
                        {parseInt(recurrenceInterval) > 1 ? "s" : ""}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Start + End dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Start date (first due
                      date)
                    </label>
                    <Input
                      type="date"
                      value={recurrenceStart}
                      onChange={(e) => setRecurrenceStart(e.target.value)}
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> End date (optional)
                    </label>
                    <Input
                      type="date"
                      value={recurrenceEnd}
                      onChange={(e) => setRecurrenceEnd(e.target.value)}
                      className="bg-white"
                    />
                  </div>
                </div>

                {/* Days before */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Generate order how many days
                    before due date?
                  </label>
                  <div className="flex items-center gap-3">
                    <select
                      value={daysBefore}
                      onChange={(e) => setDaysBefore(e.target.value)}
                      className="border rounded-lg px-3 py-2 text-sm bg-white w-24"
                    >
                      {[0, 1, 2, 3, 5, 7, 10, 14].map((n) => (
                        <option key={n} value={n}>
                          {n === 0 ? "Same day" : `${n} days`}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs text-muted-foreground">
                      before due date
                    </span>
                  </div>
                </div>

                {/* Summary pill */}
                {recurrenceStart && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                    <p className="text-xs text-primary font-medium">
                      {recurrenceSummary()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                  Items & Split
                </label>
                {totalAmount > 0 && (
                  <span className="text-xs font-mono font-semibold text-primary">
                    Total: {formatCurrency(totalAmount)}
                  </span>
                )}
              </div>
              <div className="space-y-3">
                {items.map((item) => (
                  <AlertItemRow
                    key={item.id}
                    item={item}
                    members={members}
                    onChange={(updated) => updateItem(item.id, updated)}
                    onDelete={() => deleteItem(item.id)}
                  />
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={addItem}
                className="mt-3 gap-1.5 w-full border-dashed"
              >
                <Plus className="w-3.5 h-3.5" /> Add Item
              </Button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-secondary/20 flex items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-muted-foreground hidden sm:block">
              Orders will be auto-generated and members notified
            </div>
            <div className="flex gap-2 ml-auto">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="gap-1.5"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Create Alert
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
