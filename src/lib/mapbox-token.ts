const PUBLIC_PREFIX = "pk.";

function normalize(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function isPublicMapboxToken(token: string | null | undefined): token is string {
  if (!token) return false;
  // Any whitespace inside the token means the value is malformed.
  if (/\s/.test(token)) return false;
  return token.startsWith(PUBLIC_PREFIX);
}

export function resolveMapboxPublicTokenFromEnv(): string | null {
  const candidates = [
    normalize(process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN),
    normalize(process.env.NEXT_PUBLIC_MAPBOX_TOKEN),
    normalize(process.env.MAPBOX_ACCESS_TOKEN),
    normalize(process.env.MAPBOX_TOKEN),
  ];
  for (const candidate of candidates) {
    if (isPublicMapboxToken(candidate)) return candidate;
  }
  return null;
}

export function resolveMapboxServerTokenFromEnv(): string | null {
  const candidates = [
    normalize(process.env.MAPBOX_ACCESS_TOKEN),
    normalize(process.env.MAPBOX_TOKEN),
    normalize(process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN),
    normalize(process.env.NEXT_PUBLIC_MAPBOX_TOKEN),
  ];
  for (const candidate of candidates) {
    if (candidate) return candidate;
  }
  return null;
}
