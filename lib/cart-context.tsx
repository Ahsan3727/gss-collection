'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  productId: string;
  handle: string;
  title: string;
  stone: string;
  size: string;
  price: number;
  photo?: string;
  qty: number;
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
  clearCart: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const STORAGE_KEY = 'gss_cart_v2';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load cart from storage');
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch (e) {
        console.warn('Failed to persist cart');
      }
    }
  }, [items, isLoaded]);

  const addItem = (newItem: CartItem) => {
    setItems((prev) => {
      const idx = prev.findIndex(
        (i) => i.productId === newItem.productId && i.stone === newItem.stone && i.size === newItem.size
      );
      if (idx > -1) {
        const copy = [...prev];
        copy[idx].qty += newItem.qty;
        return copy;
      }
      return [...prev, newItem];
    });
    setIsDrawerOpen(true);
  };

  const removeItem = (productId: string, stone: string, size: string) => {
    setItems((prev) =>
      prev.filter(
        (i) => !(i.productId === productId && i.stone === stone && i.size === size)
      )
    );
  };

  const updateQty = (productId: string, stone: string, size: string, qty: number) => {
    if (qty <= 0) {
      removeItem(productId, stone, size);
      return;
    }
    setItems((prev) =>
      prev.map((i) => {
        if (i.productId === productId && i.stone === stone && i.size === size) {
          return { ...i, qty };
        }
        return i;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalCount = items.reduce((sum, i) => sum + i.qty, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        totalCount,
        subtotal,
        isDrawerOpen,
        addItem,
        removeItem,
        updateQty,
        clearCart,
        openDrawer: () => setIsDrawerOpen(true),
        closeDrawer: () => setIsDrawerOpen(false),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
