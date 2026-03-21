import { useGroceryStore } from "@/hooks/use-grocery-store";
import { OrderHeader } from "@/components/grocery/OrderHeader";
import { AddItemForm } from "@/components/grocery/AddItemForm";
import { ItemList } from "@/components/grocery/ItemList";
import { Adjustments } from "@/components/grocery/Adjustments";
import { SettlementSummary } from "@/components/grocery/SettlementSummary";
import { Leaf } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  const store = useGroceryStore();

  return (
    <div className="min-h-screen pb-24 selection:bg-primary/20 selection:text-primary">
      {/* Top Navigation / Brand */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-lg shadow-sm">
              <Leaf className="w-5 h-5" />
            </div>
            <h1 className="font-display font-bold text-xl tracking-tight">GrocerySplit</h1>
          </div>
          <div className="text-sm font-medium text-muted-foreground bg-secondary px-3 py-1 rounded-full">
            No Account Needed
          </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12 space-y-12">
        
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <OrderHeader
            orderName={store.orderName}
            setOrderName={store.setOrderName}
            storeName={store.storeName}
            setStoreName={store.setStoreName}
            participants={store.participants}
            updateParticipant={store.updateParticipant}
          />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-1 gap-12"
        >
          {/* Add Item Area */}
          <div className="space-y-4">
            <AddItemForm 
              participants={store.participants} 
              onAdd={store.addItem} 
            />
          </div>

          {/* List Area */}
          <div className="space-y-4">
            <ItemList 
              items={store.items} 
              participants={store.participants} 
              onDelete={store.deleteItem}
              onClearAll={store.clearAllItems}
            />
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Adjustments 
            adjustments={store.adjustments} 
            updateAdjustments={store.updateAdjustments} 
          />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <SettlementSummary summary={store.summary} />
        </motion.section>

      </main>
    </div>
  );
}
