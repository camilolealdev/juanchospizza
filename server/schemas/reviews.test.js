import { describe, it, expect } from 'vitest';
import { createReviewSchema, reviewStatusSchema } from './reviews.js';

const base = { orderId: 'ord_1', clientPhone: '3001234567' };

describe('createReviewSchema', () => {
  it('requires orderId, clientPhone, and rating', () => {
    expect(createReviewSchema.safeParse({}).success).toBe(false);
    expect(createReviewSchema.safeParse({ ...base }).success).toBe(false); // no rating
  });

  it('rounds a decimal rating instead of rejecting it (matches original Math.round behavior)', () => {
    const result = createReviewSchema.safeParse({ ...base, rating: 4.6 });
    expect(result.success).toBe(true);
    expect(result.data.rating).toBe(5);
  });

  it('rejects a rating out of the 1-5 range with the original message', () => {
    const result = createReviewSchema.safeParse({ ...base, rating: 9 });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('La calificación debe ser entre 1 y 5');
  });

  it('rejects a rating of 0', () => {
    expect(createReviewSchema.safeParse({ ...base, rating: 0 }).success).toBe(false);
  });

  it('accepts a valid review', () => {
    const result = createReviewSchema.safeParse({ ...base, rating: 5, comment: 'Excelente' });
    expect(result.success).toBe(true);
  });
});

describe('reviewStatusSchema', () => {
  it('accepts the three real statuses', () => {
    for (const status of ['pending', 'approved', 'rejected']) {
      expect(reviewStatusSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it('rejects anything else', () => {
    expect(reviewStatusSchema.safeParse({ status: 'bogus' }).success).toBe(false);
  });
});
