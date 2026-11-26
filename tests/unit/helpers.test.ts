// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { formatMoney } from '@/lib/money';
import { isVitalName, ratingFor, routeFromPath } from '@/lib/vitals';
import { getCartFromCookie, serializeCartCookie } from '@/lib/cart';
import { useSave } from '@/lib/use-save';
import { ALLOWED_ADMIN_ROLES, isAdminRole } from '@/lib/roles';
import { parseSentryDsn, reportError, sanitizeTelemetryString } from '@/lib/monitoring';
import { getSiteUrl } from '@/lib/env';
import { selectMoreCollagePhotos } from '@/lib/catalogue';

describe('utility helpers (money, vitals, cart cookies, roles, useSave)', () => {
  it('formats PKR currency consistently', () => {
    expect(formatMoney(9500)).toBe('Rs. 9,500');
    expect(formatMoney(0)).toBe('Rs. 0');
  });

  it('normalizes routes, checks metric names, and computes Web Vitals ratings', () => {
    expect(isVitalName('LCP')).toBe(true);
    expect(isVitalName('UNKNOWN')).toBe(false);

    expect(routeFromPath('/')).toBe('/');
    expect(routeFromPath('/collections/ladies?page=2')).toBe('/collections/[handle]');
    expect(routeFromPath('/products/crimson-halo-ring')).toBe('/products/[handle]');
    expect(routeFromPath('/order/GSS-1001')).toBe('/order/[orderNo]');
    expect(routeFromPath('/pages/size-guide')).toBe('/pages/[slug]');
    expect(routeFromPath('/cart')).toBe('/cart');
    expect(routeFromPath('/admin/orders')).toBe('/other');

    expect(ratingFor('LCP', 2000)).toBe('good');
    expect(ratingFor('LCP', 3000)).toBe('needs-improvement');
    expect(ratingFor('LCP', 4500)).toBe('poor');
  });

  it('serializes and parses cart cookies safely', () => {
    const sample = [
      {
        productId: 'p1',
        handle: 'ring',
        title: 'Ring',
        stone: 'garnet',
        size: '7',
        qty: 1,
        price: 9500,
      },
    ];
    const header = serializeCartCookie(sample).split(';')[0];
    expect(getCartFromCookie(`foo=bar; ${header}`)).toEqual(sample);
    expect(getCartFromCookie(null)).toEqual([]);
    expect(getCartFromCookie('gss_cart=%%%invalid')).toEqual([]);
  });

  it('validates admin roles strictly', () => {
    expect(ALLOWED_ADMIN_ROLES).toEqual(['admin', 'superadmin']);
    expect(isAdminRole('admin')).toBe(true);
    expect(isAdminRole('superadmin')).toBe(true);
    expect(isAdminRole('customer')).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
  });

  it('manages saving, error, retry, and reset states via useSave', async () => {
    const { result } = renderHook(() => useSave());
    expect(result.current.status).toBe('idle');

    let calls = 0;
    await act(async () => {
      await result.current.run(async () => {
        calls += 1;
        if (calls === 1) throw new Error('Network failure');
      });
    });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Network failure');

    await act(async () => {
      await result.current.retry();
    });
    expect(result.current.status).toBe('saved');

    act(() => {
      result.current.reset();
    });
    expect(result.current.status).toBe('idle');
  });

  it('parses Sentry DSNs, scrubs PII from telemetry strings, and logs safely', async () => {
    expect(parseSentryDsn('')).toBeNull();
    expect(parseSentryDsn('not-a-url')).toBeNull();
    expect(parseSentryDsn('https://abc123@o450.ingest.sentry.io/999')).toEqual({
      endpoint: 'https://o450.ingest.sentry.io/api/999/store/',
      authHeader: 'Sentry sentry_version=7, sentry_client=gss-monitor/1.0, sentry_key=abc123',
    });

    const scrubbed = sanitizeTelemetryString('Order failed for user@example.com phone 03001234567');
    expect(scrubbed).not.toContain('user@example.com');
    expect(scrubbed).not.toContain('03001234567');
    expect(scrubbed).toContain('[email]');
    expect(scrubbed).toContain('[phone]');

    await expect(
      reportError(new Error('Test checkout fault for buyer@test.pk'), {
        area: 'checkout',
        route: '/api/orders',
      })
    ).resolves.toBeUndefined();
  });

  it('resolves live domain before localhost fallback in getSiteUrl', () => {
    const saved = {
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
      VERCEL_URL: process.env.VERCEL_URL,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    };
    try {
      delete process.env.NEXT_PUBLIC_SITE_URL;
      process.env.VERCEL_ENV = 'production';
      process.env.VERCEL_PROJECT_PRODUCTION_URL = 'gsscollection.pk';
      process.env.VERCEL_URL = 'gss-preview.vercel.app';
      expect(getSiteUrl()).toBe('https://gsscollection.pk');

      delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
      expect(getSiteUrl()).toBe('https://gss-preview.vercel.app');

      delete process.env.VERCEL_URL;
      process.env.NEXTAUTH_URL = 'https://shop.gsscollection.pk/';
      expect(getSiteUrl()).toBe('https://shop.gsscollection.pk');
    } finally {
      Object.assign(process.env, saved);
    }
  });

  it('builds 4-photo More+ collage prioritizing unseen category items then fallbacks', () => {
    const seven = [1, 2, 3, 4, 5, 6, 7].map((n) => ({ photos: [`/img-${n}.jpg`] }));
    expect(selectMoreCollagePhotos(seven)).toEqual([
      '/img-4.jpg',
      '/img-5.jpg',
      '/img-6.jpg',
      '/img-7.jpg',
    ]);

    const four = [1, 2, 3, 4].map((n) => ({ photos: [`/cat-${n}.jpg`] }));
    expect(selectMoreCollagePhotos(four)).toEqual([
      '/cat-4.jpg',
      '/cat-1.jpg',
      '/cat-2.jpg',
      '/cat-3.jpg',
    ]);

    const oneWithFallback = selectMoreCollagePhotos(
      [{ photos: ['/gents-1.jpg'] }],
      ['/gents-1.jpg', '/f-1.jpg', '/f-2.jpg', '/f-3.jpg']
    );
    expect(oneWithFallback).toEqual(['/gents-1.jpg', '/f-1.jpg', '/f-2.jpg', '/f-3.jpg']);

    expect(selectMoreCollagePhotos([{ photos: ['/only.jpg'] }], [])).toEqual([
      '/only.jpg',
      '/only.jpg',
      '/only.jpg',
      '/only.jpg',
    ]);
    expect(selectMoreCollagePhotos([], [])).toEqual([]);
  });
});
