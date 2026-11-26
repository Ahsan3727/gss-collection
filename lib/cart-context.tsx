'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { CartItem } from '@/lib/types';

export type { CartItem };

export const MAX_CART_QTY = 10;
const STORAGE_KEY = 'gss_cart_v2';

export interface ValidatedLineInput {
  productId: string;
  handle: string;
  title: string;
  stone: string;
  size: string;
  price: number;
  qty: number;
  maxStock?: number;
  photo?: string;
  sku?: string;
}

interface CartContextType {
  items: CartItem[];
  totalCount: number;
  subtotal: number;
  isDrawerOpen: boolean;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, stone: string, size: string) => void;
  updateQty: (productId: string, stone: string, size: string, qty: number) => void;
  syncValidatedItems: (validated: ValidatedLineInput[]) => { changed: boolean; messages: string[] };
  clearCart: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function clampQty(qty: number, maxStock?: number): number {
  const ceiling = maxStock !== undefined && maxStock > 0 ? Math.min(MAX_CART_QTY, maxStock) : MAX_CART_QTY;
  return Math.max(1, Math.min(ceiling, Math.floor(qty)));
}

export function sameCartLine(
  a: Pick<CartItem, 'productId' | 'stone' | 'size'>,
  b: Pick<CartItem, 'productId' | 'stone' | 'size'>
): boolean {
  return a.productId === b.productId && a.stone === b.stone && a.size === b.size;
}

/**
 * Pure immutable reducer helper so both StrictMode double-invocations and direct unit tests
 * produce deterministic cart state without in-place item mutation.
 */
export function addItemReducer(prev: CartItem[], newItem: CartItem): CartItem[] {
  const existingIdx = prev.findIndex((i) => sameCartLine(i, newItem));
  const ceiling = newItem.maxStock;
  if (existingIdx === -1) {
    return [
      ...prev,
      {
        ...newItem,
        qty: clampQty(newItem.qty, ceiling),
      },
    ];
  }
  return prev.map((item, idx) => {
    if (idx !== existingIdx) return item;
    const effectiveMax = ceiling ?? item.maxStock;
    return {
      ...item,
      price: newItem.price,
      maxStock: effectiveMax,
      photo: newItem.photo ?? item.photo,
      qty: clampQty(item.qty + newItem.qty, effectiveMax),
    };
  });
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      }
    } catch {
      console.warn('Failed to load cart from storage');
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch {
        console.warn('Failed to persist cart');
      }
    }
  }, [items, isLoaded]);

  // Lock page scroll while the drawer is open so background content never scrolls on mobile.
  useEffect(() => {
    if (!isDrawerOpen) return;
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevOverflow;
    };
  }, [isDrawerOpen]);

  const addItem = useCallback((newItem: CartItem) => {
    setItems((prev) => addItemReducer(prev, newItem));
    setIsDrawerOpen(true);
  }, []);

  const removeItem = useCallback((productId: string, stone: string, size: string) => {
    setItems((prev) => prev.filter((i) => !sameCartLine(i, { productId, stone, size })));
  }, []);

  const updateQty = useCallback(
    (productId: string, stone: string, size: string, qty: number) => {
      if (qty <= 0) {
        removeItem(productId, stone, size);
        return;
      }
      setItems((prev) =>
        prev.map((i) => {
          if (!sameCartLine(i, { productId, stone, size })) return i;
          return { ...i, qty: clampQty(qty, i.maxStock) };
        })
      );
    },
    [removeItem]
  );

  const syncValidatedItems = useCallback((validated: ValidatedLineInput[]) => {
    const messages: string[] = [];
    let changed = false;

    setItems((prev) => {
      const next: CartItem[] = [];
      for (const old of prev) {
        const match = validated.find(
          (v) =>
            (v.productId === old.productId || v.handle === old.handle) &&
            v.stone === old.stone &&
            v.size === old.size
        );
        if (!match) {
          changed = true;
          messages.push(`"${old.title}" is no longer available and was removed.`);
          continue;
        }
        if (match.price !== old.price) {
          changed = true;
          messages.push(`Price updated for "${match.title}"`);
        }
        if (match.qty !== old.qty) {
          changed = true;
          messages.push(`Quantity adjusted for "${match.title}" due to available stock`);
        }
        next.push({
          ...old,
          productId: match.productId,
          handle: match.handle,
          title: match.title,
          price: match.price,
          qty: match.qty,
          maxStock: match.maxStock,
          photo: match.photo || old.photo,
          sku: match.sku || old.sku,
        });
      }
      return changed ? next : prev;
    });

    return { changed, messages };
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  const totalCount = useMemo(() => items.reduce((sum, i) => sum + i.qty, 0), [items]);
  const subtotal = useMemo(() => items.reduce((sum, i) => sum + i.price * i.qty, 0), [items]);

  const value = useMemo(
    () => ({
      items,
      totalCount,
      subtotal,
      isDrawerOpen,
      addItem,
      removeItem,
      updateQty,
      syncValidatedItems,
      clearCart,
      openDrawer,
      closeDrawer,
    }),
    [
      items,
      totalCount,
      subtotal,
      isDrawerOpen,
      addItem,
      removeItem,
      updateQty,
      syncValidatedItems,
      clearCart,
      openDrawer,
      closeDrawer,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
