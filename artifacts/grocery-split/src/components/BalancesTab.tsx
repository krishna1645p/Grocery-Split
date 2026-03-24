import { useState } from "react";
// @ts-ignore
import { supabase } from "@/lib/supabase";
import { useGroupBalances } from "@/hooks/useGroupBalances";
import { SettleUpModal } from "@/components/SettleUpModal";
import { formatCurrency } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, CheckCircle2, HandCoins } from "lucide-react";

interface BalancesTabProps {
  groupId: string;
  currentUserId: string;
  currentUserName: string;
}

export function BalancesTab({
  groupId,
  currentUserId,
  currentUserName,
}: BalancesTabProps) {
  const [refreshKey, setRefreshKey] = useState<string | null>(null);
  const { balances, loading } = useGroupBalances(groupId, refreshKey);
  const [settling, setSettling] = useState<(typeof balances)[0] | null>(null);

  const handleSettle = async (amount: number, note: string) => {
    if (!settling) return;
    await supabase.from("payments").insert({
      group_id: groupId,
      paid_by: currentUserId,
      paid_to: settling.toUserId,
      amount,
      note: note || null,
    });
    setRefreshKey(Date.now().toString());
  };

  if (loading)
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-3">
        <Loader2 className="w-5 h-5 animate-spin" />
        Calculating balances...
      </div>
    );

  if (balances.length === 0)
    return (
      <Card className="p-12 border-dashed border-2 flex flex-col items-center justify-center text-center bg-secondary/30">
        <CheckCircle2 className="w-10 h-10 text-primary mb-3" />
        <h3 className="text-lg font-bold mb-1">All settled up!</h3>
        <p className="text-muted-foreground text-sm">
          No outstanding balances in this group.
        </p>
      </Card>
    );

  return (
    <div className="space-y-3">
      {balances.map((b, i) => {
        // Match by name — more reliable than userId for manually-added members
        const iOwe = b.fromName === currentUserName;
        const iAmOwed = b.toName === currentUserName;

        return (
          <Card
            key={i}
            className={`p-4 flex items-center gap-4 ${iOwe ? "border-red-200 bg-red-50/30" : iAmOwed ? "border-green-200 bg-green-50/30" : ""}`}
          >
            <div className="flex-1 flex items-center gap-2 flex-wrap">
              <span
                className={`font-semibold ${iOwe ? "text-red-600" : "text-foreground"}`}
              >
                {b.fromName}
              </span>
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
              <span
                className={`font-semibold ${iAmOwed ? "text-green-600" : "text-foreground"}`}
              >
                {b.toName}
              </span>
            </div>

            <span
              className={`font-mono font-bold text-lg ${iOwe ? "text-red-600" : iAmOwed ? "text-green-600" : "text-orange-500"}`}
            >
              {formatCurrency(b.netAmount)}
            </span>

            {/* Only show settle up if the current user is the one who owes */}
            {iOwe && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 shrink-0 border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => setSettling(b)}
              >
                <HandCoins className="w-3.5 h-3.5" />
                Settle up
              </Button>
            )}
          </Card>
        );
      })}

      {settling && (
        <SettleUpModal
          fromName={settling.fromName}
          toName={settling.toName}
          suggestedAmount={settling.netAmount}
          onConfirm={handleSettle}
          onClose={() => setSettling(null)}
        />
      )}
    </div>
  );
}
