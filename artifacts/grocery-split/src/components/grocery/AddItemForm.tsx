import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { PlusCircle, Link as LinkIcon, DollarSign, Hash } from "lucide-react";
import { Card } from "@/components/ui/card";
import { type GroceryItem, type SplitType } from "@/hooks/use-grocery-store";
import { motion, AnimatePresence } from "framer-motion";

interface AddItemFormProps {
  participantNames: string[];
  onAdd: (item: Omit<GroceryItem, 'id'>) => void;
}

export function AddItemForm({ participantNames, onAdd }: AddItemFormProps) {
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [requestedBy, setRequestedBy] = useState("0");
  const [splitType, setSplitType] = useState<SplitType>("self");
  const [splitWith, setSplitWith] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(participantNames.map((_, i) => [i, true]))
  );

  useEffect(() => {
    setSplitWith(Object.fromEntries(participantNames.map((_, i) => [i, true])));
    if (parseInt(requestedBy) >= participantNames.length) {
      setRequestedBy("0");
    }
  }, [participantNames.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !basePrice || isNaN(Number(basePrice))) return;

    const selectedIndices = Object.entries(splitWith)
      .filter(([_, isSelected]) => isSelected)
      .map(([idx]) => parseInt(idx));

    onAdd({
      name,
      link: link || undefined,
      basePrice: parseFloat(basePrice),
      quantity: parseInt(quantity) || 1,
      requestedByIndex: parseInt(requestedBy),
      splitType,
      splitWithIndices: splitType === 'selected' ? selectedIndices : [],
    });

    setName("");
    setLink("");
    setBasePrice("");
    setQuantity("1");
  };

  const handleSplitWithChange = (idx: number, checked: boolean) => {
    setSplitWith(prev => ({ ...prev, [idx]: checked }));
  };

  return (
    <Card className="p-6 bg-card border shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
            <div className="bg-primary/10 p-1.5 rounded-lg text-primary">
              <PlusCircle className="w-5 h-5" />
            </div>
            Add New Item
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          <div className="md:col-span-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="E.g., Organic Bananas"
                required
                className="bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link" className="flex items-center gap-1.5 text-muted-foreground">
                <LinkIcon className="w-3.5 h-3.5" /> Product Link (Optional)
              </Label>
              <Input
                id="link"
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://..."
                className="bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price" className="flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" /> Base Price *
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    placeholder="0.00"
                    required
                    className="pl-7 bg-white font-mono"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="qty" className="flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" /> Quantity
                </Label>
                <Input
                  id="qty"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="bg-white font-mono"
                />
              </div>
            </div>
          </div>

          <div className="md:col-span-6 space-y-5 bg-secondary/30 p-5 rounded-xl border border-border/50">
            <div className="space-y-2">
              <Label>Requested By</Label>
              <Select value={requestedBy} onValueChange={setRequestedBy}>
                <SelectTrigger className="bg-white font-medium">
                  <SelectValue placeholder="Select person" />
                </SelectTrigger>
                <SelectContent>
                  {participantNames.map((p, idx) => (
                    <SelectItem key={idx} value={idx.toString()}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 pt-2">
              <Label>How should this be split?</Label>
              <RadioGroup
                value={splitType}
                onValueChange={(val) => setSplitType(val as SplitType)}
                className="flex flex-col gap-3"
              >
                <div className="flex items-center space-x-3 bg-white p-3 rounded-lg border border-border shadow-sm">
                  <RadioGroupItem value="self" id="self" />
                  <Label htmlFor="self" className="font-medium cursor-pointer flex-1">
                    Only me ({participantNames[parseInt(requestedBy)] ?? '—'})
                  </Label>
                </div>
                <div className="flex items-center space-x-3 bg-white p-3 rounded-lg border border-border shadow-sm">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all" className="font-medium cursor-pointer flex-1">
                    Split equally among everyone ({participantNames.length} ways)
                  </Label>
                </div>
                <div className="flex items-center space-x-3 bg-white p-3 rounded-lg border border-border shadow-sm">
                  <RadioGroupItem value="selected" id="selected" />
                  <Label htmlFor="selected" className="font-medium cursor-pointer flex-1">
                    Split equally among selected...
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <AnimatePresence>
              {splitType === 'selected' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-white p-4 rounded-lg border border-border shadow-sm grid grid-cols-2 gap-3">
                    {participantNames.map((p, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <Checkbox
                          id={`split-${idx}`}
                          checked={splitWith[idx] || false}
                          onCheckedChange={(checked) => handleSplitWithChange(idx, checked === true)}
                        />
                        <Label htmlFor={`split-${idx}`} className="text-sm font-medium cursor-pointer">{p}</Label>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="pt-4 border-t border-border flex justify-end">
          <Button type="submit" size="lg" className="w-full md:w-auto font-semibold px-8 shadow-sm">
            <PlusCircle className="w-4 h-4 mr-2" /> Add Item
          </Button>
        </div>
      </form>
    </Card>
  );
}
