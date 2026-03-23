import { useEffect, useState, useCallback } from "react";
// @ts-ignore
import { supabase } from "@/lib/supabase";
import { computePersonSummaries } from "@/hooks/use-grocery-store";

export interface Balance {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  netAmount: number;
}

export function useGroupBalances(
  groupId: string,
  refreshTrigger?: string | null,
) {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);

  const calculate = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch group members
      const { data: group } = await supabase
        .from("groups")
        .select("group_members ( id, name, email, user_id )")
        .eq("id", groupId)
        .single();
      const members: {
        id: string;
        name: string;
        email: string | null;
        user_id: string | null;
      }[] = group?.group_members ?? [];
      const n = members.length;
      if (n === 0) {
        setBalances([]);
        setLoading(false);
        return;
      }

      // 2. Fetch all orders with items, adjustments, and order_payments
      const { data: orders } = await supabase
        .from("orders")
        .select(
          `
          id,
          paid_by_name,
          items ( id, base_price, quantity, requested_by, split_type, split_with_indices ),
          adjustments ( tax, delivery, tip, promo_savings ),
          order_payments ( payer_name, amount )
        `,
        )
        .eq("group_id", groupId);

      // matrix[i][j] = member i owes member j
      const matrix: number[][] = Array.from({ length: n }, () =>
        Array(n).fill(0),
      );

      for (const order of orders ?? []) {
        const adj = order.adjustments?.[0] ?? {
          tax: 0,
          delivery: 0,
          tip: 0,
          promo_savings: 0,
        };
        const items = (order.items ?? []).map((i: any) => ({
          basePrice: i.base_price,
          quantity: i.quantity,
          requestedByIndex: members.findIndex((m) => m.name === i.requested_by),
          splitType: i.split_type,
          splitWithIndices: i.split_with_indices ?? [],
        }));

        const { personSummaries, grandTotal } = computePersonSummaries(
          members,
          items,
          {
            tax: adj.tax,
            delivery: adj.delivery,
            tip: adj.tip,
            promo: adj.promo_savings,
          },
        );

        // Determine payers: use order_payments if available, fallback to paid_by_name
        const orderPayers: { name: string; amount: number }[] =
          order.order_payments && order.order_payments.length > 0
            ? order.order_payments.map((p: any) => ({
                name: p.payer_name,
                amount: p.amount,
              }))
            : order.paid_by_name
              ? [{ name: order.paid_by_name, amount: grandTotal }]
              : [];

        const totalPaid = orderPayers.reduce(
          (s: number, p: { name: string; amount: number }) => s + p.amount,
          0,
        );
        if (totalPaid === 0) continue;

        // Each person owes each payer proportionally to how much that payer covered
        for (const payer of orderPayers) {
          const payerIndex = members.findIndex((m) => m.name === payer.name);
          if (payerIndex < 0) continue;
          const payerShare = payer.amount / totalPaid; // fraction this payer covered

          for (const p of personSummaries) {
            if (p.index === payerIndex) continue;
            const owedToPayer = p.finalPayable * payerShare;
            if (owedToPayer > 0.005) {
              matrix[p.index][payerIndex] += owedToPayer;
            }
          }
        }
      }

      // 3. Net out reverse debts (A owes B $10, B owes A $4 → A owes B $6)
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const ij = matrix[i][j];
          const ji = matrix[j][i];
          if (ij > ji) {
            matrix[i][j] = ij - ji;
            matrix[j][i] = 0;
          } else {
            matrix[j][i] = ji - ij;
            matrix[i][j] = 0;
          }
        }
      }

      // 4. Subtract recorded settle-up payments
      const { data: payments } = await supabase
        .from("payments")
        .select("paid_by, paid_to, amount")
        .eq("group_id", groupId);

      for (const p of payments ?? []) {
        const fromIdx = members.findIndex((m) => m.user_id === p.paid_by);
        const toIdx = members.findIndex((m) => m.user_id === p.paid_to);
        if (fromIdx >= 0 && toIdx >= 0) {
          matrix[fromIdx][toIdx] = Math.max(
            0,
            matrix[fromIdx][toIdx] - p.amount,
          );
        }
      }

      // 5. Build result list
      const result: Balance[] = [];
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (matrix[i][j] > 0.005) {
            result.push({
              fromUserId: members[i]?.user_id ?? "",
              fromName: members[i]?.name ?? "",
              toUserId: members[j]?.user_id ?? "",
              toName: members[j]?.name ?? "",
              netAmount: Math.round(matrix[i][j] * 100) / 100,
            });
          }
        }
      }
      setBalances(result);
    } finally {
      setLoading(false);
    }
  }, [groupId, refreshTrigger]);

  useEffect(() => {
    calculate();
  }, [calculate]);

  return { balances, loading, refresh: calculate };
}
