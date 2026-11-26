import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock next/cache revalidateTag so route handler tests can execute without Next server runtime.
vi.mock('next/cache', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/cache')>();
  return {
    ...actual,
    revalidateTag: vi.fn(),
    unstable_cache: <T extends (...args: never[]) => Promise<unknown>>(fn: T) => fn,
  };
});
