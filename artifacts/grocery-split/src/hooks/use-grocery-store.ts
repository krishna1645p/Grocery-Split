// @ts-ignore
import { supabase } from "@/lib/supabase";
import { useState, useMemo, useCallback } from "react";

export type SplitType = "self" | "all" | "selected";

export interface Participant {
  name: string;
  email: string;
}

export interface PayerEntry {
  name: string;
  amount: string;
}

export interface GroceryItem {
  id: string;
  name: string;
  link?: string;
  basePrice: number;
  quantity: number;
  requestedByIndex: number;
  splitType: SplitType;
  splitWithIndices: number[];
}

export interface Adjustments {
  tax: number;
  delivery: number;
  tip: number;
  promo: number;
}

export interface PersonSummary {
  index: number;
  name: string;
  itemsTotal: number;
  adjustmentsTotal: number;
  finalPayable: number;
}

export function computePersonSummaries(
  participants: { name: string }[],
  items: Pick<
    GroceryItem,
    | "basePrice"
    | "quantity"
    | "requestedByIndex"
    | "splitType"
    | "splitWithIndices"
  >[],
  adjustments: Adjustments,
): {
  personSummaries: PersonSummary[];
  totalItemsSubtotal: number;
  totalAdjustments: number;
  grandTotal: number;
} {
  const n = participants.length;
  if (n === 0)
    return {
      personSummaries: [],
      totalItemsSubtotal: 0,
      totalAdjustments: 0,
      grandTotal: 0,
    };

  const personItemTotals = new Array(n).fill(0);
  let totalItemsSubtotal = 0;

  items.forEach((item) => {
    const itemTotal = item.basePrice * item.quantity;
    totalItemsSubtotal += itemTotal;

    if (item.splitType === "self") {
      if (item.requestedByIndex < n) {
        personItemTotals[item.requestedByIndex] += itemTotal;
      }
    } else if (item.splitType === "all") {
      const share = itemTotal / n;
      for (let i = 0; i < n; i++) personItemTotals[i] += share;
    } else if (item.splitType === "selected") {
      const validIndices = item.splitWithIndices.filter((idx) => idx < n);
      const share = itemTotal / Math.max(1, validIndices.length);
      validIndices.forEach((idx) => {
        personItemTotals[idx] += share;
      });
    }
  });

  const totalAdjustments =
    adjustments.tax +
    adjustments.delivery +
    adjustments.tip -
    adjustments.promo;

  const personSummaries: PersonSummary[] = participants.map((p, index) => {
    const itemsTotal = personItemTotals[index];
    const proportion =
      totalItemsSubtotal > 0 ? itemsTotal / totalItemsSubtotal : 1 / n;
    const adjustmentsShare = totalAdjustments * proportion;
    return {
      index,
      name: p.name,
      itemsTotal,
      adjustmentsTotal: adjustmentsShare,
      finalPayable: itemsTotal + adjustmentsShare,
    };
  });

  return {
    personSummaries,
    totalItemsSubtotal,
    totalAdjustments,
    grandTotal: totalItemsSubtotal + totalAdjustments,
  };
}

export function useGroceryStore(userId: string, participants: Participant[]) {
  const [orderName, setOrderName] = useState("");
  const [storeName, setStoreName] = useState("Walmart");
  const [payers, setPayers] = useState<PayerEntry[]>(
    participants.length > 0 ? [{ name: participants[0].name, amount: "" }] : [],
  );
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustments>({
    tax: 0,
    delivery: 0,
    tip: 0,
    promo: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmittedOrderId, setLastSubmittedOrderId] = useState<
    string | null
  >(null);

  const addItem = useCallback((item: Omit<GroceryItem, "id">) => {
    setItems((prev) => [...prev, { ...item, id: crypto.randomUUID() }]);
  }, []);

  const deleteItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearAllItems = useCallback(() => {
    setItems([]);
  }, []);

  const updateAdjustments = useCallback((updates: Partial<Adjustments>) => {
    setAdjustments((prev) => ({ ...prev, ...updates }));
  }, []);

  const reset = useCallback(() => {
    setOrderName("");
    setStoreName("Walmart");
    setPayers(
      participants.length > 0
        ? [{ name: participants[0].name, amount: "" }]
        : [],
    );
    setItems([]);
    setAdjustments({ tax: 0, delivery: 0, tip: 0, promo: 0 });
    setLastSubmittedOrderId(null);
  }, [participants]);

  const submitOrder = useCallback(
    async (groupId: string): Promise<string> => {
      if (!userId) throw new Error("Must be signed in to submit an order");
      if (!orderName.trim()) throw new Error("Order name is required");
      const validPayers = payers.filter(
        (p) => p.name && parseFloat(p.amount) > 0,
      );
      if (validPayers.length === 0)
        throw new Error("Please enter who paid and how much");

      setIsSubmitting(true);
      try {
        // Insert the order (paid_by_name = first payer for backwards compat)
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .insert({
            group_id: groupId,
            store: storeName,
            order_name: orderName.trim(),
            created_by: userId,
            paid_by_name: validPayers[0].name,
          })
          .select()
          .single();
        if (orderError) throw orderError;

        // Insert order_payments rows for each payer
        const payerRows = validPayers.map((p) => ({
          order_id: order.id,
          payer_name: p.name,
          amount: parseFloat(p.amount),
        }));
        const { error: payersError } = await supabase
          .from("order_payments")
          .insert(payerRows);
        if (payersError) throw payersError;

        if (items.length > 0) {
          const itemsPayload = items.map((item) => ({
            order_id: order.id,
            name: item.name,
            link: item.link || null,
            base_price: item.basePrice,
            quantity: item.quantity,
            total_price: item.basePrice * item.quantity,
            requested_by: participants[item.requestedByIndex]?.name ?? "",
            split_type: item.splitType,
            split_with_indices: item.splitWithIndices,
          }));
          const { error: itemsError } = await supabase
            .from("items")
            .insert(itemsPayload);
          if (itemsError) throw itemsError;
        }

        const { error: adjError } = await supabase.from("adjustments").insert({
          order_id: order.id,
          tax: adjustments.tax,
          delivery: adjustments.delivery,
          tip: adjustments.tip,
          promo_savings: adjustments.promo,
        });
        if (adjError) throw adjError;

        setLastSubmittedOrderId(order.id);
        return order.id;
      } finally {
        setIsSubmitting(false);
      }
    },
    [userId, orderName, storeName, payers, participants, items, adjustments],
  );

  const summary = useMemo(
    () => computePersonSummaries(participants, items, adjustments),
    [items, adjustments, participants],
  );

  return {
    orderName,
    setOrderName,
    storeName,
    setStoreName,
    payers,
    setPayers,
    items,
    addItem,
    deleteItem,
    clearAllItems,
    adjustments,
    updateAdjustments,
    summary,
    submitOrder,
    isSubmitting,
    lastSubmittedOrderId,
    reset,
  };
}
