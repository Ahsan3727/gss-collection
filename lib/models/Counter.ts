import mongoose, { Schema, Model } from 'mongoose';

export interface ICounter {
  _id: string;
  seq: number;
}

const CounterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 1000 },
});

export const Counter: Model<ICounter> =
  mongoose.models.Counter || mongoose.model<ICounter>('Counter', CounterSchema);

export async function getNextOrderNumber(): Promise<string> {
  const counter = await Counter.findByIdAndUpdate(
    'order',
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return `GSS-${counter?.seq || 1001}`;
}
