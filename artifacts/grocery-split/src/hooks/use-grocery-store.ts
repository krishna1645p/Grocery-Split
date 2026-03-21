// @ts-ignore
import { supabase } from '../../../../lib/supabase';
import { useState, useMemo, useCallback } from 'react';

export type SplitType = 'self' | 'all' | 'selected';

export interface Participant {
  name: string;
  email: string;
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

export const DEFAULT_PARTICIPANTS: Participant[] = [
  { name: 'Alice', email: '' },
  { name: 'Bob', email: '' },
  { name: 'Carol', email: '' },
  { name: 'Dave', email: '' },
  { name: 'Eve', email: '' },
];

export function computePersonSummaries(
  participants: { name: string }[],
  items: Pick<GroceryItem, 'basePrice' | 'quantity' | 'requestedByIndex' | 'splitType' | 'splitWithIndices'>[],
  adjustments: Adjustments,
): {
  personSummaries: PersonSummary[];
  totalItemsSubtotal: number;
  totalAdjustments: number;
  grandTotal: number;
} {
  const n = participants.length;
  const personItemTotals = new Array(n).fill(0);
  let totalItemsSubtotal = 0;

  items.forEach((item) => {
    const itemTotal = item.basePrice * item.quantity;
    totalItemsSubtotal += itemTotal;

    if (item.splitType === 'self') {
      if (item.requestedByIndex < n) {
        personItemTotals[item.requestedByIndex] += itemTotal;
      }
    } else if (item.splitType === 'all') {
      const share = itemTotal / n;
      for (let i = 0; i < n; i++) personItemTotals[i] += share;
    } else if (item.splitType === 'selected') {
      const validIndices = item.splitWithIndices.filter((idx) => idx < n);
      const share = itemTotal / Math.max(1, validIndices.length);
      validIndices.forEach((idx) => { personItemTotals[idx] += share; });
    }
  });

  const totalAdjustments =
    adjustments.tax + adjustments.delivery + adjustments.tip - adjustments.promo;

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

export function useGroceryStore(userId?: string) {
  const [orderName, setOrderName] = useState('Roommate Grocery Run');
  const [storeName, setStoreName] = useState('Walmart');
  const [participants, setParticipants] = useState<Participant[]>(DEFAULT_PARTICIPANTS);
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustments>({
    tax: 0,
    delivery: 0,
    tip: 0,
    promo: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmittedOrderId, setLastSubmittedOrderId] = useState<string | null>(null);

  const addItem = useCallback((item: Omit<GroceryItem, 'id'>) => {
    setItems((prev) => [...prev, { ...item, id: crypto.randomUUID() }]);
  }, []);

  const deleteItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearAllItems = useCallback(() => {
    setItems([]);
  }, []);

  const updateParticipant = useCallback(
    (index: number, updates: Partial<Participant>) => {
      setParticipants((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], ...updates };
        if (updates.name !== undefined && !updates.name.trim()) {
          updated[index].name = `Roommate ${index + 1}`;
        }
        return updated;
      });
    },
    [],
  );

  const addParticipant = useCallback(() => {
    setParticipants((prev) => [
      ...prev,
      { name: `Roommate ${prev.length + 1}`, email: '' },
    ]);
  }, []);

  const removeParticipant = useCallback((index: number) => {
    setParticipants((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
    setItems((prev) =>
      prev
        .filter((item) => item.requestedByIndex !== index)
        .map((item) => ({
          ...item,
          requestedByIndex:
            item.requestedByIndex > index
              ? item.requestedByIndex - 1
              : item.requestedByIndex,
          splitWithIndices: item.splitWithIndices
            .filter((i) => i !== index)
            .map((i) => (i > index ? i - 1 : i)),
        })),
    );
  }, []);

  const updateAdjustments = useCallback((updates: Partial<Adjustments>) => {
    setAdjustments((prev) => ({ ...prev, ...updates }));
  }, []);

  const submitOrder = useCallback(async (): Promise<string> => {
    if (!userId) throw new Error('Must be signed in to submit an order');
    setIsSubmitting(true);
    try {
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({ name: orderName, created_by: userId })
        .select()
        .single();
      if (groupError) throw groupError;

      const membersPayload = participants.map((p) => ({
        group_id: group.id,
        name: p.name,
        email: p.email || null,
      }));
      const { error: membersError } = await supabase
        .from('group_members')
        .insert(membersPayload);
      if (membersError) throw membersError;

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          group_id: group.id,
          store: storeName,
          order_name: orderName,
          created_by: userId,
        })
        .select()
        .single();
      if (orderError) throw orderError;

      if (items.length > 0) {
        const itemsPayload = items.map((item) => ({
          order_id: order.id,
          name: item.name,
          link: item.link || null,
          base_price: item.basePrice,
          quantity: item.quantity,
          requested_by_index: item.requestedByIndex,
          split_type: item.splitType,
          split_with_indices: item.splitWithIndices,
        }));
        const { error: itemsError } = await supabase
          .from('items')
          .insert(itemsPayload);
        if (itemsError) throw itemsError;
      }

      const { error: adjError } = await supabase.from('adjustments').insert({
        order_id: order.id,
        tax: adjustments.tax,
        delivery: adjustments.delivery,
        tip: adjustments.tip,
        promo: adjustments.promo,
      });
      if (adjError) throw adjError;

      setLastSubmittedOrderId(order.id);
      return order.id;
    } finally {
      setIsSubmitting(false);
    }
  }, [userId, orderName, storeName, participants, items, adjustments]);

  const summary = useMemo(
    () => computePersonSummaries(participants, items, adjustments),
    [items, adjustments, participants],
  );

  return {
    orderName,
    setOrderName,
    storeName,
    setStoreName,
    participants,
    updateParticipant,
    addParticipant,
    removeParticipant,
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
  };
}
