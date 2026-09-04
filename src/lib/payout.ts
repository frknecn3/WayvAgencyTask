
// tek atımlı pure function (girdigin kadarını verir, para kalmazsa parayı dizer)..
// ana para hasabı burada dönüyor. görüntülenmeye göre tam ne kadar ödeyeceğimizi hesaplıyoruz.
// tamamen pure functin, yani bütçe yetmiyorsa direkt patlatıp false dönüyor, sürpriz yok.
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
