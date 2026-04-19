// ScanBill.tsx
// Place at: src/components/grocery/ScanBill.tsx
//
// ─── TO ACTIVATE ────────────────────────────────────────────────────────────
// 1. Deploy the Supabase Edge Function (scan-bill/index.ts)
// 2. Add ANTHROPIC_API_KEY to Supabase secrets
// 3. Flip the flag below to: true
// ────────────────────────────────────────────────────────────────────────────
const SCAN_BILL_ENABLED = true;
// ────────────────────────────────────────────────────────────────────────────

// TWO usage modes:
//
// ── Mode 1: Inside an existing order (OrderHistory) ──────────────────────────
//   <ScanBill
//     mode="order"
//     orderId={order.id}
//     members={members}
//     currentUserName={currentUserName}
//     onAdded={onRefresh}
//   />
//
// ── Mode 2: On the New Order form (Home.tsx) ─────────────────────────────────
//   <ScanBill
//     mode="new-order"
//     members={participants}
//     currentUserName={currentUserName}
//     onItemsScanned={(items, adjs) => {
//       items.forEach(i => store.addItem({ ... }));
//       store.updateAdjustments({ tax: adjs.tax, delivery: adjs.delivery, tip: adjs.tip, promo: adjs.promo_savings });
//     }}
//   />

// @ts-ignore
import { supabase } from "../../../lib/supabase";
import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ScanLine,
  Upload,
  Camera,
  Loader2,
  Check,
  X,
  Trash2,
  Receipt,
  AlertCircle,
  Users,
  ChevronRight,
  RotateCcw,
  Lock,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────────────────────── */

interface RawMember {
  id: string;
  name: string;
  email?: string | null;
}

export interface ScannedItemResult {
  name: string;
  link: string | null;
  base_price: number;
  quantity: number;
  requested_by: string;
  split_type: "self" | "all";
  split_with_indices: number[];
}

export interface ScannedAdjustments {
  tax: number;
  delivery: number;
  tip: number;
  promo_savings: number;
}

interface ScannedItemDraft {
  _id: string;
  name: string;
  base_price: number;
  quantity: number;
  requested_by: string;
  split_type: "self" | "all";
  selected: boolean;
}

interface AdjDraft {
  tax: string;
  delivery: string;
  tip: string;
  promo_savings: string;
  apply: boolean;
}

type ScanBillProps =
  | {
      mode: "order";
      orderId: string;
      members: RawMember[];
      currentUserName: string;
      onAdded: () => void;
    }
  | {
      mode: "new-order";
      members: RawMember[];
      currentUserName: string;
      onItemsScanned: (
        items: ScannedItemResult[],
        adjustments: ScannedAdjustments,
      ) => void;
    };

/* ─── Helpers ────────────────────────────────────────────────────────────────── */

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function adjHasValues(a: AdjDraft) {
  return (
    parseFloat(a.tax) > 0 ||
    parseFloat(a.delivery) > 0 ||
    parseFloat(a.tip) > 0 ||
    parseFloat(a.promo_savings) > 0
  );
}

/* ─── Split Pill ─────────────────────────────────────────────────────────────── */

function SplitPill({
  type,
  onClick,
  disabled,
}: {
  type: "self" | "all";
  onClick: () => void;
  disabled?: boolean;
}) {
  const styles = {
    all: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
    self: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title="Click to toggle split"
      className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border transition-all
        ${disabled ? "opacity-40 cursor-default" : "cursor-pointer"}
        ${styles[type]}`}
    >
      {type === "all" && <Users className="w-3 h-3" />}
      {type === "all" ? "Everyone" : "Self"}
      {!disabled && <ChevronRight className="w-3 h-3 opacity-40" />}
    </button>
  );
}

/* ─── Disabled / Coming Soon button ─────────────────────────────────────────── */

function ComingSoonButton() {
  return (
    <div className="relative group">
      <Button
        variant="outline"
        size="sm"
        disabled
        className="gap-1.5 opacity-60 cursor-not-allowed"
      >
        <ScanLine className="w-3.5 h-3.5" />
        Scan Bill
        <Badge
          variant="secondary"
          className="ml-1 text-[10px] px-1.5 py-0 font-medium bg-amber-100 text-amber-700 border-amber-200"
        >
          Soon
        </Badge>
      </Button>
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-3 py-2 bg-popover border rounded-lg shadow-lg text-xs text-center text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        <Lock className="w-3 h-3 inline mr-1 text-amber-500" />
        Coming soon — AI receipt scanning will let you upload a bill and
        auto-fill all items.
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────────── */

export function ScanBill(props: ScanBillProps) {
  // Feature flag gate — renders a disabled "coming soon" button until activated
  if (!SCAN_BILL_ENABLED) {
    return <ComingSoonButton />;
  }

  return <ScanBillActive {...props} />;
}

/* ─── Active implementation (only mounted when SCAN_BILL_ENABLED = true) ──────── */

function ScanBillActive(props: ScanBillProps) {
  const { members, currentUserName } = props;

  const [open, setOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMediaType, setImageMediaType] = useState("image/jpeg");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [items, setItems] = useState<ScannedItemDraft[]>([]);
  const [adj, setAdj] = useState<AdjDraft>({
    tax: "0",
    delivery: "0",
    tip: "0",
    promo_savings: "0",
    apply: true,
  });
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultRequester =
    members.find((m) => m.name.toLowerCase() === currentUserName?.toLowerCase())
      ?.name ??
    currentUserName ??
    members[0]?.name ??
    "";

  /* ── Image ingestion ── */

  const ingestFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setScanError("Please upload an image file (JPG, PNG, WEBP, HEIC, etc.)");
      return;
    }
    setImageMediaType(file.type || "image/jpeg");
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      setImageBase64(dataUrl.split(",")[1]);
      setItems([]);
      setScanError(null);
      setAdj({
        tax: "0",
        delivery: "0",
        tip: "0",
        promo_savings: "0",
        apply: true,
      });
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) ingestFile(file);
    e.target.value = "";
  };

  /* ── Scan — calls Supabase Edge Function (not Anthropic directly) ── */

  const handleScan = async () => {
    if (!imageBase64) return;
    setScanning(true);
    setScanError(null);
    setItems([]);

    try {
      // Calls your Supabase Edge Function which holds the Anthropic API key securely
      const { data, error } = await supabase.functions.invoke("scan-bill", {
        body: {
          imageBase64,
          imageMediaType,
          memberNames: members.map((m) => m.name).join(", "),
        },
      });

      if (error) {
        const detail = data?.error ?? error.message ?? "Edge function error";
        throw new Error(
          typeof detail === "string" ? detail : JSON.stringify(detail),
        );
      }

      const parsed = data as {
        items: { name: string; base_price: number; quantity: number }[];
        adjustments: {
          tax: number;
          delivery: number;
          tip: number;
          promo_savings: number;
        };
      };

      // Populate adjustments
      const a = parsed.adjustments ?? {};
      setAdj({
        tax: String(Math.max(0, Number(a.tax) || 0)),
        delivery: String(Math.max(0, Number(a.delivery) || 0)),
        tip: String(Math.max(0, Number(a.tip) || 0)),
        promo_savings: String(Math.max(0, Number(a.promo_savings) || 0)),
        apply: true,
      });

      const parsedItems = Array.isArray(parsed.items) ? parsed.items : [];
      if (parsedItems.length === 0) {
        setScanError(
          "No items found. Make sure the photo is clear and well-lit, then try again — or add items manually.",
        );
        setScanning(false);
        return;
      }

      setItems(
        parsedItems.map((it) => ({
          _id: uid(),
          name: String(it.name ?? "Unknown item").trim(),
          base_price: Math.max(
            0,
            Math.round((Number(it.base_price) || 0) * 100) / 100,
          ),
          quantity: Math.max(1, Math.round(Number(it.quantity) || 1)),
          requested_by: defaultRequester,
          split_type: "all" as const,
          selected: true,
        })),
      );
    } catch (err) {
      setScanError(
        err instanceof Error ? err.message : "Failed to scan receipt",
      );
    } finally {
      setScanning(false);
    }
  };

  /* ── Item helpers ── */

  const updateItem = (id: string, patch: Partial<ScannedItemDraft>) =>
    setItems((prev) =>
      prev.map((it) => (it._id === id ? { ...it, ...patch } : it)),
    );

  const removeItem = (id: string) =>
    setItems((prev) => prev.filter((it) => it._id !== id));

  const toggleItem = (id: string) =>
    updateItem(id, { selected: !items.find((it) => it._id === id)?.selected });

  const cycleSplit = (item: ScannedItemDraft) =>
    updateItem(item._id, {
      split_type: item.split_type === "all" ? "self" : "all",
    });

  const setBulkSplit = (type: "all" | "self") =>
    setItems((prev) => prev.map((it) => ({ ...it, split_type: type })));

  const setBulkRequester = (name: string) =>
    setItems((prev) => prev.map((it) => ({ ...it, requested_by: name })));

  /* ── Confirm & save ── */

  const handleConfirm = async () => {
    const toAdd = items.filter((it) => it.selected);
    if (toAdd.length === 0) return;
    setSaving(true);
    try {
      const resultItems: ScannedItemResult[] = toAdd.map((it) => ({
        name: it.name.trim(),
        link: null,
        base_price: it.base_price,
        quantity: it.quantity,
        requested_by: it.requested_by,
        split_type: it.split_type,
        split_with_indices:
          it.split_type === "all" ? members.map((_, i) => i) : [],
      }));

      const resultAdj: ScannedAdjustments = {
        tax: adj.apply ? parseFloat(adj.tax) || 0 : 0,
        delivery: adj.apply ? parseFloat(adj.delivery) || 0 : 0,
        tip: adj.apply ? parseFloat(adj.tip) || 0 : 0,
        promo_savings: adj.apply ? parseFloat(adj.promo_savings) || 0 : 0,
      };

      if (props.mode === "order") {
        const rows = resultItems.map((it) => ({
          order_id: props.orderId,
          ...it,
          total_price: it.base_price * it.quantity,
        }));
        const { error: itemsErr } = await supabase.from("items").insert(rows);
        if (itemsErr) throw itemsErr;

        if (adj.apply) {
          const { error: adjErr } = await supabase.from("adjustments").upsert(
            {
              order_id: props.orderId,
              ...resultAdj,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "order_id" },
          );
          if (adjErr) throw adjErr;
        }

        props.onAdded();
      } else {
        props.onItemsScanned(resultItems, resultAdj);
      }

      handleClose();
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Failed to save items");
    } finally {
      setSaving(false);
    }
  };

  /* ── Close / reset ── */

  const handleClose = () => {
    setOpen(false);
    setImagePreview(null);
    setImageBase64(null);
    setItems([]);
    setScanError(null);
    setScanning(false);
    setAdj({
      tax: "0",
      delivery: "0",
      tip: "0",
      promo_savings: "0",
      apply: true,
    });
  };

  const selectedCount = items.filter((it) => it.selected).length;
  const selectedTotal = items
    .filter((it) => it.selected)
    .reduce((s, it) => s + it.base_price * it.quantity, 0);
  const hasAdj = adjHasValues(adj);

  /* ── Render ── */

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <ScanLine className="w-3.5 h-3.5" />
        Scan Bill
      </Button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={handleClose}
            />

            <motion.div
              key="modal"
              initial={{ opacity: 0, y: 32, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 32, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-x-3 top-[4vh] bottom-[4vh] z-50 max-w-3xl mx-auto bg-background rounded-2xl shadow-2xl border flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b bg-secondary/20 shrink-0">
                <div className="bg-primary/10 text-primary p-2 rounded-xl">
                  <ScanLine className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-lg leading-tight">Scan Bill</h2>
                  <p className="text-xs text-muted-foreground truncate">
                    {items.length > 0
                      ? `${selectedCount} of ${items.length} items selected · $${selectedTotal.toFixed(2)}`
                      : "Upload or photograph your receipt — AI extracts all items automatically"}
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-lg text-muted-foreground hover:bg-secondary transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-5 space-y-5">
                  {/* Upload zone */}
                  {!imagePreview && (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                      }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                        const f = e.dataTransfer.files?.[0];
                        if (f) ingestFile(f);
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all select-none
                        ${
                          dragOver
                            ? "border-primary bg-primary/5 scale-[1.01]"
                            : "border-border hover:border-primary/40 hover:bg-secondary/20"
                        }`}
                    >
                      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                        <Receipt className="w-8 h-8 text-primary" />
                      </div>
                      <div className="text-center space-y-1">
                        <p className="font-semibold text-foreground">
                          Drop your receipt here
                        </p>
                        <p className="text-sm text-muted-foreground">
                          or click to browse — JPG, PNG, WEBP, HEIC
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary rounded-full px-3 py-1.5">
                          <Upload className="w-3 h-3" /> Upload file
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary rounded-full px-3 py-1.5">
                          <Camera className="w-3 h-3" /> Take photo
                        </span>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </div>
                  )}

                  {/* Image preview */}
                  {imagePreview && (
                    <div className="space-y-3">
                      <div className="relative rounded-xl overflow-hidden border bg-secondary/20 max-h-56 flex items-center justify-center">
                        <img
                          src={imagePreview}
                          alt="Receipt preview"
                          className="max-h-56 object-contain"
                        />
                        <button
                          onClick={() => {
                            setImagePreview(null);
                            setImageBase64(null);
                            setItems([]);
                            setScanError(null);
                          }}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {items.length === 0 && !scanning && (
                        <Button
                          onClick={handleScan}
                          className="w-full gap-2"
                          size="lg"
                        >
                          <ScanLine className="w-4 h-4" />
                          Extract Items with AI
                        </Button>
                      )}

                      {items.length > 0 && !scanning && (
                        <button
                          onClick={() => {
                            setItems([]);
                            setScanError(null);
                            handleScan();
                          }}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" /> Re-scan this image
                        </button>
                      )}

                      {scanning && (
                        <div className="flex flex-col items-center gap-3 py-8">
                          <Loader2 className="w-7 h-7 animate-spin text-primary" />
                          <div className="text-center">
                            <p className="text-sm font-medium text-foreground">
                              Reading your receipt…
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Extracting items, prices, and adjustments
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Error */}
                  {scanError && (
                    <div className="flex items-start gap-3 p-4 bg-destructive/5 border border-destructive/20 rounded-xl">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-destructive" />
                      <div>
                        <p className="text-sm font-semibold text-destructive">
                          Scan issue
                        </p>
                        <p className="text-sm mt-0.5 text-destructive/80">
                          {scanError}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Review table */}
                  {items.length > 0 && (
                    <div className="space-y-3">
                      {/* Bulk controls */}
                      <div className="flex items-center gap-3 flex-wrap text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-muted-foreground">
                            All split:
                          </span>
                          <button
                            onClick={() => setBulkSplit("all")}
                            className="px-2.5 py-1 rounded-full border bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition-colors"
                          >
                            Everyone
                          </button>
                          <button
                            onClick={() => setBulkSplit("self")}
                            className="px-2.5 py-1 rounded-full border bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 transition-colors"
                          >
                            Self
                          </button>
                        </div>
                        {members.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-muted-foreground">
                              All by:
                            </span>
                            <select
                              onChange={(e) => setBulkRequester(e.target.value)}
                              defaultValue=""
                              className="border rounded-full px-2.5 py-0.5 text-xs bg-white"
                            >
                              <option value="" disabled>
                                pick…
                              </option>
                              {members.map((m) => (
                                <option key={m.id} value={m.name}>
                                  {m.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        <label className="flex items-center gap-1.5 ml-auto cursor-pointer text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={items.every((it) => it.selected)}
                            onChange={(e) =>
                              setItems((prev) =>
                                prev.map((it) => ({
                                  ...it,
                                  selected: e.target.checked,
                                })),
                              )
                            }
                            className="accent-primary"
                          />
                          Select all
                        </label>
                      </div>

                      {/* Table */}
                      <div className="rounded-xl border overflow-hidden bg-card shadow-sm">
                        <div className="hidden sm:grid grid-cols-[20px_1fr_90px_54px_74px_110px_28px] gap-x-2 px-3 py-2 bg-secondary/60 border-b text-[11px] font-semibold text-muted-foreground uppercase tracking-wide items-center">
                          <span />
                          <span>Item</span>
                          <span className="text-right">Price</span>
                          <span className="text-center">Qty</span>
                          <span className="text-right">Total</span>
                          <span className="text-center">Split</span>
                          <span />
                        </div>

                        <div className="divide-y divide-border">
                          {items.map((item) => (
                            <div
                              key={item._id}
                              className={`px-3 py-2 transition-colors ${item.selected ? "bg-card" : "bg-secondary/10 opacity-40"}`}
                            >
                              {/* Desktop */}
                              <div className="hidden sm:grid grid-cols-[20px_1fr_90px_54px_74px_110px_28px] gap-x-2 items-center">
                                <input
                                  type="checkbox"
                                  checked={item.selected}
                                  onChange={() => toggleItem(item._id)}
                                  className="accent-primary"
                                />
                                <Input
                                  value={item.name}
                                  onChange={(e) =>
                                    updateItem(item._id, {
                                      name: e.target.value,
                                    })
                                  }
                                  className="h-7 text-sm bg-white"
                                  disabled={!item.selected}
                                />
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.base_price}
                                  onChange={(e) =>
                                    updateItem(item._id, {
                                      base_price:
                                        parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="h-7 text-sm text-right bg-white"
                                  disabled={!item.selected}
                                />
                                <Input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    updateItem(item._id, {
                                      quantity: parseInt(e.target.value) || 1,
                                    })
                                  }
                                  className="h-7 text-sm text-center bg-white"
                                  disabled={!item.selected}
                                />
                                <span className="text-right font-mono text-sm font-semibold pr-1">
                                  $
                                  {(item.base_price * item.quantity).toFixed(2)}
                                </span>
                                <div className="flex flex-col items-center gap-1">
                                  <SplitPill
                                    type={item.split_type}
                                    onClick={() => cycleSplit(item)}
                                    disabled={!item.selected}
                                  />
                                  {item.split_type === "self" &&
                                    item.selected && (
                                      <select
                                        value={item.requested_by}
                                        onChange={(e) =>
                                          updateItem(item._id, {
                                            requested_by: e.target.value,
                                          })
                                        }
                                        className="border rounded px-1.5 py-0.5 text-[11px] bg-white w-full"
                                      >
                                        {members.map((m) => (
                                          <option key={m.id} value={m.name}>
                                            {m.name}
                                          </option>
                                        ))}
                                      </select>
                                    )}
                                </div>
                                <button
                                  onClick={() => removeItem(item._id)}
                                  className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors justify-self-center"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Mobile */}
                              <div className="flex sm:hidden items-start gap-2">
                                <input
                                  type="checkbox"
                                  checked={item.selected}
                                  onChange={() => toggleItem(item._id)}
                                  className="mt-1 accent-primary"
                                />
                                <div className="flex-1 space-y-1.5 min-w-0">
                                  <Input
                                    value={item.name}
                                    onChange={(e) =>
                                      updateItem(item._id, {
                                        name: e.target.value,
                                      })
                                    }
                                    className="h-7 text-sm bg-white"
                                    disabled={!item.selected}
                                  />
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs text-muted-foreground">
                                      $
                                    </span>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={item.base_price}
                                      onChange={(e) =>
                                        updateItem(item._id, {
                                          base_price:
                                            parseFloat(e.target.value) || 0,
                                        })
                                      }
                                      className="h-7 text-sm w-20 bg-white"
                                      disabled={!item.selected}
                                    />
                                    <span className="text-xs text-muted-foreground">
                                      ×
                                    </span>
                                    <Input
                                      type="number"
                                      value={item.quantity}
                                      onChange={(e) =>
                                        updateItem(item._id, {
                                          quantity:
                                            parseInt(e.target.value) || 1,
                                        })
                                      }
                                      className="h-7 text-sm w-14 text-center bg-white"
                                      disabled={!item.selected}
                                    />
                                    <span className="font-mono text-sm font-semibold ml-auto">
                                      $
                                      {(
                                        item.base_price * item.quantity
                                      ).toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <SplitPill
                                      type={item.split_type}
                                      onClick={() => cycleSplit(item)}
                                      disabled={!item.selected}
                                    />
                                    {item.split_type === "self" &&
                                      item.selected && (
                                        <select
                                          value={item.requested_by}
                                          onChange={(e) =>
                                            updateItem(item._id, {
                                              requested_by: e.target.value,
                                            })
                                          }
                                          className="border rounded px-2 py-0.5 text-xs bg-white"
                                        >
                                          {members.map((m) => (
                                            <option key={m.id} value={m.name}>
                                              {m.name}
                                            </option>
                                          ))}
                                        </select>
                                      )}
                                  </div>
                                </div>
                                <button
                                  onClick={() => removeItem(item._id)}
                                  className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="px-4 py-2.5 bg-secondary/30 border-t flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {selectedCount} of {items.length} items selected
                          </span>
                          <span className="font-mono font-bold text-sm">
                            ${selectedTotal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Adjustments review */}
                  {items.length > 0 && (
                    <div className="rounded-xl border bg-card overflow-hidden">
                      <div className="px-4 py-3 bg-secondary/40 border-b flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Receipt className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-semibold">
                            Detected Adjustments
                          </span>
                          {hasAdj ? (
                            <Badge
                              variant="secondary"
                              className="text-xs font-mono"
                            >
                              {[
                                parseFloat(adj.tax) > 0 &&
                                  `Tax $${parseFloat(adj.tax).toFixed(2)}`,
                                parseFloat(adj.delivery) > 0 &&
                                  `Delivery $${parseFloat(adj.delivery).toFixed(2)}`,
                                parseFloat(adj.tip) > 0 &&
                                  `Tip $${parseFloat(adj.tip).toFixed(2)}`,
                                parseFloat(adj.promo_savings) > 0 &&
                                  `Promo -$${parseFloat(adj.promo_savings).toFixed(2)}`,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-xs text-muted-foreground"
                            >
                              None detected
                            </Badge>
                          )}
                        </div>
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={adj.apply}
                            onChange={(e) =>
                              setAdj((a) => ({ ...a, apply: e.target.checked }))
                            }
                            className="accent-primary"
                          />
                          <span className="text-muted-foreground">
                            Apply to order
                          </span>
                        </label>
                      </div>

                      <div
                        className={`p-4 transition-opacity ${!adj.apply ? "opacity-40 pointer-events-none" : ""}`}
                      >
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {(
                            [
                              {
                                key: "tax",
                                label: "Tax",
                                color: "text-red-500",
                              },
                              {
                                key: "delivery",
                                label: "Delivery",
                                color: "text-orange-500",
                              },
                              {
                                key: "tip",
                                label: "Tip",
                                color: "text-amber-500",
                              },
                              {
                                key: "promo_savings",
                                label: "Promo Savings",
                                color: "text-primary",
                              },
                            ] as {
                              key: keyof AdjDraft;
                              label: string;
                              color: string;
                            }[]
                          ).map(({ key, label, color }) => (
                            <div key={key}>
                              <label
                                className={`text-xs font-medium mb-1 block ${color}`}
                              >
                                {label}
                              </label>
                              <Input
                                type="number"
                                step="0.01"
                                value={adj[key] as string}
                                onChange={(e) =>
                                  setAdj((a) => ({
                                    ...a,
                                    [key]: e.target.value,
                                  }))
                                }
                                className="h-8 text-sm bg-white"
                              />
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2.5">
                          {hasAdj ? (
                            <>
                              Values read from receipt — edit anything that
                              looks off.{" "}
                              {props.mode === "order" && (
                                <span className="text-amber-600 font-medium">
                                  Applying will overwrite existing adjustments
                                  on this order.
                                </span>
                              )}
                            </>
                          ) : (
                            "No adjustments detected. You can enter them manually via the order card after."
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              {items.length > 0 && (
                <div className="px-5 py-4 border-t bg-secondary/10 shrink-0 flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {selectedCount}
                    </span>{" "}
                    item{selectedCount !== 1 ? "s" : ""} · $
                    <span className="font-semibold text-foreground">
                      {selectedTotal.toFixed(2)}
                    </span>
                    {adj.apply && hasAdj && (
                      <span className="ml-1">+ adjustments</span>
                    )}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={handleClose}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleConfirm}
                      disabled={saving || selectedCount === 0}
                      className="gap-1.5"
                    >
                      {saving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      {props.mode === "order"
                        ? "Add to Order"
                        : "Use These Items"}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
