import { useState, useMemo, useCallback } from 'react';

export type SplitType = 'self' | 'all' | 'selected';

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

export const DEFAULT_PARTICIPANTS = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve'];

export function useGroceryStore() {
  const [orderName, setOrderName] = useState('Roommate Grocery Run');
  const [storeName, setStoreName] = useState('Walmart');
  const [participants, setParticipants] = useState<string[]>(DEFAULT_PARTICIPANTS);
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustments>({
    tax: 0,
    delivery: 0,
    tip: 0,
    promo: 0,
  });

  const addItem = useCallback((item: Omit<GroceryItem, 'id'>) => {
    setItems((prev) => [...prev, { ...item, id: crypto.randomUUID() }]);
  }, []);

  const deleteItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearAllItems = useCallback(() => {
    setItems([]);
  }, []);

  const updateParticipant = useCallback((index: number, newName: string) => {
    setParticipants((prev) => {
      const updated = [...prev];
      updated[index] = newName || `Roommate ${index + 1}`;
      return updated;
    });
  }, []);

  const updateAdjustments = useCallback((updates: Partial<Adjustments>) => {
    setAdjustments((prev) => ({ ...prev, ...updates }));
  }, []);

  // Complex calculations memoized for performance
  const summary = useMemo(() => {
    // 1. Calculate each person's items total
    const personItemTotals = new Array(5).fill(0);
    let totalItemsSubtotal = 0;

    items.forEach((item) => {
      const itemTotal = item.basePrice * item.quantity;
      totalItemsSubtotal += itemTotal;

      if (item.splitType === 'self') {
        personItemTotals[item.requestedByIndex] += itemTotal;
      } else if (item.splitType === 'all') {
        const share = itemTotal / 5;
        for (let i = 0; i < 5; i++) personItemTotals[i] += share;
      } else if (item.splitType === 'selected') {
        const share = itemTotal / Math.max(1, item.splitWithIndices.length);
        item.splitWithIndices.forEach((idx) => {
          personItemTotals[idx] += share;
        });
      }
    });

    // 2. Calculate adjustments pool
    const totalAdjustments = adjustments.tax + adjustments.delivery + adjustments.tip - adjustments.promo;

    // 3. Apply proportionally
    const personSummaries: PersonSummary[] = participants.map((name, index) => {
      const itemsTotal = personItemTotals[index];
      
      let proportion = 0;
      if (totalItemsSubtotal > 0) {
        proportion = itemsTotal / totalItemsSubtotal;
      } else {
        // If no items, split adjustments equally (or someone is paying purely delivery fees)
        proportion = 1 / 5;
      }

      const adjustmentsShare = totalAdjustments * proportion;
      
      return {
        index,
        name,
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
  }, [items, adjustments, participants]);

  return {
    orderName,
    setOrderName,
    storeName,
    setStoreName,
    participants,
    updateParticipant,
    items,
    addItem,
    deleteItem,
    clearAllItems,
    adjustments,
    updateAdjustments,
    summary,
  };
}
