/**
 * Unit tests for resolveVerbForm helper
 * 
 * Test cases documented for manual verification or integration with test framework
 * 
 * Expected behavior:
 * 1. resolveVerbForm("went", supabase) -> { baseLemma: "go", formType: "past_simple" }
 *    - baseLemma must be "go", not "went"
 * 2. resolveVerbForm("gone", supabase) -> { baseLemma: "go", formType: "past_participle" }
 * 3. resolveVerbForm("do", supabase) -> null (baseLemma equals term, or present form => ignored)
 * 4. resolveVerbForm("ball", supabase) -> null (not a verb form)
 * 5. resolveVerbForm("WENT", supabase) -> { baseLemma: "go", formType: "past_simple" } (case-insensitive)
 * 
 * shouldShowVerbFormBadge tests:
 * 1. shouldShowVerbFormBadge("verb", { baseLemma: "go", formType: "past_simple" }) -> true
 * 2. shouldShowVerbFormBadge("verb", { baseLemma: "go", formType: "past_participle" }) -> true
 * 3. shouldShowVerbFormBadge("verb", { baseLemma: "go", formType: "present_I" }) -> false (present ignored)
 * 4. shouldShowVerbFormBadge("noun", { baseLemma: "go", formType: "past_simple" }) -> false (not verb)
 * 5. shouldShowVerbFormBadge("verb", null) -> false
 * 
 * To test manually:
 * 1. Ensure lexicon_verb_forms has entry for "go" verb with lemma_norm="go"
 * 2. Call resolveVerbForm("went", supabase) and verify result is { baseLemma: "go", formType: "past_simple" }
 * 3. Call resolveVerbForm("gone", supabase) and verify result is { baseLemma: "go", formType: "past_participle" }
 * 4. Call resolveVerbForm("do", supabase) and verify result is null
 * 5. Verify UI shows badge only for verb + past_simple/past_participle
 */

// This file documents test cases. Actual implementation is in verbForms.ts
// To add a test framework, import resolveVerbForm and shouldShowVerbFormBadge and create test cases.

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
