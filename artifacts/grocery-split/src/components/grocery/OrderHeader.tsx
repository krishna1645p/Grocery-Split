import { Input } from "@/components/ui/input";
import { Store, ShoppingBag, CreditCard } from "lucide-react";
import { Card } from "@/components/ui/card";

interface OrderHeaderProps {
  orderName: string;
  setOrderName: (name: string) => void;
  storeName: string;
  setStoreName: (name: string) => void;
  paidByName: string;
  setPaidByName: (name: string) => void;
  participants: { name: string }[];
}

export function OrderHeader({
  orderName,
  setOrderName,
  storeName,
  setStoreName,
  paidByName,
  setPaidByName,
  participants,
}: OrderHeaderProps) {
  return (
    <Card className="p-6 md:p-8 bg-card border shadow-sm overflow-hidden relative">
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
        <ShoppingBag className="w-64 h-64 -mt-16 -mr-16 text-primary" />
      </div>
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6">
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
        <div className="space-y-2">
          <label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Who Paid?
          </label>
          <select
            value={paidByName}
            onChange={(e) => setPaidByName(e.target.value)}
            className="w-full text-xl md:text-2xl font-bold h-auto py-3 px-3 bg-white/50 focus:bg-white transition-colors border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Select payer...</option>
            {participants.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Card>
  );
}
