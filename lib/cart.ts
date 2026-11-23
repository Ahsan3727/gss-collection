export interface CartItem {
  productId: string;
  handle: string;
  title: string;
  stone: string;
  size: string;
  qty: number;
  price: number;
  photo?: string;
}

export const CART_COOKIE_NAME = 'gss_cart';

export function getCartFromCookie(cookieHeader?: string | null): CartItem[] {
  if (!cookieHeader) return [];
  try {
    const match = cookieHeader.split(';').find((c) => c.trim().startsWith(`${CART_COOKIE_NAME}=`));
    if (!match) return [];
    const val = decodeURIComponent(match.split('=')[1]);
    return JSON.parse(val);
  } catch {
    return [];
  }
}

export function serializeCartCookie(cart: CartItem[]): string {
  return `${CART_COOKIE_NAME}=${encodeURIComponent(JSON.stringify(cart))}; Path=/; Max-Age=2592000; SameSite=Lax`;
}
