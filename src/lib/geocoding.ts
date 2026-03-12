/**
 * Server-side geocoding via Mapbox Geocoding API.
 * Used to resolve address text to coordinates on save when user didn't select a suggestion.
 */

export type GeocodedAddress = {
  address_line1: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
};

type MapboxFeature = {
  place_name?: string;
  center?: [number, number];
  address?: string;
  text?: string;
  context?: Array<{ id: string; text: string }>;
};

type MapboxResponse = {
  features?: MapboxFeature[];
};

function parseContext(context: Array<{ id: string; text: string }> | undefined): {
  region?: string;
  place?: string;
  postcode?: string;
  country?: string;
} {
  const out: { region?: string; place?: string; postcode?: string; country?: string } = {};
  if (!context?.length) return out;
  for (const c of context) {
    const id = c.id?.toLowerCase() ?? "";
    if (id.startsWith("region")) out.region = c.text;
    else if (id.startsWith("place")) out.place = c.text;
    else if (id.startsWith("postcode")) out.postcode = c.text;
    else if (id.startsWith("country")) out.country = c.text;
  }
  return out;
}

/**
 * Forward-geocode an address string and return the first result's components and coordinates.
 * Uses NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN only (same as address autocomplete).
 */
export async function geocodeAddress(addressQuery: string): Promise<GeocodedAddress | null> {
  const token = (process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "").trim();
  if (!token) return null;

  const query = addressQuery.trim();
  if (!query) return null;

  const url = new URL("https://api.mapbox.com/geocoding/v5/mapbox.places/" + encodeURIComponent(query) + ".json");
  url.searchParams.set("access_token", token);
  url.searchParams.set("types", "address,place");
  url.searchParams.set("limit", "1");

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) return null;

  const data = (await res.json()) as MapboxResponse;
  const feature = data.features?.[0];
  if (!feature?.center?.length) return null;

  const [longitude, latitude] = feature.center;
  const ctx = parseContext(feature.context);
  const addressLine1 =
    ([feature.address, feature.text].filter(Boolean).join(" ").trim() || feature.place_name?.split(",")[0]?.trim()) ?? null;

  return {
    address_line1: addressLine1 || null,
    city: ctx.place ?? null,
    state: ctx.region ?? null,
    postal_code: ctx.postcode ?? null,
    country: ctx.country ?? null,
    latitude,
    longitude,
  };
}
