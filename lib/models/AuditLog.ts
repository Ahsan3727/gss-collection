import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAuditLog extends Document {
  actor: string;
  action: string;
  entity: string;
  entityId?: string;
  diff?: Record<string, any>;
  ip?: string;
  at: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actor: { type: String, required: true, index: true },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: { type: String },
    diff: { type: Schema.Types.Mixed },
    ip: { type: String },
    at: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export async function logAdminAction(
  actor: string,
  action: string,
  entity: string,
  entityId?: string,
  diff?: Record<string, any>,
  ip?: string
) {
  try {
    await AuditLog.create({
      actor,
      action,
      entity,
      entityId,
      diff,
      ip,
      at: new Date(),
    });
  } catch (err) {
    console.error('[AuditLog] Failed to record audit log:', err);
  }
}
