import type { OsmMosqueCandidate } from '../../types/mosque';

const CACHE_KEY = 'awqaf_qarabulli_osm_mosques_v1';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

// Bounding box covering Al-Qarabulli and surrounding areas
const QARABULLI_BBOX = '32.60,14.10,32.88,14.50';

const OVERPASS_QUERY = `
[out:json][timeout:15];
(
  node["amenity"="place_of_worship"]["religion"="muslim"](${QARABULLI_BBOX});
  way["amenity"="place_of_worship"]["religion"="muslim"](${QARABULLI_BBOX});
  node["amenity"="place_of_worship"]["name"~"مسجد|جامع|Mosque",i](${QARABULLI_BBOX});
  way["amenity"="place_of_worship"]["name"~"مسجد|جامع|Mosque",i](${QARABULLI_BBOX});
);
out center;
`;

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function readCached(): { items: OsmMosqueCandidate[]; fresh: boolean } {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return { items: [], fresh: false };
    const parsed = JSON.parse(raw) as { ts: number; items: OsmMosqueCandidate[] };
    if (!Array.isArray(parsed.items)) return { items: [], fresh: false };
    return {
      items: parsed.items,
      fresh: Date.now() - parsed.ts < CACHE_TTL_MS,
    };
  } catch {
    return { items: [], fresh: false };
  }
}

function writeCache(items: OsmMosqueCandidate[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), items }));
  } catch {
    // ignore storage quota errors
  }
}

export async function fetchQarabulliOsmMosques(): Promise<OsmMosqueCandidate[]> {
  const cached = readCached();
  if (cached.fresh && cached.items.length > 0) {
    return cached.items;
  }

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        body: `data=${encodeURIComponent(OVERPASS_QUERY)}`,
      });
      if (!res.ok) continue;
      const json = (await res.json()) as { elements?: OverpassElement[] };
      const elements = json.elements ?? [];

      const seen = new Set<string>();
      const results: OsmMosqueCandidate[] = [];

      for (const el of elements) {
        const lat = el.lat ?? el.center?.lat;
        const lng = el.lon ?? el.center?.lon;
        if (typeof lat !== 'number' || typeof lng !== 'number') continue;

        const osmId = `${el.type}_${el.id}`;
        if (seen.has(osmId)) continue;
        seen.add(osmId);

        const tags = el.tags ?? {};
        const name =
          tags['name:ar'] ||
          tags.name ||
          tags['alt_name:ar'] ||
          tags.alt_name ||
          'مسجد مسجّل على الخريطة';

        results.push({ osmId, name, lat, lng });
      }

      writeCache(results);
      return results;
    } catch {
      // try next Overpass mirror
    }
  }

  return cached.items;
}
