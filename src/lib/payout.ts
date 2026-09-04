
// one-shot pure function (returns what you put in, limits if money runs out)
// core money calculation happens here. we calculate exactly how much to pay based on views
// completely pure function, if the budget is insufficient it just fails and returns false, no surprises
export function computePayout(
  views: number,
  ratePer1kCents: number,
  remainingBudgetCents: number
): { ok: true; payoutCents: number; exhaustsBudget: boolean } | { ok: false; reason: 'BUDGET_EXCEEDED' } {
  const raw = Math.floor(views / 1000) * ratePer1kCents;

  if (raw > remainingBudgetCents) {
    return { ok: false, reason: 'BUDGET_EXCEEDED' };
  }

  return {
    ok: true,
    payoutCents: raw,
    exhaustsBudget: raw === remainingBudgetCents,
  };
}
