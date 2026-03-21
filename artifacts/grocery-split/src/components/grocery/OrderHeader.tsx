import { Input } from "@/components/ui/input";
import { User, Store, ShoppingBag } from "lucide-react";
import { Card } from "@/components/ui/card";

interface OrderHeaderProps {
  orderName: string;
  setOrderName: (name: string) => void;
  storeName: string;
  setStoreName: (name: string) => void;
  participants: string[];
  updateParticipant: (index: number, name: string) => void;
}

export function OrderHeader({
  orderName,
  setOrderName,
  storeName,
  setStoreName,
  participants,
  updateParticipant,
}: OrderHeaderProps) {
  return (
    <Card className="p-6 md:p-8 bg-card border-card-border shadow-sm border overflow-hidden relative">
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
        <ShoppingBag className="w-64 h-64 -mt-16 -mr-16 text-primary" />
      </div>
      
      <div className="relative z-10 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" /> Order Name
            </label>
            <Input
              value={orderName}
              onChange={(e) => setOrderName(e.target.value)}
              className="text-xl md:text-2xl font-bold h-auto py-3 bg-white/50 focus-visible:bg-white transition-colors"
              placeholder="E.g., Sunday Prep"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Store className="w-4 h-4" /> Store Name
            </label>
            <Input
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="text-xl md:text-2xl font-bold h-auto py-3 bg-white/50 focus-visible:bg-white transition-colors"
              placeholder="E.g., Walmart"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-muted-foreground flex items-center gap-2 mb-3">
            <User className="w-4 h-4" /> Participants (Roommates)
          </label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {participants.map((p, idx) => (
              <Input
                key={idx}
                value={p}
                onChange={(e) => updateParticipant(idx, e.target.value)}
                className="bg-secondary/50 border-transparent focus-visible:bg-white hover:bg-secondary transition-all text-center font-medium"
                placeholder={`Person ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
