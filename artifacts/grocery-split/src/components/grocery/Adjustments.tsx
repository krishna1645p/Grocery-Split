import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Receipt, Truck, HeartHandshake, Tags } from "lucide-react";
import { type Adjustments as AdjustmentsType } from "@/hooks/use-grocery-store";

interface AdjustmentsProps {
  adjustments: AdjustmentsType;
  updateAdjustments: (updates: Partial<AdjustmentsType>) => void;
}

export function Adjustments({ adjustments, updateAdjustments }: AdjustmentsProps) {
  const handleChange = (key: keyof AdjustmentsType, value: string) => {
    const num = parseFloat(value);
    updateAdjustments({ [key]: isNaN(num) ? 0 : num });
  };

  const getInputValue = (val: number) => val === 0 ? "" : val.toString();

  return (
    <Card className="p-6 md:p-8 bg-card border shadow-sm">
      <div className="mb-6">
        <h3 className="text-xl font-bold flex items-center gap-2">
          Receipt Adjustments
        </h3>
        <p className="text-muted-foreground text-sm mt-1">
          These fees and discounts are distributed proportionally based on each person's subtotal.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-muted-foreground">
            <Receipt className="w-4 h-4 text-red-500" /> Tax (+)
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={getInputValue(adjustments.tax)}
              onChange={(e) => handleChange("tax", e.target.value)}
              placeholder="0.00"
              className="pl-7 bg-white font-mono text-lg py-5 border-red-100 focus-visible:ring-red-500 shadow-sm"
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-muted-foreground">
            <Truck className="w-4 h-4 text-orange-500" /> Delivery (+)
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={getInputValue(adjustments.delivery)}
              onChange={(e) => handleChange("delivery", e.target.value)}
              placeholder="0.00"
              className="pl-7 bg-white font-mono text-lg py-5 border-orange-100 focus-visible:ring-orange-500 shadow-sm"
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-muted-foreground">
            <HeartHandshake className="w-4 h-4 text-amber-500" /> Tip (+)
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={getInputValue(adjustments.tip)}
              onChange={(e) => handleChange("tip", e.target.value)}
              placeholder="0.00"
              className="pl-7 bg-white font-mono text-lg py-5 border-amber-100 focus-visible:ring-amber-500 shadow-sm"
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-muted-foreground">
            <Tags className="w-4 h-4 text-primary" /> Promo Savings (-)
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-primary font-bold">-$</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={getInputValue(adjustments.promo)}
              onChange={(e) => handleChange("promo", e.target.value)}
              placeholder="0.00"
              className="pl-8 bg-primary/5 font-mono text-lg py-5 border-primary/20 text-primary font-bold focus-visible:ring-primary shadow-sm placeholder:text-primary/30"
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
