import { useGroceryStore } from "@/hooks/use-grocery-store";
import { OrderHeader } from "@/components/grocery/OrderHeader";
import { AddItemForm } from "@/components/grocery/AddItemForm";
import { ItemList } from "@/components/grocery/ItemList";
import { Adjustments } from "@/components/grocery/Adjustments";
import { SettlementSummary } from "@/components/grocery/SettlementSummary";
import { OrderHistory } from "@/components/grocery/OrderHistory";
import { Leaf } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useMemo } from "react";

interface HomeProps {
  userId: string;
  userEmail?: string;
  onSignOut: () => void;
}

export default function Home({ userId, userEmail, onSignOut }: HomeProps) {
  const { toast } = useToast();
  const store = useGroceryStore(userId);

  const participantNames = useMemo(
    () => store.participants.map((p) => p.name),
    [store.participants],
  );

  const handleSubmit = async () => {
    try {
      await store.submitOrder();
      toast({
        title: "Order saved!",
        description: "Your order has been saved to your history.",
      });
    } catch (err: unknown) {
      toast({
        title: "Failed to save order",
        description: err instanceof Error ? err.message : "Something went wrong.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen pb-24 selection:bg-primary/20 selection:text-primary">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-lg shadow-sm">
              <Leaf className="w-5 h-5" />
            </div>
            <h1 className="font-display font-bold text-xl tracking-tight">GrocerySplit</h1>
          </div>
          <div className="flex items-center gap-3">
            {userEmail && (
              <span className="text-sm text-muted-foreground hidden sm:block truncate max-w-[200px]">
                {userEmail}
              </span>
            )}
            <button
              onClick={onSignOut}
              className="text-sm font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

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
            addParticipant={store.addParticipant}
            removeParticipant={store.removeParticipant}
          />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-1 gap-12"
        >
          <div className="space-y-4">
            <AddItemForm
              participantNames={participantNames}
              onAdd={store.addItem}
            />
          </div>

          <div className="space-y-4">
            <ItemList
              items={store.items}
              participantNames={participantNames}
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
          <SettlementSummary
            summary={store.summary}
            onSubmit={handleSubmit}
            isSubmitting={store.isSubmitting}
            lastSubmittedOrderId={store.lastSubmittedOrderId}
          />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <OrderHistory
            userId={userId}
            refreshTrigger={store.lastSubmittedOrderId}
          />
        </motion.section>

      </main>
    </div>
  );
}
