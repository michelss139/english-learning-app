/**
 * Tests that cluster unlock logic was removed - all clusters are always available.
 * Verifies the changes from removing the lock/unlock feature.
 */
import { describe, it, expect, vi } from "vitest";

// We need to test that ensureClusterUnlocked is not exported, but the behavior
// is that loadClusterCatalog and loadClusterPageData always treat clusters as unlocked.
// We'll test by mocking supabase and verifying the returned shape.

describe("clusterLoader - unlock removal", () => {
  it("loadClusterCatalog returns clusters with unlocked: true (no lock logic)", async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "vocab_clusters") {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: "c1",
                        slug: "make-do",
                        title: "Make vs Do",
                        is_recommended: true,
                        is_unlockable: false,
                        theory_summary: null,
                        learning_goal: null,
                        display_order: 0,
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "vocab_cluster_patterns") {
          return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
        }
        if (table === "vocab_cluster_questions") {
          return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
        }
        if (table === "vocab_answer_events") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  in: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: [], error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        return mockFrom(table);
      }),
    };

    const { loadClusterCatalog } = await import("../clusterLoader");

    const result = await loadClusterCatalog({
      supabase: mockSupabase as any,
      studentId: "user-123",
      pinnedSlugs: new Set(),
    });

    expect(result).toHaveProperty("clusters");
    expect(result).not.toHaveProperty("newlyUnlockedSlugs");
    expect(result.clusters.length).toBeGreaterThan(0);

    for (const cluster of result.clusters) {
      expect(cluster.unlocked).toBe(true);
      expect(cluster.unlocked_at).toBeNull();
    }
  });

  it("loadClusterPageData never returns status locked", async () => {
    const mockCluster = {
      id: "c1",
      slug: "make-do",
      title: "Make vs Do",
      is_recommended: false,
      is_unlockable: true,
      theory_md: null,
      theory_summary: null,
      learning_goal: null,
      display_order: 0,
    };

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "vocab_clusters") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: mockCluster,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "vocab_cluster_patterns") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        if (table === "vocab_cluster_questions") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  in: vi.fn().mockReturnValue({
                    order: vi.fn().mockReturnValue({
                      order: vi.fn().mockResolvedValue({ data: [], error: null }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "vocab_answer_events") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  in: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: [], error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        return { select: vi.fn().mockResolvedValue({ data: null, error: null }) };
      }),
    };

    const { loadClusterPageData } = await import("../clusterLoader");

    const result = await loadClusterPageData({
      supabase: mockSupabase as any,
      studentId: "user-123",
      slug: "make-do",
      limit: 10,
      includeAnswers: false,
    });

    expect(result.status).not.toBe("locked");
    expect(["not_found", "ok"]).toContain(result.status);
  });
});
