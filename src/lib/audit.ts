import { auditLogs } from "../db/schema";

export async function createAuditLog(
  dbInstance: any,
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  oldValue?: any,
  newValue?: any,
) {
  await dbInstance.insert(auditLogs).values({
    id: "a-" + crypto.randomUUID().slice(0, 8),
    userId,
    action,
    entityType,
    entityId,
    oldValue: oldValue ? JSON.stringify(oldValue) : null,
    newValue: newValue ? JSON.stringify(newValue) : null,
    timestamp: new Date(),
  });
}
