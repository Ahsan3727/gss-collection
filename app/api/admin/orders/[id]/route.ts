import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Order } from '@/lib/models/Order';
import { Product } from '@/lib/models/Product';
import { requireAdminApi } from '@/lib/admin-auth';
import { logAdminAction } from '@/lib/models/AuditLog';
import { restoreStock } from '@/lib/stock';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminApi();
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    await connectDB();
    const order = await Order.findOne({
      $or: [{ _id: params.id }, { orderNo: params.id }],
    }).lean();

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ order: JSON.parse(JSON.stringify(order)) });
  } catch (err: any) {
    return NextResponse.json({ error: 'Error loading order' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminApi();
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const body = await req.json();
    const { fulfil, payStatus, trackingCarrier, trackingNumber, adminNote } = body;

    await connectDB();
    const order = await Order.findOne({
      $or: [{ _id: params.id }, { orderNo: params.id }],
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const previousFulfil = order.fulfil;

    if (fulfil && fulfil !== order.fulfil) {
      order.fulfil = fulfil;
      order.timeline.push({
        at: new Date(),
        text: `Fulfillment status updated to: ${fulfil.toUpperCase()}`,
      });

      // If cancelling and not already restocked, restock items
      if (fulfil === 'cancelled' && !order.restocked) {
        for (const item of order.items) {
          // Match by stone and size, not by the SKU saved on the order. If the owner changed the
          // product handle after the order was placed, the variant SKUs changed with it.
          const product = await Product.findOne({ id: item.productId }, { variants: 1 }).lean();
          if (!product) continue;
          const mode = product.variants && product.variants.length > 0 ? 'variant' : 'legacy';
          await restoreStock(Product, product._id, mode, item.stone, item.size, item.qty);
        }
        order.restocked = true;
        order.timeline.push({
          at: new Date(),
          text: `All ${order.items.length} item(s) returned to available stock inventory.`,
        });
      }
    }

    if (payStatus && payStatus !== order.payStatus) {
      order.payStatus = payStatus;
      order.timeline.push({
        at: new Date(),
        text: `Payment marked as: ${payStatus.toUpperCase()}`,
      });
    }

    if (trackingNumber) {
      order.tracking = {
        carrier: trackingCarrier || 'TCS Express',
        number: trackingNumber,
      };
      order.timeline.push({
        at: new Date(),
        text: `Courier tracking assigned: ${trackingCarrier || 'TCS Express'} #${trackingNumber}`,
      });
    }

    if (adminNote && adminNote.trim()) {
      order.adminNotes.push({
        at: new Date(),
        text: `${auth.user.name}: ${adminNote.trim()}`,
      });
    }

    await order.save();

    await logAdminAction(auth.user.email, 'order_update', 'Order', order.orderNo, {
      fulfil: order.fulfil,
      payStatus: order.payStatus,
      previousFulfil,
    });

    return NextResponse.json({ success: true, order: JSON.parse(JSON.stringify(order)) });
  } catch (err: any) {
    console.error('[Admin Order Update Error]:', err);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
