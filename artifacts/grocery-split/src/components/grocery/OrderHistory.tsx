// @ts-ignore
import { supabase } from "@/lib/supabase";
import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Link as LinkIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ───────── Types ───────── */

interface RawItem {
  id: string;
  name: string;
  link: string | null;
  base_price: number;
  quantity: number;
  requested_by: string;
  split_type: string;
  split_with_indices: number[];
}

interface RawAdjustment {
  id?: string;
  tax: number;
  delivery: number;
  tip: number;
  promo_savings: number;
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
  filterGroupId?: string;
  onNewOrder?: () => void;
  membersTrigger?: string | null;
}

/* ───────── Small reusable bits ───────── */

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

function AdjustmentPill({
  icon,
  label,
  value,
  positive,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  positive: boolean;
}) {
  if (value === 0) return null;
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-card border rounded-xl">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        {icon}
        {label}
      </div>
      <span
        className={`font-mono font-semibold text-sm ${positive ? "text-orange-600" : "text-primary"}`}
      >
        {positive ? "+" : "-"}
        {formatCurrency(value)}
      </span>
    </div>
  );
}

/* ───────── Editable Adjustments ───────── */

function EditableAdjustments({
  orderId,
  adj,
  onSaved,
}: {
  orderId: string;
  adj: RawAdjustment;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [tax, setTax] = useState(String(adj.tax));
  const [delivery, setDelivery] = useState(String(adj.delivery));
  const [tip, setTip] = useState(String(adj.tip));
  const [promoSavings, setPromoSavings] = useState(String(adj.promo_savings));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTax(String(adj.tax));
    setDelivery(String(adj.delivery));
    setTip(String(adj.tip));
    setPromoSavings(String(adj.promo_savings));
  }, [adj.tax, adj.delivery, adj.tip, adj.promo_savings]);

  const hasAdjustments =
    adj.tax > 0 || adj.delivery > 0 || adj.tip > 0 || adj.promo_savings > 0;
  const totalAdjustments = adj.tax + adj.delivery + adj.tip - adj.promo_savings;

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        tax: parseFloat(tax) || 0,
        delivery: parseFloat(delivery) || 0,
        tip: parseFloat(tip) || 0,
        promo_savings: parseFloat(promoSavings) || 0,
      };

      const { error } = await supabase.from("adjustments").upsert(
        {
          order_id: orderId,
          ...payload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "order_id" },
      );
      if (error) throw error;

      setEditing(false);
      onSaved();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save adjustments");
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5" /> Edit Adjustments
          </h4>
        </div>
        <div className="border rounded-xl p-4 bg-secondary/20 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <Receipt className="w-3 h-3 text-red-400" /> Tax
              </label>
              <Input
                type="number"
                step="0.01"
                value={tax}
                onChange={(e) => setTax(e.target.value)}
                className="bg-white h-9"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <Truck className="w-3 h-3 text-orange-400" /> Delivery
              </label>
              <Input
                type="number"
                step="0.01"
                value={delivery}
                onChange={(e) => setDelivery(e.target.value)}
                className="bg-white h-9"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <HeartHandshake className="w-3 h-3 text-amber-400" /> Tip
              </label>
              <Input
                type="number"
                step="0.01"
                value={tip}
                onChange={(e) => setTip(e.target.value)}
                className="bg-white h-9"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <Tags className="w-3 h-3 text-primary" /> Promo Savings
              </label>
              <Input
                type="number"
                step="0.01"
                value={promoSavings}
                onChange={(e) => setPromoSavings(e.target.value)}
                className="bg-white h-9"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="gap-1.5"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setTax(String(adj.tax));
                setDelivery(String(adj.delivery));
                setTip(String(adj.tip));
                setPromoSavings(String(adj.promo_savings));
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
          <Receipt className="w-3.5 h-3.5" /> Adjustments
        </h4>
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          title="Edit adjustments"
        >
          <Pencil className="w-3 h-3" /> Edit
        </button>
      </div>
      {hasAdjustments ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
            <AdjustmentPill
              icon={<Receipt className="w-4 h-4 text-red-400" />}
              label="Tax"
              value={adj.tax}
              positive={true}
            />
            <AdjustmentPill
              icon={<Truck className="w-4 h-4 text-orange-400" />}
              label="Delivery"
              value={adj.delivery}
              positive={true}
            />
            <AdjustmentPill
              icon={<HeartHandshake className="w-4 h-4 text-amber-400" />}
              label="Tip"
              value={adj.tip}
              positive={true}
            />
            <AdjustmentPill
              icon={<Tags className="w-4 h-4 text-primary" />}
              label="Promo"
              value={adj.promo_savings}
              positive={false}
            />
          </div>
          {totalAdjustments !== 0 && (
            <p className="text-xs text-muted-foreground mt-2 px-1">
              Net adjustment:{" "}
              <span
                className={`font-semibold font-mono ${totalAdjustments > 0 ? "text-orange-600" : "text-primary"}`}
              >
                {totalAdjustments > 0 ? "+" : ""}
                {formatCurrency(totalAdjustments)}
              </span>
            </p>
          )}
        </>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="w-full border border-dashed rounded-xl p-4 text-sm text-muted-foreground hover:bg-secondary/20 hover:text-foreground transition-colors text-center"
        >
          + Add tax, delivery, tip, or promo savings
        </button>
      )}
    </div>
  );
}

/* ───────── Add Item Form ───────── */

function AddItemForm({
  orderId,
  members,
  onAdded,
}: {
  orderId: string;
  members: RawMember[];
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [requestedBy, setRequestedBy] = useState(members[0]?.name ?? "");
  const [splitType, setSplitType] = useState("self");
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [show, setShow] = useState(false);

  if (!show) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShow(true)}
        className="gap-1.5"
      >
        <Plus className="w-3.5 h-3.5" /> Add Item
      </Button>
    );
  }

  const toggleIndex = (i: number) =>
    setSelectedIndices((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i],
    );

  const handleSave = async () => {
    if (!name.trim() || !price) return;
    setSaving(true);
    try {
      const bp = parseFloat(price);
      const qty = parseInt(quantity) || 1;
      const indices =
        splitType === "all"
          ? members.map((_: RawMember, i: number) => i)
          : splitType === "selected"
            ? selectedIndices
            : [];
      const { error } = await supabase.from("items").insert({
        order_id: orderId,
        name: name.trim(),
        link: link.trim() || null,
        base_price: bp,
        quantity: qty,
        total_price: bp * qty,
        requested_by: requestedBy,
        split_type: splitType,
        split_with_indices: indices,
      });
      if (error) throw error;
      setName("");
      setLink("");
      setPrice("");
      setQuantity("1");
      setSelectedIndices([]);
      setShow(false);
      onAdded();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add item");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border rounded-xl p-4 bg-secondary/20 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
        Add New Item
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Input
          placeholder="Item name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="col-span-2 sm:col-span-1 bg-white"
        />
        <Input
          placeholder="Price *"
          type="number"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="bg-white"
        />
        <Input
          placeholder="Qty"
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="bg-white"
        />
        <select
          value={requestedBy}
          onChange={(e) => setRequestedBy(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm bg-white"
        >
          {members.map((m) => (
            <option key={m.id} value={m.name}>
              {m.name}
            </option>
          ))}
        </select>
      </div>
      <div className="relative">
        <LinkIcon className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground/60" />
        <Input
          placeholder="Product link (optional) — e.g. https://walmart.com/..."
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className="pl-9 bg-white"
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground">
            Split:
          </span>
          {["self", "all", "selected"].map((t) => (
            <button
              key={t}
              onClick={() => setSplitType(t)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${splitType === t ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground hover:bg-secondary"}`}
            >
              {t === "self" ? "Self" : t === "all" ? "Everyone" : "Selected"}
            </button>
          ))}
        </div>
        {splitType === "selected" && (
          <div className="flex flex-wrap gap-2 pl-1">
            {members.map((m, i) => (
              <button
                key={m.id}
                onClick={() => toggleIndex(i)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border transition-colors ${selectedIndices.includes(i) ? "bg-purple-600 text-white border-purple-600" : "bg-white text-muted-foreground hover:bg-secondary"}`}
              >
                <span className="w-4 h-4 rounded-full flex items-center justify-center font-bold uppercase text-[10px]">
                  {m.name.charAt(0)}
                </span>
                {m.name}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving}
          className="gap-1.5"
        >
          {saving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
          Save Item
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setShow(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

/* ───────── Editable Item Row ───────── */

function EditableItemRow({
  item,
  members,
  onSaved,
  onDeleted,
}: {
  item: RawItem;
  members: RawMember[];
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [link, setLink] = useState(item.link ?? "");
  const [price, setPrice] = useState(String(item.base_price));
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [requestedBy, setRequestedBy] = useState(item.requested_by);
  const [splitType, setSplitType] = useState(item.split_type);
  const [splitWithIndices, setSplitWithIndices] = useState<number[]>(
    item.split_with_indices ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const toggleEditIndex = (i: number) =>
    setSplitWithIndices((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i],
    );

  const getMemberName = (idx: number) => members[idx]?.name ?? "—";

  const getSplitDescription = () => {
    if (item.split_type === "self") return item.requested_by || "—";
    if (item.split_type === "all") return `All ${members.length}`;
    return (item.split_with_indices ?? [])
      .map((i) => getMemberName(i))
      .join(", ");
  };

  const handleSave = async () => {
    if (!name.trim() || !price) return;
    setSaving(true);
    try {
      const bp = parseFloat(price);
      const qty = parseInt(quantity) || 1;
      const { error } = await supabase
        .from("items")
        .update({
          name: name.trim(),
          link: link.trim() || null,
          base_price: bp,
          quantity: qty,
          total_price: bp * qty,
          requested_by: requestedBy,
          split_type: splitType,
          split_with_indices:
            splitType === "all"
              ? members.map((_: RawMember, i: number) => i)
              : splitType === "selected"
                ? splitWithIndices
                : [],
        })
        .eq("id", item.id);
      if (error) throw error;
      setEditing(false);
      onSaved();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update item");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("items").delete().eq("id", item.id);
      if (error) throw error;
      onDeleted();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete item");
    } finally {
      setDeleting(false);
    }
  };

  if (editing) {
    return (
      <>
        <tr className="bg-primary/5">
          <td className="px-4 py-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-sm bg-white"
            />
          </td>
          <td className="px-4 py-2">
            <Input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="h-8 text-sm text-right bg-white w-20"
            />
          </td>
          <td className="px-4 py-2">
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="h-8 text-sm text-center bg-white w-14"
            />
          </td>
          <td className="px-4 py-2 text-right font-mono text-sm font-semibold">
            {formatCurrency(
              (parseFloat(price) || 0) * (parseInt(quantity) || 1),
            )}
          </td>
          <td className="px-4 py-2 hidden md:table-cell">
            <select
              value={requestedBy}
              onChange={(e) => setRequestedBy(e.target.value)}
              className="border rounded px-2 py-1 text-sm bg-white h-8"
            >
              {members.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          </td>
          <td className="px-4 py-2 hidden sm:table-cell">
            <div className="flex flex-wrap gap-1">
              {["self", "all", "selected"].map((t) => (
                <button
                  key={t}
                  onClick={() => setSplitType(t)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border ${splitType === t ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground"}`}
                >
                  {t === "self" ? "Self" : t === "all" ? "All" : "Sel"}
                </button>
              ))}
              {splitType === "selected" && (
                <div className="flex flex-wrap gap-1 mt-1 w-full">
                  {members.map((m, i) => (
                    <button
                      key={m.id}
                      onClick={() => toggleEditIndex(i)}
                      className={`text-[10px] px-2 py-0.5 rounded-full border ${splitWithIndices.includes(i) ? "bg-purple-600 text-white border-purple-600" : "bg-white text-muted-foreground"}`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </td>
          <td className="px-4 py-2">
            <div className="flex items-center gap-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-primary text-white hover:bg-primary/90 transition-colors"
                title="Save"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={() => {
                  setName(item.name);
                  setLink(item.link ?? "");
                  setPrice(String(item.base_price));
                  setQuantity(String(item.quantity));
                  setRequestedBy(item.requested_by);
                  setSplitType(item.split_type);
                  setSplitWithIndices(item.split_with_indices ?? []);
                  setEditing(false);
                }}
                className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </td>
        </tr>
        <tr className="bg-primary/5 border-b">
          <td colSpan={7} className="px-4 pb-3 pt-0">
            <div className="relative max-w-md">
              <LinkIcon className="absolute left-3 top-2 w-3.5 h-3.5 text-muted-foreground/60" />
              <Input
                placeholder="Product link (optional)"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="h-8 text-sm bg-white pl-9"
              />
            </div>
          </td>
        </tr>
      </>
    );
  }

  return (
    <tr className="hover:bg-secondary/20 transition-colors group">
      <td className="px-4 py-3 font-medium text-foreground">
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap">{item.name}</span>
          {item.link && (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0"
              title={item.link}
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-right font-mono text-muted-foreground">
        {formatCurrency(item.base_price)}
      </td>
      <td className="px-4 py-3 text-center font-mono text-muted-foreground">
        ×{item.quantity}
      </td>
      <td className="px-4 py-3 text-right font-mono font-semibold">
        {formatCurrency(item.base_price * item.quantity)}
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold uppercase shrink-0">
            {(item.requested_by || "?").charAt(0)}
          </div>
          <span className="text-muted-foreground">
            {item.requested_by || "—"}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <div className="flex flex-col gap-1">
          <SplitBadge type={item.split_type} />
          {item.split_type === "selected" && (
            <span
              className="text-xs text-muted-foreground truncate max-w-[140px]"
              title={getSplitDescription()}
            >
              {getSplitDescription()}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setEditing(true)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
            title="Edit item"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            title="Delete item"
          >
            {deleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ───────── Order Card ───────── */

function OrderCard({
  order,
  onRefresh,
}: {
  order: RawOrder;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const members = order.groups?.group_members ?? [];
  const rawAdj = order.adjustments;
  const adj: RawAdjustment = Array.isArray(rawAdj)
    ? (rawAdj[0] ?? { tax: 0, delivery: 0, tip: 0, promo_savings: 0 })
    : (rawAdj ?? { tax: 0, delivery: 0, tip: 0, promo_savings: 0 });
  const orderItems = order.items ?? [];

  const itemsForCalc = orderItems.map((i) => {
    const requestedByIndex = members.findIndex(
      (m) => m.name === i.requested_by,
    );
    return {
      basePrice: i.base_price,
      quantity: i.quantity,
      requestedByIndex: requestedByIndex >= 0 ? requestedByIndex : 0,
      splitType: i.split_type as "self" | "all" | "selected",
      splitWithIndices: i.split_with_indices ?? [],
    };
  });

  const adjForCalc = {
    tax: adj.tax,
    delivery: adj.delivery,
    tip: adj.tip,
    promo: adj.promo_savings,
  };

  const { personSummaries, totalItemsSubtotal, totalAdjustments, grandTotal } =
    computePersonSummaries(members, itemsForCalc, adjForCalc);

  const createdAt = new Date(order.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

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
            <p className="font-bold text-foreground truncate leading-snug">
              {order.order_name}
            </p>
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
                {orderItems.length} item{orderItems.length !== 1 ? "s" : ""}
              </span>
              {members.length > 0 && (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  {members.length} member{members.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Total
              </p>
              <p className="text-xl font-bold text-primary font-mono">
                {formatCurrency(grandTotal)}
              </p>
            </div>
            <div className="text-muted-foreground bg-secondary/60 rounded-lg p-1.5">
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
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
                {orderItems.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5" /> Items
                    </h4>
                    <div className="rounded-xl border overflow-hidden bg-card shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-secondary/60 border-b">
                            <tr>
                              <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Item
                              </th>
                              <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">
                                Price
                              </th>
                              <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">
                                Qty
                              </th>
                              <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">
                                Total
                              </th>
                              <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                                Requested By
                              </th>
                              <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                                Split
                              </th>
                              <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center w-24">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {orderItems.map((item) => (
                              <EditableItemRow
                                key={item.id}
                                item={item}
                                members={members}
                                onSaved={onRefresh}
                                onDeleted={onRefresh}
                              />
                            ))}
                          </tbody>
                          <tfoot className="bg-secondary/30 border-t font-semibold">
                            <tr>
                              <td
                                className="px-4 py-3 text-muted-foreground"
                                colSpan={3}
                              >
                                Items subtotal
                              </td>
                              <td className="px-4 py-3 text-right font-mono">
                                {formatCurrency(totalItemsSubtotal)}
                              </td>
                              <td
                                colSpan={3}
                                className="hidden md:table-cell"
                              />
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Add Item */}
                <AddItemForm
                  orderId={order.id}
                  members={members}
                  onAdded={onRefresh}
                />

                {/* Adjustments (editable) */}
                <EditableAdjustments
                  orderId={order.id}
                  adj={adj}
                  onSaved={onRefresh}
                />

                {/* Per-Person Breakdown */}
                {personSummaries.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> Per-Person Cost
                      Breakdown
                    </h4>
                    <div className="rounded-xl border overflow-hidden bg-card shadow-sm">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-secondary/60 border-b">
                          <tr>
                            <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Member
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right hidden sm:table-cell">
                              Items
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right hidden sm:table-cell">
                              Fees & Savings
                            </th>
                            <th className="px-4 py-3 text-xs font-bold text-foreground uppercase tracking-wide text-right">
                              Owes
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {personSummaries.map((p) => (
                            <tr
                              key={p.index}
                              className="hover:bg-secondary/20 transition-colors"
                            >
                              <td className="px-4 py-3 font-medium">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold uppercase shrink-0">
                                    {p.name.charAt(0)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-foreground leading-snug">
                                      {p.name}
                                    </p>
                                    {members[p.index]?.email && (
                                      <p className="text-xs text-muted-foreground truncate">
                                        {members[p.index].email}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-muted-foreground hidden sm:table-cell">
                                {formatCurrency(p.itemsTotal)}
                              </td>
                              <td className="px-4 py-3 text-right font-mono hidden sm:table-cell">
                                <span
                                  className={
                                    p.adjustmentsTotal > 0
                                      ? "text-orange-500"
                                      : p.adjustmentsTotal < 0
                                        ? "text-primary"
                                        : "text-muted-foreground"
                                  }
                                >
                                  {p.adjustmentsTotal > 0 ? "+" : ""}
                                  {formatCurrency(p.adjustmentsTotal)}
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
                            <td className="px-4 py-3 text-foreground">
                              Grand Total
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-muted-foreground hidden sm:table-cell">
                              {formatCurrency(totalItemsSubtotal)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-muted-foreground hidden sm:table-cell">
                              {formatCurrency(totalAdjustments)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-lg text-primary">
                              {formatCurrency(grandTotal)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* Delete Order */}
                <div className="flex justify-end pt-2 border-t border-dashed">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 gap-1.5"
                    onClick={async () => {
                      if (
                        !confirm(
                          `Delete order "${order.order_name}"? This will remove all items and adjustments.`,
                        )
                      )
                        return;
                      try {
                        const { error } = await supabase
                          .from("orders")
                          .delete()
                          .eq("id", order.id);
                        if (error) throw error;
                        onRefresh();
                      } catch (err) {
                        alert(
                          err instanceof Error
                            ? err.message
                            : "Failed to delete order",
                        );
                      }
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Order
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

/* ───────── Order History (main export) ───────── */

export function OrderHistory({
  userId,
  refreshTrigger,
  filterGroupId,
  onNewOrder,
  membersTrigger,
}: OrderHistoryProps) {
  const [orders, setOrders] = useState<RawOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let groupIds: string[];

      if (filterGroupId) {
        groupIds = [filterGroupId];
      } else {
        const { data: memberRows, error: memberError } = await supabase
          .from("group_members")
          .select("group_id")
          .eq("user_id", userId);
        if (memberError) throw memberError;
        groupIds = [
          ...new Set(
            (memberRows ?? []).map((r: { group_id: string }) => r.group_id),
          ),
        ];
      }

      if (groupIds.length === 0) {
        setOrders([]);
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("orders")
        .select(
          `
          id,
          order_name,
          store,
          created_at,
          groups (
            id,
            name,
            group_members ( id, name, email )
          ),
          items ( id, name, link, base_price, quantity, requested_by, split_type, split_with_indices ),
          adjustments ( id, tax, delivery, tip, promo_savings )
        `,
        )
        .in("group_id", groupIds)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setOrders((data as RawOrder[]) ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [userId, filterGroupId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders, refreshTrigger, membersTrigger]);

  return (
    <section>
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-primary/10 text-primary p-2.5 rounded-xl">
          <History className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Order History</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filterGroupId
              ? "Orders in this group"
              : "All orders where you're a group member"}
          </p>
        </div>
        {orders.length > 0 && (
          <Badge className="ml-auto font-mono text-sm">{orders.length}</Badge>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-3">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading orders...
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
          <h3 className="text-xl font-bold text-foreground mb-2">
            No orders yet
          </h3>
          <p className="text-muted-foreground max-w-sm text-sm mb-4">
            {filterGroupId
              ? "No orders in this group yet. Create your first one!"
              : "Submit your first order and it'll appear here."}
          </p>
          {filterGroupId && onNewOrder && (
            <Button onClick={onNewOrder} className="gap-2">
              <Plus className="w-4 h-4" /> Create First Order
            </Button>
          )}
        </Card>
      )}

      {!loading && !error && orders.length > 0 && (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} onRefresh={fetchOrders} />
          ))}
        </div>
      )}
    </section>
  );
}
