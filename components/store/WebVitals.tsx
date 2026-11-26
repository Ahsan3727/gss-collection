'use client';

import { useReportWebVitals } from 'next/web-vitals';
import {
  VITALS_ENDPOINT,
  VITALS_SAMPLE_RATE,
  isVitalName,
  routeFromPath,
} from '@/lib/vitals';

// Decided once per page load, so a visit that is sampled in sends all of its metrics.
const sampledIn = typeof window !== 'undefined' && Math.random() < VITALS_SAMPLE_RATE;

const NETWORK_TYPES = ['slow-2g', '2g', '3g', '4g'];

// Defined at module level so the hook gets the same function on every render
// and never registers the listeners twice.
const report: Parameters<typeof useReportWebVitals>[0] = (metric) => {
  if (process.env.NODE_ENV !== 'production' || !sampledIn) return;
  if (!isVitalName(metric.name)) return;
  if (window.location.pathname.startsWith('/admin')) return;

  const connection = (navigator as Navigator & { connection?: { effectiveType?: string } })
    .connection;
  const net = connection?.effectiveType;

  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    id: metric.id,
    route: routeFromPath(window.location.pathname),
    w: window.innerWidth,
    net: net && NETWORK_TYPES.includes(net) ? net : undefined,
  });

  // sendBeacon survives the page being closed, which is when CLS and INP are reported.
  if (typeof navigator.sendBeacon === 'function') {
    const queued = navigator.sendBeacon(
      VITALS_ENDPOINT,
      new Blob([body], { type: 'application/json' })
    );
    if (queued) return;
  }

  fetch(VITALS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // Measurement must never affect the shopper.
  });
};

export default function WebVitals() {
  useReportWebVitals(report);
  return null;
}
