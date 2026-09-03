import { describe, it, expect } from 'vitest';
import { computePayout } from './payout';

describe('computePayout', () => {
  it('Normal case: 2500 views, $3/1k → 600 cents', () => {
    const result = computePayout(2500, 300, 10000);
    expect(result).toEqual({ ok: true, payoutCents: 600, exhaustsBudget: false });
  });

  it('Floor behavior: 999 views → 0 cents', () => {
    const result = computePayout(999, 300, 10000);
    expect(result).toEqual({ ok: true, payoutCents: 0, exhaustsBudget: false });
  });

  it('Exact budget match: payout equals remaining → exhaustsBudget: true', () => {
    const result = computePayout(2000, 300, 600);
    expect(result).toEqual({ ok: true, payoutCents: 600, exhaustsBudget: true });
  });

  it('Over budget: payout exceeds remaining → ok: false', () => {
    const result = computePayout(3000, 300, 600);
    expect(result).toEqual({ ok: false, reason: 'BUDGET_EXCEEDED' });
  });

  it('Zero remaining budget → ok: false (if views >= 1000)', () => {
    const result = computePayout(1000, 300, 0);
    expect(result).toEqual({ ok: false, reason: 'BUDGET_EXCEEDED' });
  });

  it('Views exactly 1000 → one unit of payout', () => {
    const result = computePayout(1000, 300, 10000);
    expect(result).toEqual({ ok: true, payoutCents: 300, exhaustsBudget: false });
  });

  it('Large numbers to verify no floating-point drift', () => {
    // 100 million views, $50.50 per 1k = 5050 cents
    const result = computePayout(100_000_000, 5050, 1_000_000_000); 
    // payout: (100,000,000 / 1000) * 5050 = 100,000 * 5050 = 505,000,000
    expect(result).toEqual({ ok: true, payoutCents: 505_000_000, exhaustsBudget: false });
  });
});
