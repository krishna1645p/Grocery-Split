import { Input } from "@/components/ui/input";
import { Store, ShoppingBag } from "lucide-react";
import { Card } from "@/components/ui/card";

interface OrderHeaderProps {
  orderName: string;
  setOrderName: (name: string) => void;
  storeName: string;
  setStoreName: (name: string) => void;
}

export function OrderHeader({
  orderName,
  setOrderName,
  storeName,
  setStoreName,
}: OrderHeaderProps) {
  return (
    <Card className="p-6 md:p-8 bg-card border shadow-sm overflow-hidden relative">
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
        <ShoppingBag className="w-64 h-64 -mt-16 -mr-16 text-primary" />
      </div>
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6">
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
    </Card>
  );
}
