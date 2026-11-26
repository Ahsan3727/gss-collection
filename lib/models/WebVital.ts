import mongoose, { Schema, Document, Model } from 'mongoose';

// One document per reported metric from a real visitor's browser.
// Documents expire on their own after 30 days (TTL index on createdAt), which
// is enough for the two-week field-data gate and keeps the collection small.
export interface IWebVital extends Document {
  name: string; // LCP, INP, CLS, FCP, TTFB, FID
  value: number; // milliseconds, except CLS (unitless)
  rating: string; // good | needs-improvement | poor
  route: string; // route pattern, for example /products/[handle]
  metricId: string; // unique per metric per page load; lets reports ignore repeats
  viewportWidth?: number;
  connection?: string; // effectiveType: slow-2g, 2g, 3g, 4g
  createdAt: Date;
}

const WebVitalSchema = new Schema<IWebVital>(
  {
    name: { type: String, required: true },
    value: { type: Number, required: true },
    rating: { type: String, required: true },
    route: { type: String, required: true },
    metricId: { type: String, required: true },
    viewportWidth: { type: Number },
    connection: { type: String },
    createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 30 },
  },
  { versionKey: false }
);

WebVitalSchema.index({ name: 1, route: 1, createdAt: -1 });

export const WebVital: Model<IWebVital> =
  mongoose.models.WebVital || mongoose.model<IWebVital>('WebVital', WebVitalSchema);
