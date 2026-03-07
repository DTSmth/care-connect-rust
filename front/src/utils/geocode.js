/**
 * Geocoding utility.
 *
 * Production: set VITE_GOOGLE_MAPS_API_KEY in your .env file to use the
 * Google Maps Geocoding API (more accurate, higher rate limits).
 *
 * Development / fallback: uses OpenStreetMap Nominatim (free, no key required,
 * max 1 req/sec). Sufficient for coordinator lookups.
 */

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

async function geocodeViaGoogle(zipcode) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(zipcode)}&components=country:US&key=${GOOGLE_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 'OK' || !data.results?.length) return null;
    const loc = data.results[0].geometry.location;
    return { lat: loc.lat, lon: loc.lng };
}

async function geocodeViaNominatim(zipcode) {
    const url = `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(zipcode)}&country=US&format=json&limit=1`;
    const res = await fetch(url, {
        headers: { 'User-Agent': 'CareSchedulingApp/1.0 (capstone project)' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
}

/**
 * Geocode a US zipcode to { lat, lon }.
 * Uses Google Maps API if VITE_GOOGLE_MAPS_API_KEY is set, otherwise Nominatim.
 * Returns null if the zipcode cannot be resolved.
 *
 * @param {string} zipcode
 * @returns {Promise<{lat: number, lon: number} | null>}
 */
export async function geocodeZipcode(zipcode) {
    if (!zipcode || zipcode.trim().length < 3) return null;
    try {
        return GOOGLE_KEY
            ? await geocodeViaGoogle(zipcode.trim())
            : await geocodeViaNominatim(zipcode.trim());
    } catch {
        return null;
    }
}

/**
 * Haversine distance in miles between two lat/lon points.
 * Used on the frontend to display estimated travel distance on match cards.
 */
export function distanceMiles(lat1, lon1, lat2, lon2) {
    const R = 3958.8;
    const toRad = d => d * Math.PI / 180;
    const dlat = toRad(lat2 - lat1);
    const dlon = toRad(lon2 - lon1);
    const a = Math.sin(dlat / 2) ** 2
        + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dlon / 2) ** 2;
    return R * 2 * Math.asin(Math.sqrt(a));
}
