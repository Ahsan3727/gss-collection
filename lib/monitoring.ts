import crypto from 'node:crypto';

export interface MonitoringContext {
  area?: 'checkout' | 'storefront' | 'admin' | 'api';
  route?: string;
  level?: 'fatal' | 'error' | 'warning';
  extra?: Record<string, string | number | boolean | undefined>;
}

export interface ParsedSentryDsn {
  endpoint: string;
  authHeader: string;
}

/**
 * Parses a standard Sentry DSN (`https://<key>@<host>/<projectId>`) into a Sentry store endpoint
 * and X-Sentry-Auth header so errors report directly without heavyweight client SDK overhead.
 */
export function parseSentryDsn(rawDsn?: string | null): ParsedSentryDsn | null {
  if (!rawDsn) return null;
  try {
    const parsed = new URL(rawDsn.trim());
    const key = parsed.username;
    const projectId = parsed.pathname.replace(/^\/+|\/+$/g, '').split('/').pop();
    if (!key || !projectId || !parsed.host) return null;

    const basePath = parsed.pathname.replace(new RegExp(`/?${projectId}/?$`), '');
    const endpoint = `${parsed.protocol}//${parsed.host}${basePath}/api/${projectId}/store/`;
    const authHeader = [
      'Sentry sentry_version=7',
      'sentry_client=gss-monitor/1.0',
      `sentry_key=${key}`,
    ].join(', ');
    return { endpoint, authHeader };
  } catch {
    return null;
  }
}

export function sanitizeTelemetryString(value: string, maxLen = 500): string {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/(?:\+?92|0)?3\d{9}\b/g, '[phone]')
    .slice(0, maxLen);
}

/**
 * Emits structured server error telemetry (captured by Vercel Logs) and forwards the event
 * to Sentry's ingest API when `SENTRY_DSN` is configured. Never throws.
 */
export async function reportError(
  err: unknown,
  context: MonitoringContext = {}
): Promise<void> {
  const rawMessage = err instanceof Error ? err.message : String(err || 'Unknown error');
  const message = sanitizeTelemetryString(rawMessage, 500);
  const name = err instanceof Error ? err.name : 'Error';
  const rawStack = err instanceof Error && err.stack ? err.stack : undefined;
  const stack = rawStack ? sanitizeTelemetryString(rawStack, 1500) : undefined;
  const level = context.level || 'error';
  const area = context.area || 'api';

  const payload = {
    event_id: crypto.randomUUID().replace(/-/g, ''),
    timestamp: new Date().toISOString(),
    platform: 'node',
    level,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    tags: {
      area,
      ...(context.route ? { route: context.route } : {}),
    },
    exception: {
      values: [
        {
          type: name,
          value: message,
        },
      ],
    },
    extra: {
      ...(stack ? { stack } : {}),
      ...(context.extra || {}),
    },
  };

  console.error(
    JSON.stringify({
      monitoring: true,
      eventId: payload.event_id,
      level,
      area,
      route: context.route,
      type: name,
      message,
    })
  );

  const dsn = parseSentryDsn(process.env.SENTRY_DSN);
  if (!dsn || process.env.NODE_ENV === 'test') return;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    await fetch(dsn.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': dsn.authHeader,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).catch(() => undefined);
    clearTimeout(timer);
  } catch {
    // Telemetry must never break request handling.
  }
}
