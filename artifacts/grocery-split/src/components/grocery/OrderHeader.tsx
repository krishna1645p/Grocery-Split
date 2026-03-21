import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { User, Store, ShoppingBag, PlusCircle, X, Mail } from "lucide-react";
import { Card } from "@/components/ui/card";
import { type Participant } from "@/hooks/use-grocery-store";

interface OrderHeaderProps {
  orderName: string;
  setOrderName: (name: string) => void;
  storeName: string;
  setStoreName: (name: string) => void;
  participants: Participant[];
  updateParticipant: (index: number, updates: Partial<Participant>) => void;
  addParticipant: () => void;
  removeParticipant: (index: number) => void;
}

export function OrderHeader({
  orderName,
  setOrderName,
  storeName,
  setStoreName,
  participants,
  updateParticipant,
  addParticipant,
  removeParticipant,
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
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <User className="w-4 h-4" /> Participants ({participants.length})
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addParticipant}
              className="gap-1.5 text-primary border-primary/30 hover:bg-primary/5"
            >
              <PlusCircle className="w-4 h-4" />
              Add Member
            </Button>
          </div>

          <div className="space-y-3">
            {participants.map((p, idx) => (
              <div key={idx} className="flex items-center gap-3 group">
                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                  {(p.name || `R${idx + 1}`).charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    value={p.name}
                    onChange={(e) => updateParticipant(idx, { name: e.target.value })}
                    className="bg-secondary/50 border-transparent focus-visible:bg-white hover:bg-secondary transition-all font-medium"
                    placeholder={`Person ${idx + 1}`}
                  />
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground/50" />
                    <Input
                      type="email"
                      value={p.email}
                      onChange={(e) => updateParticipant(idx, { email: e.target.value })}
                      className="pl-9 bg-secondary/30 border-transparent focus-visible:bg-white hover:bg-secondary transition-all text-sm"
                      placeholder="email@example.com (optional)"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeParticipant(idx)}
                  disabled={participants.length <= 1}
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-destructive hover:bg-destructive/10 transition-all shrink-0 disabled:opacity-0"
                  title="Remove participant"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
