import { Input } from "@/components/ui/input";
import { Store, ShoppingBag, CreditCard, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";

export interface PayerEntry {
  name: string;
  amount: string;
}

interface OrderHeaderProps {
  orderName: string;
  setOrderName: (name: string) => void;
  storeName: string;
  setStoreName: (name: string) => void;
  payers: PayerEntry[];
  setPayers: (payers: PayerEntry[]) => void;
  participants: { name: string }[];
  grandTotal: number;
}

export function OrderHeader({
  orderName,
  setOrderName,
  storeName,
  setStoreName,
  payers,
  setPayers,
  participants,
  grandTotal,
}: OrderHeaderProps) {
  const totalPaid = payers.reduce(
    (sum, p) => sum + (parseFloat(p.amount) || 0),
    0,
  );
  const remaining = Math.round((grandTotal - totalPaid) * 100) / 100;

  const updatePayer = (
    index: number,
    field: keyof PayerEntry,
    value: string,
  ) => {
    const updated = payers.map((p, i) =>
      i === index ? { ...p, [field]: value } : p,
    );
    setPayers(updated);
  };

  const addPayer = () => {
    const usedNames = payers.map((p) => p.name);
    const next = participants.find((p) => !usedNames.includes(p.name));
    if (!next) return;
    setPayers([
      ...payers,
      {
        name: next.name,
        amount: remaining > 0 ? String(remaining.toFixed(2)) : "",
      },
    ]);
  };

  const removePayer = (index: number) => {
    setPayers(payers.filter((_, i) => i !== index));
  };

  return (
    <Card className="p-6 md:p-8 bg-card border shadow-sm overflow-hidden relative">
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
        <ShoppingBag className="w-64 h-64 -mt-16 -mr-16 text-primary" />
      </div>
      <div className="relative z-10 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" /> Order Name
            </label>
            <Input
              value={orderName}
              onChange={(e) => setOrderName(e.target.value)}
              className="text-xl md:text-2xl font-bold h-auto py-3 bg-white/50 focus-visible:bg-white transition-colors"
              placeholder="E.g., Sunday Prep Run"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Store className="w-4 h-4" /> Store
            </label>
            <Input
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="text-xl md:text-2xl font-bold h-auto py-3 bg-white/50 focus-visible:bg-white transition-colors"
              placeholder="E.g., Walmart"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Who Paid?
          </label>
          <div className="space-y-2">
            {payers.map((payer, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select
                  value={payer.name}
                  onChange={(e) => updatePayer(idx, "name", e.target.value)}
                  className="flex-1 h-10 px-3 border border-input rounded-md bg-white/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {participants.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <div className="relative w-32">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    $
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={payer.amount}
                    onChange={(e) => updatePayer(idx, "amount", e.target.value)}
                    className="pl-6 h-10 font-mono bg-white/50"
                    placeholder="0.00"
                  />
                </div>
                {payers.length > 1 && (
                  <button
                    onClick={() => removePayer(idx)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            <div className="flex items-center justify-between pt-1">
              {payers.length < participants.length && (
                <button
                  onClick={addPayer}
                  className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  <Plus className="w-3.5 h-3.5" /> Add another payer
                </button>
              )}
              {grandTotal > 0 && (
                <span
                  className={`text-xs font-mono ml-auto ${Math.abs(remaining) < 0.02 ? "text-primary" : "text-orange-500"}`}
                >
                  {Math.abs(remaining) < 0.02
                    ? "✓ Fully accounted for"
                    : remaining > 0
                      ? `$${remaining.toFixed(2)} unaccounted`
                      : `$${Math.abs(remaining).toFixed(2)} over total`}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
