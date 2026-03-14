/**
 * Server-side only. Fetches one image URL by search query from Pexels.
 * Used during demo seeding to attach category-level equipment images to assets.
 * Do not use on the client; PEXELS_API_KEY must stay server-only.
 */

const PEXELS_SEARCH_URL = "https://api.pexels.com/v1/search";
const PER_PAGE = 1;

export type FetchPexelsImageResult = string | null;

/**
 * Fetches a single image URL for the given search query.
 * Returns the first result's source URL or null on failure.
 * Failures are logged but do not throw so seed can continue.
 */
export async function fetchPexelsImage(query: string): Promise<FetchPexelsImageResult> {
  const apiKey = process.env.PEXELS_API_KEY?.trim();
  if (!apiKey) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[Pexels] PEXELS_API_KEY is not set; skipping image fetch for:", query);
    }
    return null;
  }

  const searchParams = new URLSearchParams({
    query: query.trim(),
    per_page: String(PER_PAGE),
    orientation: "landscape",
  });

  try {
    const res = await fetch(`${PEXELS_SEARCH_URL}?${searchParams.toString()}`, {
      method: "GET",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn(`[Pexels] API error ${res.status} for query "${query}":`, text.slice(0, 200));
      return null;
    }

    const data = (await res.json()) as {
      photos?: Array<{ src?: { large?: string; medium?: string; original?: string } }>;
    };
    const photos = data?.photos ?? [];
    const first = photos[0];
    const url =
      first?.src?.large ?? first?.src?.medium ?? first?.src?.original ?? null;
    return url ?? null;
  } catch (err) {
    console.warn("[Pexels] Fetch failed for query:", query, err);
    return null;
  }
}
