import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Product } from '@/lib/models/Product';
import { requireAdminApi } from '@/lib/admin-auth';
import { logAdminAction } from '@/lib/models/AuditLog';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cat = searchParams.get('cat');
    const stone = searchParams.get('stone');
    const handles = searchParams.get('handles');
    const sort = searchParams.get('sort');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '24')));

    await connectDB();

    const query: any = { status: 'active' };

    if (cat && cat !== 'all') {
      query.cat = cat;
    }
    if (stone) {
      query.stones = stone;
    }
    if (handles) {
      const handleList = handles.split(',').map((h) => h.trim());
      query.handle = { $in: handleList };
    }

    let sortOption: any = { createdAt: -1 };
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
  } catch (err: any) {
    console.error('[Products API Error]:', err);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const authCheck = await requireAdminApi();
  if ('errorResponse' in authCheck) return authCheck.errorResponse;

  try {
    const body = await req.json();
    await connectDB();

    const newProduct = await Product.create(body);
    await logAdminAction(authCheck.user.email, 'product_create', 'Product', newProduct.id, {
      title: newProduct.title,
      handle: newProduct.handle,
    });

    return NextResponse.json({ success: true, product: newProduct }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error creating product' }, { status: 400 });
  }
}
