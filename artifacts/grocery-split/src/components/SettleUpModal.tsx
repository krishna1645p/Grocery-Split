import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface SettleUpModalProps {
  fromName: string;
  toName: string;
  suggestedAmount: number;
  onConfirm: (amount: number, note: string) => Promise<void>;
  onClose: () => void;
}

export function SettleUpModal({
  fromName,
  toName,
  suggestedAmount,
  onConfirm,
  onClose,
}: SettleUpModalProps) {
  const [amount, setAmount] = useState(String(suggestedAmount.toFixed(2)));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) {
      setError("Enter a valid amount");
      return;
    }
    setSaving(true);
    try {
      await onConfirm(parsed, note.trim());
      onClose();
    } catch {
      setError("Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card border rounded-2xl p-6 w-full max-w-sm shadow-lg space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Settle up</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{fromName}</span> pays{" "}
          <span className="font-semibold text-foreground">{toName}</span>
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Amount
            </label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError("");
              }}
              className="h-11 text-base font-mono"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Note (optional)
            </label>
            <Input
              placeholder="e.g. Paid via UPI"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-10"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1 gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? "Recording..." : `Record payment`}
          </Button>
          <Button variant="ghost" onClick={onClose} className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
