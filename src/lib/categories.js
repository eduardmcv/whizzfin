// Category helpers: usage counting and safe deletion with reassignment.

export async function categoryUsage(db, categoryId) {
  const [transactions, allRules] = await Promise.all([
    db.transactions.where("categoryId").equals(categoryId).count(),
    db.rules.toArray(),
  ]);
  const rules = allRules.filter((r) => r.categoryId === categoryId).length;
  return { transactions, rules, total: transactions + rules };
}

// Move every transaction and rule using `categoryId` to `targetId`
// (null = no category), then delete the category. Atomic.
export async function deleteCategoryWithReassign(db, categoryId, targetId) {
  await db.transaction(
    "rw",
    db.transactions,
    db.rules,
    db.categories,
    async () => {
      await db.transactions
        .where("categoryId")
        .equals(categoryId)
        .modify({ categoryId: targetId });

      const rules = await db.rules.toArray();
      for (const rule of rules) {
        if (rule.categoryId === categoryId) {
          await db.rules.update(rule.id, { categoryId: targetId });
        }
      }

      await db.categories.delete(categoryId);
    },
  );
}
