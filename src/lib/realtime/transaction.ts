const recipientsByTransaction = new WeakMap<object, Set<string>>();
export function collectNotificationRecipient(tx: object, userId: string) {
  recipientsByTransaction.get(tx)?.add(userId);
}
export async function committedNotifications<T, Tx extends object>(
  transaction: (work: (tx: Tx) => Promise<T>) => Promise<T>,
  work: (tx: Tx) => Promise<T>,
  publish: (userIds: string[]) => Promise<void>,
) {
  const recipients = new Set<string>();
  const result = await transaction(async (tx) => {
    recipientsByTransaction.set(tx, recipients);
    try { return await work(tx); }
    finally { recipientsByTransaction.delete(tx); }
  });
  // The transaction promise resolves only after COMMIT. Rollbacks never publish.
  if (recipients.size) {
    try { await publish([...recipients]); }
    catch { console.warn("Realtime delivery failed after commit; notification preserved."); }
  }
  return result;
}
