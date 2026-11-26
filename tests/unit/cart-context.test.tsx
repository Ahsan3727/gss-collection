// @vitest-environment jsdom
import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  addItemReducer,
  CartProvider,
  MAX_CART_QTY,
  useCart,
  type CartItem,
} from '@/lib/cart-context';

const baseItem: CartItem = {
  productId: 'p1',
  handle: 'crimson-halo-ring',
  title: 'Crimson Halo Ring',
  stone: 'garnet',
  size: '7',
  price: 9500,
  qty: 1,
  maxStock: 3,
};

describe('cart reducer & CartProvider (StrictMode safe)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.style.overflow = '';
  });

  it('never mutates previous items array and clamps quantities cleanly', () => {
    const firstState = addItemReducer([], baseItem);
    const snapshot = structuredClone(firstState);
    const secondState = addItemReducer(firstState, { ...baseItem, qty: 2 });

    expect(firstState).toEqual(snapshot);
    expect(secondState).toHaveLength(1);
    expect(secondState[0].qty).toBe(3);

    // Beyond maxStock (3) clamps to 3
    const clampedStock = addItemReducer(secondState, { ...baseItem, qty: 5 });
    expect(clampedStock[0].qty).toBe(3);

    // Unlimited maxStock still caps at MAX_CART_QTY (10)
    const highStock = addItemReducer([], { ...baseItem, maxStock: 50, qty: 15 });
    expect(highStock[0].qty).toBe(MAX_CART_QTY);
  });

  it('adds exact quantity once inside React.StrictMode and locks scroll while drawer opens', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <React.StrictMode>
        <CartProvider>{children}</CartProvider>
      </React.StrictMode>
    );

    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem({ ...baseItem, qty: 2 });
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].qty).toBe(2);
    expect(result.current.totalCount).toBe(2);
    expect(result.current.subtotal).toBe(19000);
    expect(result.current.isDrawerOpen).toBe(true);
    expect(document.documentElement.style.overflow).toBe('hidden');

    act(() => {
      result.current.updateQty('p1', 'garnet', '7', 1);
    });
    expect(result.current.items[0].qty).toBe(1);

    act(() => {
      result.current.syncValidatedItems([
        {
          productId: 'p1',
          handle: 'crimson-halo-ring',
          title: 'Crimson Halo Ring',
          stone: 'garnet',
          size: '7',
          price: 10200,
          qty: 1,
          maxStock: 2,
        },
      ]);
    });
    expect(result.current.items[0].price).toBe(10200);

    act(() => {
      result.current.closeDrawer();
    });
    expect(result.current.isDrawerOpen).toBe(false);
    expect(document.documentElement.style.overflow).toBe('');

    act(() => {
      result.current.updateQty('p1', 'garnet', '7', 0);
    });
    expect(result.current.items).toHaveLength(0);
  });
});
