import { type GroceryItem } from "@/hooks/use-grocery-store";
import { formatCurrency } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Trash2, ShoppingBasket, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

interface ItemListProps {
  items: GroceryItem[];
  participants: string[];
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

export function ItemList({ items, participants, onDelete, onClearAll }: ItemListProps) {
  
  const getSplitBadge = (item: GroceryItem) => {
    switch (item.splitType) {
      case 'self':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Self Only</Badge>;
      case 'all':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Everyone</Badge>;
      case 'selected':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Selected</Badge>;
    }
  };

  const getSplitText = (item: GroceryItem) => {
    if (item.splitType === 'self') return participants[item.requestedByIndex];
    if (item.splitType === 'all') return "All 5";
    return item.splitWithIndices.map(idx => participants[idx]).join(", ");
  };

  if (items.length === 0) {
    return (
      <Card className="p-12 border-dashed border-2 flex flex-col items-center justify-center text-center bg-secondary/30">
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
          <ShoppingBasket className="w-8 h-8 text-muted-foreground/50" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">Your cart is empty</h3>
        <p className="text-muted-foreground max-w-md">
          Add items above to start building your shared grocery list. We'll automatically calculate who owes what.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end px-1">
        <h3 className="text-xl font-bold flex items-center gap-2">
          Cart Items <Badge className="ml-2 font-mono">{items.length}</Badge>
        </h3>
        <Button variant="ghost" size="sm" onClick={onClearAll} className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 transition-colors">
          <AlertCircle className="w-4 h-4 mr-2" /> Clear All
        </Button>
      </div>

      <Card className="overflow-hidden border shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b">
              <tr>
                <th className="px-4 py-3 font-semibold">Item</th>
                <th className="px-4 py-3 font-semibold text-right">Base</th>
                <th className="px-4 py-3 font-semibold text-center">Qty</th>
                <th className="px-4 py-3 font-semibold text-right">Total</th>
                <th className="px-4 py-3 font-semibold">Requested By</th>
                <th className="px-4 py-3 font-semibold">Split Info</th>
                <th className="px-4 py-3 font-semibold text-center">Link</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              <AnimatePresence>
                {items.map((item) => (
                  <motion.tr 
                    key={item.id}
                    initial={{ opacity: 0, backgroundColor: 'hsl(var(--primary) / 0.1)' }}
                    animate={{ opacity: 1, backgroundColor: 'transparent' }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="group hover:bg-secondary/20 transition-colors"
                  >
                    <td className="px-4 py-4 font-medium text-foreground whitespace-nowrap">
                      {item.name}
                    </td>
                    <td className="px-4 py-4 text-right font-mono text-muted-foreground">
                      {formatCurrency(item.basePrice)}
                    </td>
                    <td className="px-4 py-4 text-center font-mono font-medium">
                      x{item.quantity}
                    </td>
                    <td className="px-4 py-4 text-right font-mono font-semibold text-foreground">
                      {formatCurrency(item.basePrice * item.quantity)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold uppercase">
                          {participants[item.requestedByIndex]?.charAt(0)}
                        </div>
                        {participants[item.requestedByIndex]}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        {getSplitBadge(item)}
                        <span className="text-xs text-muted-foreground truncate max-w-[150px]" title={getSplitText(item)}>
                          {getSplitText(item)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {item.link ? (
                        <a 
                          href={item.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-secondary text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                          title="Open Link"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground/30">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => onDelete(item.id)}
                        className="opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 transition-all focus:opacity-100"
                        title="Delete Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
