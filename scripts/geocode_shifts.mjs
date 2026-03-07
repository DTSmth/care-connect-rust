/**
 * One-time script: geocode all shifts that are missing location_lat/location_lon.
 * Uses Nominatim (OSM, free, no API key). Rate-limited to 1 req/sec per Nominatim ToS.
 *
 * Usage: node scripts/geocode_shifts.mjs
 */

import pkg from 'pg';
const { Client } = pkg;

const DB = {
    host: 'localhost',
    port: 5432,
    database: 'capstone_db',
    user: 'capstone_user',
    password: 'capstone_password',
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function geocodeZipcode(zipcode) {
    const url = `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(zipcode)}&country=US&format=json&limit=1`;
    const res = await fetch(url, {
        headers: { 'User-Agent': 'CareSchedulingApp/1.0 (capstone geocode script)' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
}

async function main() {
    const client = new Client(DB);
    await client.connect();
    console.log('Connected to DB');

    const { rows } = await client.query(
        'SELECT shift_id, zipcode FROM shift WHERE location_lat IS NULL AND zipcode IS NOT NULL'
    );

    console.log(`Found ${rows.length} shift(s) needing geocoding`);

    // Deduplicate zipcodes so we don't hammer Nominatim for repeats
    const zipMap = new Map();
    for (const row of rows) {
        if (!zipMap.has(row.zipcode)) zipMap.set(row.zipcode, null);
    }

    console.log(`Geocoding ${zipMap.size} unique zipcode(s)...`);
    for (const zip of zipMap.keys()) {
        const coords = await geocodeZipcode(zip);
        zipMap.set(zip, coords);
        if (coords) {
            console.log(`  ${zip} → lat=${coords.lat.toFixed(5)}, lon=${coords.lon.toFixed(5)}`);
        } else {
            console.warn(`  ${zip} → NOT FOUND`);
        }
        await sleep(1100); // 1 req/sec per Nominatim ToS
    }

    let updated = 0;
    for (const row of rows) {
        const coords = zipMap.get(row.zipcode);
        if (!coords) continue;
        await client.query(
            'UPDATE shift SET location_lat = $1, location_lon = $2 WHERE shift_id = $3',
            [coords.lat, coords.lon, row.shift_id]
        );
        updated++;
    }

    await client.end();
    console.log(`\nDone. Updated ${updated}/${rows.length} shifts.`);
}

main().catch(err => { console.error(err); process.exit(1); });
