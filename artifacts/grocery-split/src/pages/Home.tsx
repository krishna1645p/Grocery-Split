import { useGroceryStore, type Participant } from "@/hooks/use-grocery-store";
import { OrderHeader } from "@/components/grocery/OrderHeader";
import { AddItemForm } from "@/components/grocery/AddItemForm";
import { ItemList } from "@/components/grocery/ItemList";
import { Adjustments } from "@/components/grocery/Adjustments";
import { SettlementSummary } from "@/components/grocery/SettlementSummary";
import { ArrowLeft, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useMemo } from "react";

interface GroupMember {
  id: string;
  name: string;
  email: string | null;
  user_id: string | null;
}

interface HomeProps {
  userId: string;
  groupId: string;
  groupName: string;
  members: GroupMember[];
  onBack: () => void;
  onOrderSubmitted: (orderId: string) => void;
}

export default function Home({ userId, groupId, groupName, members, onBack, onOrderSubmitted }: HomeProps) {
  const { toast } = useToast();

  const participants = useMemo<Participant[]>(
    () => members.map((m) => ({ name: m.name, email: m.email ?? '' })),
    [members],
  );

  const store = useGroceryStore(userId, participants);

  const participantNames = useMemo(
    () => participants.map((p) => p.name),
    [participants],
  );

  const handleSubmit = async () => {
    try {
      const orderId = await store.submitOrder(groupId);
      toast({
        title: "Order saved!",
        description: "Your order has been added to the group.",
      });
      onOrderSubmitted(orderId);
    } catch (err: unknown) {
      toast({
        title: "Failed to save order",
        description: err instanceof Error ? err.message : "Something went wrong.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen pb-24 selection:bg-primary/20 selection:text-primary bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{groupName}</span>
          </button>
          <span className="text-muted-foreground/50">/</span>
          <h1 className="font-bold text-lg truncate flex-1">New Order</h1>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">{members.length} member{members.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-10 space-y-10">

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <OrderHeader
            orderName={store.orderName}
            setOrderName={store.setOrderName}
            storeName={store.storeName}
            setStoreName={store.setStoreName}
          />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="grid grid-cols-1 gap-10"
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
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Adjustments
            adjustments={store.adjustments}
            updateAdjustments={store.updateAdjustments}
          />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <SettlementSummary
            summary={store.summary}
            onSubmit={handleSubmit}
            isSubmitting={store.isSubmitting}
            lastSubmittedOrderId={store.lastSubmittedOrderId}
          />
        </motion.section>

      </main>
    </div>
  );
}
