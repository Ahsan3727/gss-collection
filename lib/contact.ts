/**
 * Phone and WhatsApp link formatting. Keeps WhatsApp links valid or hidden when unset.
 */

const PK_MOBILE_PATTERN = /^(?:\+?92|0)?3\d{9}$/;

/**
 * Normalizes a Pakistani or international phone string to bare digits for `wa.me/<digits>`.
 * Leading Pakistani `0` (e.g. `0300 1234567`) or bare 10-digit `3XXXXXXXXX` becomes `92...`.
 * Returns `null` when empty or not a plausible phone number.
 */
export function normalizeWhatsAppNumber(phone?: string | null): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }
  if (digits.startsWith('0') && digits.length === 11) {
    digits = `92${digits.slice(1)}`;
  } else if (digits.startsWith('3') && digits.length === 10) {
    digits = `92${digits}`;
  }

  if (digits.length < 10 || digits.length > 15) return null;
  if (/^0+$/.test(digits)) return null;

  return digits;
}

/**
 * Formats a clean local display phone number, preserving what was configured or returning empty.
 */
export function formatDisplayPhone(phone?: string | null): string {
  return (phone || '').trim();
}

/**
 * Builds a `https://wa.me/...` link when a valid number is configured, or `null` so UI can hide it.
 */
export function whatsappLink(
  phone: string | null | undefined,
  message?: string
): string | null {
  const digits = normalizeWhatsAppNumber(phone);
  if (!digits) return null;
  const base = `https://wa.me/${digits}`;
  if (!message || !message.trim()) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}

/**
 * Validates Pakistani mobile numbers (`03XXXXXXXXX` or `+923XXXXXXXXX`, spaces/hyphens allowed).
 */
export function isValidPakistaniMobile(phone: string): boolean {
  const compact = phone.replace(/[\s\-()]/g, '');
  return PK_MOBILE_PATTERN.test(compact);
}

/**
 * Checkout contact phone validator used by both browser form and POST /api/orders.
 */
export function validateCheckoutPhone(phone: string, country = 'PK'): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return 'Please enter your phone / WhatsApp number.';
  if (country === 'PK') {
    if (!isValidPakistaniMobile(trimmed)) {
      return 'Enter a valid Pakistani mobile number (03XXXXXXXXX or +923XXXXXXXXX).';
    }
    return null;
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) {
    return 'Please enter a valid international phone number.';
  }
  return null;
}
