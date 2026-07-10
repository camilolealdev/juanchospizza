import { describe, it, expect } from 'vitest';
import { createCampaignSchema, updateCampaignSchema } from './campaigns.js';

describe('createCampaignSchema', () => {
  // Before Zod validation existed, POST /api/campaigns with no `name`/`type`
  // stored the literal string "undefined" (String(undefined)) -- this is the
  // regression test for that bug.
  it('rejects a missing name instead of silently accepting it', () => {
    const result = createCampaignSchema.safeParse({ type: 'flash' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing or invalid type', () => {
    expect(createCampaignSchema.safeParse({ name: 'Promo' }).success).toBe(false);
    expect(createCampaignSchema.safeParse({ name: 'Promo', type: 'bogus' }).success).toBe(false);
  });

  it('accepts a valid campaign and defaults status to draft', () => {
    const result = createCampaignSchema.safeParse({ name: 'Promo Verano', type: 'flash' });
    expect(result.success).toBe(true);
    expect(result.data.status).toBe('draft');
    expect(result.data.discount).toBe(0);
    expect(result.data.budget).toBe(0);
  });

  it('rejects an invalid status', () => {
    const result = createCampaignSchema.safeParse({ name: 'Promo', type: 'flash', status: 'bogus' });
    expect(result.success).toBe(false);
  });
});

describe('updateCampaignSchema', () => {
  it('allows a partial update with just one field', () => {
    const result = updateCampaignSchema.safeParse({ status: 'active' });
    expect(result.success).toBe(true);
    expect(result.data.name).toBeUndefined();
  });
});
