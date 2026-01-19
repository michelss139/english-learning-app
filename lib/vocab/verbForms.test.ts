/**
 * Unit tests for resolveVerbForm helper
 * 
 * Run with: npm test or jest
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resolveVerbForm, getVerbFormLabel, type VerbFormResult } from './verbForms';

describe('resolveVerbForm', () => {
  const mockSupabase = {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        data: null,
        error: null,
      })),
    })),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should resolve "went" to (go, past_simple)', async () => {
    const mockData = [
      {
        present_simple_i: 'go',
        present_simple_you: 'go',
        present_simple_he_she_it: 'goes',
        past_simple: 'went',
        past_participle: 'gone',
        lexicon_entries: { lemma_norm: 'go' },
      },
    ];

    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        data: mockData,
        error: null,
      })),
    });

    const result = await resolveVerbForm('went', mockSupabase as any);

    expect(result).toEqual({
      baseLemma: 'go',
      formType: 'past_simple',
    });
  });

  it('should resolve "gone" to (go, past_participle)', async () => {
    const mockData = [
      {
        present_simple_i: 'go',
        present_simple_you: 'go',
        present_simple_he_she_it: 'goes',
        past_simple: 'went',
        past_participle: 'gone',
        lexicon_entries: { lemma_norm: 'go' },
      },
    ];

    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        data: mockData,
        error: null,
      })),
    });

    const result = await resolveVerbForm('gone', mockSupabase as any);

    expect(result).toEqual({
      baseLemma: 'go',
      formType: 'past_participle',
    });
  });

  it('should resolve "goes" to (go, present_he_she_it)', async () => {
    const mockData = [
      {
        present_simple_i: 'go',
        present_simple_you: 'go',
        present_simple_he_she_it: 'goes',
        past_simple: 'went',
        past_participle: 'gone',
        lexicon_entries: { lemma_norm: 'go' },
      },
    ];

    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        data: mockData,
        error: null,
      })),
    });

    const result = await resolveVerbForm('goes', mockSupabase as any);

    expect(result).toEqual({
      baseLemma: 'go',
      formType: 'present_he_she_it',
    });
  });

  it('should return null for non-verb terms', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        data: [],
        error: null,
      })),
    });

    const result = await resolveVerbForm('ball', mockSupabase as any);

    expect(result).toBeNull();
  });

  it('should return null for empty term', async () => {
    const result = await resolveVerbForm('', mockSupabase as any);
    expect(result).toBeNull();
  });

  it('should handle case-insensitive matching', async () => {
    const mockData = [
      {
        present_simple_i: 'go',
        present_simple_you: 'go',
        present_simple_he_she_it: 'goes',
        past_simple: 'went',
        past_participle: 'gone',
        lexicon_entries: { lemma_norm: 'go' },
      },
    ];

    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        data: mockData,
        error: null,
      })),
    });

    const result = await resolveVerbForm('WENT', mockSupabase as any);

    expect(result).toEqual({
      baseLemma: 'go',
      formType: 'past_simple',
    });
  });
});

describe('getVerbFormLabel', () => {
  it('should return correct labels for all form types', () => {
    expect(getVerbFormLabel('present_I')).toBe('Present simple (I)');
    expect(getVerbFormLabel('present_you')).toBe('Present simple (you)');
    expect(getVerbFormLabel('present_he_she_it')).toBe('Present simple (he/she/it)');
    expect(getVerbFormLabel('past_simple')).toBe('Past simple');
    expect(getVerbFormLabel('past_participle')).toBe('Past participle');
  });
});
