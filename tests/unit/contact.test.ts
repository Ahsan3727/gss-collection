import { describe, expect, it } from 'vitest';
import {
  formatDisplayPhone,
  isValidPakistaniMobile,
  normalizeWhatsAppNumber,
  validateCheckoutPhone,
  whatsappLink,
} from '@/lib/contact';

describe('contact & Pakistani mobile helpers', () => {
  it('normalizes Pakistani and international phone formats for wa.me links', () => {
    expect(normalizeWhatsAppNumber('0300 123 4567')).toBe('923001234567');
    expect(normalizeWhatsAppNumber('+92-321-9876543')).toBe('923219876543');
    expect(normalizeWhatsAppNumber('3001234567')).toBe('923001234567');
    expect(normalizeWhatsAppNumber('00923451234567')).toBe('923451234567');
    expect(normalizeWhatsAppNumber('')).toBeNull();
    expect(normalizeWhatsAppNumber('00000000000')).toBeNull();
  });

  it('builds encoded WhatsApp URL or null when phone is unset', () => {
    expect(whatsappLink('', 'Hello')).toBeNull();
    expect(whatsappLink(null, 'Hello')).toBeNull();
    expect(whatsappLink('0300-1234567')).toBe('https://wa.me/923001234567');
    expect(whatsappLink('+923001234567', 'Track order #GSS-1001')).toBe(
      'https://wa.me/923001234567?text=Track%20order%20%23GSS-1001'
    );
    expect(formatDisplayPhone('  +92 300 1234567  ')).toBe('+92 300 1234567');
  });

  it('validates Pakistani mobile numbers and international checkout phones', () => {
    expect(isValidPakistaniMobile('03001234567')).toBe(true);
    expect(isValidPakistaniMobile('+92 321 7654321')).toBe(true);
    expect(isValidPakistaniMobile('04235711223')).toBe(false);
    expect(isValidPakistaniMobile('030012345')).toBe(false);

    expect(validateCheckoutPhone('', 'PK')).toBeTruthy();
    expect(validateCheckoutPhone('03001234567', 'PK')).toBeNull();
    expect(validateCheckoutPhone('12345', 'PK')).toBeTruthy();
    expect(validateCheckoutPhone('+44 7911 123456', 'UK')).toBeNull();
    expect(validateCheckoutPhone('123', 'UK')).toBeTruthy();
  });
});
