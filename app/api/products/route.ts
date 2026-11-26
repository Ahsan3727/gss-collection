import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { connectDB } from '@/lib/db';
import { Product } from '@/lib/models/Product';
import { requireAdminApi } from '@/lib/admin-auth';
import { logAdminAction } from '@/lib/models/AuditLog';
import { buildProductDocument, parseProductWrite } from '@/lib/product-write';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cat = searchParams.get('cat');
    const stone = searchParams.get('stone');
    const handles = searchParams.get('handles');
    const sort = searchParams.get('sort');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '24', 10) || 24));

    await connectDB();

    const query: Record<string, unknown> = { status: 'active' };

    if (cat && cat !== 'all') {
      query.cat = cat;
    }
    if (stone) {
      query.stones = stone;
    }
    if (handles) {
      const handleList = handles
        .split(',')
        .map((h) => h.trim())
        .filter(Boolean)
        .slice(0, 50);
      query.handle = { $in: handleList };
    }

    let sortOption: Record<string, 1 | -1> = { createdAt: -1 };
    if (sort === 'price-asc') sortOption = { base: 1 };
    else if (sort === 'price-desc') sortOption = { base: -1 };
    else if (sort === 'best') sortOption = { sold: -1 };

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      products: JSON.parse(JSON.stringify(products)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: unknown) {
    console.error('[Products API Error]:', err);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const authCheck = await requireAdminApi();
  if ('errorResponse' in authCheck) return authCheck.errorResponse;

  try {
    const body: unknown = await req.json();
    const parsed = parseProductWrite(body);
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    await connectDB();

    const existing = await Product.findOne({
      $or: [{ handle: parsed.data.handle }, { id: parsed.data.handle }],
    }).lean();
    if (existing) {
      return NextResponse.json({ error: 'A product with this handle already exists.' }, { status: 409 });
    }

    const document = buildProductDocument(parsed.data);
    const newProduct = await Product.create(document);
    await logAdminAction(authCheck.user.email, 'product_create', 'Product', newProduct.id, {
      title: newProduct.title,
      handle: newProduct.handle,
    });

    revalidateTag('products');
    revalidateTag(`product:${newProduct.handle}`);

    return NextResponse.json(
      { success: true, product: JSON.parse(JSON.stringify(newProduct)) },
      { status: 201 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error creating product';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
