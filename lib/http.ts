import { NextResponse } from 'next/server';

export async function parseJsonBody(
  req: Request
): Promise<{ data: unknown } | { errorResponse: NextResponse }> {
  try {
    const data: unknown = await req.json();
    return { data };
  } catch {
    return {
      errorResponse: NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 }),
    };
  }
}
