import { useEffect, useState, useCallback } from "react";
// @ts-ignore
import { supabase } from "@/lib/supabase";
import { computePersonSummaries } from "@/hooks/use-grocery-store";

export interface Balance {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  owedAmount: number; // from orders
  paidAmount: number; // from payments table
  netAmount: number; // owedAmount - paidAmount (positive = still owes)
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
      const members = group?.group_members ?? [];

      // 2. Fetch all orders with items and adjustments
      const { data: orders } = await supabase
        .from("orders")
        .select(
          "id, items ( id, base_price, quantity, requested_by, split_type, split_with_indices ), adjustments ( tax, delivery, tip, promo_savings )",
        )
        .eq("group_id", groupId);

      // 3. Build a net owed matrix [fromIndex][toIndex] = amount
      const n = members.length;
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
          requestedByIndex: members.findIndex(
            (m: any) => m.name === i.requested_by,
          ),
          splitType: i.split_type,
          splitWithIndices: i.split_with_indices ?? [],
        }));
        const { personSummaries } = computePersonSummaries(members, items, {
          tax: adj.tax,
          delivery: adj.delivery,
          tip: adj.tip,
          promo: adj.promo_savings,
        });
        // Each person owes their share to the person who paid (index 0 = creator, simplification: treat member[0] as payer)
        // Actually: each person's finalPayable is what they owe into the pool
        // We track it as: person owes the group creator (members[0]) their share
        const payerIndex = 0;
        for (const p of personSummaries) {
          if (p.index !== payerIndex && p.finalPayable > 0) {
            matrix[p.index][payerIndex] += p.finalPayable;
          }
        }
      }

      // 4. Fetch payments
      const { data: payments } = await supabase
        .from("payments")
        .select("paid_by, paid_to, amount")
        .eq("group_id", groupId);

      for (const p of payments ?? []) {
        const fromIdx = members.findIndex((m: any) => m.user_id === p.paid_by);
        const toIdx = members.findIndex((m: any) => m.user_id === p.paid_to);
        if (fromIdx >= 0 && toIdx >= 0) {
          matrix[fromIdx][toIdx] = Math.max(
            0,
            matrix[fromIdx][toIdx] - p.amount,
          );
        }
      }

      // 5. Convert matrix to Balance list (only non-zero)
      const result: Balance[] = [];
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (matrix[i][j] > 0.005) {
            result.push({
              fromUserId: members[i]?.user_id ?? "",
              fromName: members[i]?.name ?? "",
              toUserId: members[j]?.user_id ?? "",
              toName: members[j]?.name ?? "",
              owedAmount: matrix[i][j],
              paidAmount: 0,
              netAmount: matrix[i][j],
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
