import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { type PersonSummary } from "@/hooks/use-grocery-store";
import { Calculator, CheckCircle2, Loader2, Send } from "lucide-react";
import { motion } from "framer-motion";

interface SettlementSummaryProps {
  summary: {
    personSummaries: PersonSummary[];
    totalItemsSubtotal: number;
    totalAdjustments: number;
    grandTotal: number;
  };
  onSubmit?: () => Promise<void>;
  isSubmitting?: boolean;
  lastSubmittedOrderId?: string | null;
}

export function SettlementSummary({
  summary,
  onSubmit,
  isSubmitting = false,
  lastSubmittedOrderId = null,
}: SettlementSummaryProps) {
  const { personSummaries, totalItemsSubtotal, totalAdjustments, grandTotal } = summary;

  return (
    <Card className="p-6 md:p-8 bg-gradient-to-br from-primary/10 via-background to-background border-primary/20 shadow-lg relative overflow-hidden">
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold flex items-center gap-2 text-foreground">
              <div className="bg-primary text-primary-foreground p-2 rounded-xl shadow-md">
                <Calculator className="w-5 h-5" />
              </div>
              Final Settlement
            </h3>
            <p className="text-muted-foreground mt-1 text-sm">Who owes what based on the split rules</p>
          </div>

          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Grand Total</p>
            <p className="text-3xl font-display font-bold text-primary">{formatCurrency(grandTotal)}</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden mb-6">
          <table className="w-full text-left">
            <thead className="bg-secondary/50 border-b">
              <tr>
                <th className="px-6 py-4 font-semibold text-muted-foreground">Person</th>
                <th className="px-6 py-4 font-semibold text-right text-muted-foreground hidden sm:table-cell">Items Total</th>
                <th className="px-6 py-4 font-semibold text-right text-muted-foreground hidden sm:table-cell">Adjustments</th>
                <th className="px-6 py-4 font-bold text-right text-foreground">Final Payable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {personSummaries.map((person) => (
                <tr key={person.index} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-6 py-4 font-medium flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                      {person.name.charAt(0).toUpperCase()}
                    </div>
                    {person.name}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-muted-foreground hidden sm:table-cell">
                    {formatCurrency(person.itemsTotal)}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-muted-foreground hidden sm:table-cell">
                    <span className={person.adjustmentsTotal > 0 ? "text-orange-500" : person.adjustmentsTotal < 0 ? "text-primary" : ""}>
                      {person.adjustmentsTotal > 0 ? '+' : ''}{formatCurrency(person.adjustmentsTotal)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <motion.div
                      key={person.finalPayable}
                      initial={{ scale: 0.95, color: "hsl(var(--primary))" }}
                      animate={{ scale: 1, color: "inherit" }}
                      className="font-mono text-lg font-bold"
                    >
                      {formatCurrency(person.finalPayable)}
                    </motion.div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-secondary/20 border-t-2 border-border font-bold">
              <tr>
                <td className="px-6 py-4 text-foreground">Totals</td>
                <td className="px-6 py-4 text-right font-mono hidden sm:table-cell">{formatCurrency(totalItemsSubtotal)}</td>
                <td className="px-6 py-4 text-right font-mono hidden sm:table-cell">{formatCurrency(totalAdjustments)}</td>
                <td className="px-6 py-4 text-right font-mono text-xl text-primary">{formatCurrency(grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="sm:hidden text-center p-4 bg-primary/5 rounded-xl border border-primary/20 mb-6">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Grand Total</p>
          <p className="text-4xl font-display font-bold text-primary">{formatCurrency(grandTotal)}</p>
        </div>

        {onSubmit && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-primary/10">
            {lastSubmittedOrderId ? (
              <div className="flex items-center gap-2 text-primary font-medium">
                <CheckCircle2 className="w-5 h-5" />
                Order saved successfully!
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Save this order to your history so you can reference it later.
              </p>
            )}
            <Button
              size="lg"
              onClick={onSubmit}
              disabled={isSubmitting || personSummaries.length === 0}
              className="font-semibold px-8 gap-2 shadow-md"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : lastSubmittedOrderId ? (
                <>
                  <Send className="w-4 h-4" /> Save Again
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Submit Order
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
