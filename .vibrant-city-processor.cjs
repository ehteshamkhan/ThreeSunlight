'use strict';

const fs = require('fs');
const path = require('path');

const source = process.argv[2];
const outputDir = process.argv[3];

if (!source || !outputDir) {
    console.error('Usage: node processor.cjs source.json outputDir');
    process.exit(2);
}

function number(v) {
    if (typeof v === 'number' && Number.isFinite(v)) return v;

    if (typeof v === 'string') {
        const n = Number(v.trim());
        if (Number.isFinite(n)) return n;
    }

    return null;
}

function get(obj, names) {
    for (const name of names) {
        if (obj && Object.prototype.hasOwnProperty.call(obj, name)) {
            const n = number(obj[name]);
            if (n !== null) return n;
        }
    }

    return null;
}

function vector3(value) {
    if (Array.isArray(value) && value.length >= 3) {
        const x = number(value[0]);
        const y = number(value[1]);
        const z = number(value[2]);

        if ([x, y, z].every(v => v !== null)) {
            return { x, y, z };
        }
    }

    if (value && typeof value === 'object') {
        const x = get(value, ['x', 'X', 'px', 'cx']);
        const y = get(value, ['y', 'Y', 'py', 'cy']);
        const z = get(value, ['z', 'Z', 'pz', 'cz']);

        if ([x, y, z].every(v => v !== null)) {
            return { x, y, z };
        }
    }

    return null;
}

function readVector(obj, names) {
    for (const name of names) {
        if (!obj || !Object.prototype.hasOwnProperty.call(obj, name)) continue;

        const v = vector3(obj[name]);

        if (v) return v;
    }

    return null;
}

function readDimension(obj, axis, aliases) {
    const value = get(obj, aliases);

    if (value !== null && Math.abs(value) > 0) {
        return Math.abs(value);
    }

    return null;
}

function looksBuildingLike(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
        return false;
    }

    const position =
        readVector(obj, [
            'position',
            'Position',
            'pos',
            'center',
            'Center',
            'location',
            'origin',
            'coordinates'
        ]);

    const size =
        readVector(obj, [
            'size',
            'Size',
            'dimensions',
            'dimension',
            'extent',
            'scale'
        ]);

    const x = get(obj, ['x', 'X', 'posX', 'centerX', 'positionX']);
    const z = get(obj, ['z', 'Z', 'posZ', 'centerZ', 'positionZ']);

    const width = readDimension(obj, 'x', [
        'width',
        'Width',
        'w',
        'W',
        'sizeX',
        'widthX',
        'footprintX'
    ]);

    const depth = readDimension(obj, 'z', [
        'depth',
        'Depth',
        'd',
        'D',
        'sizeZ',
        'depthZ',
        'footprintZ'
    ]);

    const height = readDimension(obj, 'y', [
        'height',
        'Height',
        'h',
        'H',
        'sizeY',
        'heightY',
        'buildingHeight',
        'elevation'
    ]);

    const hasPosition =
        !!position ||
        (x !== null && z !== null);

    const hasSize =
        !!size ||
        (width !== null && depth !== null);

    const hasHeight =
        height !== null ||
        !!size;

    if (!hasPosition) return false;

    if (!hasSize && !hasHeight) return false;

    return true;
}

function normalizeBuilding(obj, index) {

    let position =
        readVector(obj, [
            'position',
            'Position',
            'pos',
            'center',
            'Center',
            'location',
            'origin',
            'coordinates'
        ]);

    if (!position) {
        const x = get(obj, ['x', 'X', 'posX', 'centerX', 'positionX']);
        const y = get(obj, ['y', 'Y', 'posY', 'centerY', 'positionY']) ?? 0;
        const z = get(obj, ['z', 'Z', 'posZ', 'centerZ', 'positionZ']);

        if (x !== null && z !== null) {
            position = { x, y, z };
        }
    }

    if (!position) return null;

    let size =
        readVector(obj, [
            'size',
            'Size',
            'dimensions',
            'dimension',
            'extent',
            'scale'
        ]);

    let width = null;
    let height = null;
    let depth = null;

    if (size) {
        width = Math.abs(size.x);
        height = Math.abs(size.y);
        depth = Math.abs(size.z);
    }

    width ??= readDimension(obj, 'x', [
        'width',
        'Width',
        'w',
        'W',
        'sizeX',
        'widthX',
        'footprintX'
    ]);

    height ??= readDimension(obj, 'y', [
        'height',
        'Height',
        'h',
        'H',
        'sizeY',
        'heightY',
        'buildingHeight',
        'elevation'
    ]);

    depth ??= readDimension(obj, 'z', [
        'depth',
        'Depth',
        'd',
        'D',
        'sizeZ',
        'depthZ',
        'footprintZ'
    ]);

    /*
     * Some source records use a radius / footprint instead of
     * width/depth. Handle those as well.
     */
    if (width === null) {
        const radius = get(obj, ['radius', 'Radius']);

        if (radius !== null) {
            width = Math.abs(radius * 2);
        }
    }

    if (depth === null) {
        const radius = get(obj, ['radius', 'Radius']);

        if (radius !== null) {
            depth = Math.abs(radius * 2);
        }
    }

    /*
     * If only height exists, use a conservative footprint.
     */
    if (width === null) width = 4;
    if (depth === null) depth = 4;
    if (height === null) height = 8;

    width = Math.max(0.5, Math.min(Math.abs(width), 250));
    depth = Math.max(0.5, Math.min(Math.abs(depth), 250));
    height = Math.max(1, Math.min(Math.abs(height), 1000));

    if (
        !Number.isFinite(position.x) ||
        !Number.isFinite(position.y) ||
        !Number.isFinite(position.z)
    ) {
        return null;
    }

    /*
     * Avoid treating giant scene-level records as buildings.
     */
    if (width > 500 || depth > 500 || height > 3000) {
        return null;
    }

    const text =
        obj.title ??
        obj.name ??
        obj.label ??
        obj.text ??
        obj.id ??
        '';

    return {
        index,
        x: position.x,
        y: position.y,
        z: position.z,
        width,
        height,
        depth,
        text: typeof text === 'string'
            ? text.slice(0, 500)
            : String(text).slice(0, 500)
    };
}

const raw = fs.readFileSync(source, 'utf8');

console.log('Reading source JSON...');
console.log(`Characters: ${raw.length}`);

console.log('Parsing JSON...');
let data;

try {
    data = JSON.parse(raw);
} catch (err) {
    console.error('JSON parse failed:');
    console.error(err.message);
    process.exit(3);
}

console.log('Discovering building records...');

const records = [];
const seen = new WeakSet();

function walk(value, depth = 0) {

    if (depth > 80) return;

    if (!value || typeof value !== 'object') {
        return;
    }

    if (seen.has(value)) {
        return;
    }

    seen.add(value);

    if (!Array.isArray(value)) {

        if (looksBuildingLike(value)) {
            const building = normalizeBuilding(value, records.length);

            if (building) {
                records.push(building);
            }
        }
    }

    if (Array.isArray(value)) {

        for (const item of value) {
            walk(item, depth + 1);
        }

        return;
    }

    for (const key of Object.keys(value)) {

        const child = value[key];

        if (
            child &&
            typeof child === 'object'
        ) {
            walk(child, depth + 1);
        }
    }
}

walk(data);

console.log(`Candidate buildings: ${records.length}`);

if (records.length === 0) {

    /*
     * Diagnostic pass. Print the most useful object keys found
     * near the top of the source. This makes future schema changes
     * much easier to diagnose.
     */

    const keyCounts = new Map();

    function collectKeys(value, depth = 0) {

        if (!value || typeof value !== 'object') return;
        if (depth > 8) return;

        if (Array.isArray(value)) {

            for (let i = 0; i < Math.min(value.length, 1000); i++) {
                collectKeys(value[i], depth + 1);
            }

            return;
        }

        for (const key of Object.keys(value)) {

            keyCounts.set(
                key,
                (keyCounts.get(key) || 0) + 1
            );

            collectKeys(value[key], depth + 1);
        }
    }

    collectKeys(data);

    console.error('');
    console.error('No building records were discovered.');
    console.error('');
    console.error('Most common discovered keys:');

    const sortedKeys = [...keyCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 80);

    for (const [key, count] of sortedKeys) {
        console.error(`  ${key}: ${count}`);
    }

    process.exit(4);
}

console.log(`Unique buildings: ${records.length}`);

const chunkSize = 180;

const minX = Math.min(...records.map(b => b.x));
const maxX = Math.max(...records.map(b => b.x));
const minZ = Math.min(...records.map(b => b.z));
const maxZ = Math.max(...records.map(b => b.z));

const rangeX = Math.max(1, maxX - minX);
const rangeZ = Math.max(1, maxZ - minZ);

const targetChunkCount = Math.max(
    16,
    Math.ceil(Math.sqrt(records.length / 100))
);

const worldChunkSize = Math.max(
    50,
    Math.max(rangeX, rangeZ) / targetChunkCount
);

console.log(`World bounds X: ${minX} -> ${maxX}`);
console.log(`World bounds Z: ${minZ} -> ${maxZ}`);
console.log(`Chunk size: ${worldChunkSize}`);

fs.mkdirSync(outputDir, { recursive: true });

const chunks = new Map();

for (const building of records) {

    const cx = Math.floor(
        (building.x - minX) / worldChunkSize
    );

    const cz = Math.floor(
        (building.z - minZ) / worldChunkSize
    );

    const key = `${cx}_${cz}`;

    if (!chunks.has(key)) {
        chunks.set(key, []);
    }

    chunks.get(key).push(building);
}

const manifest = {
    version: 1,
    buildingCount: records.length,
    minX,
    maxX,
    minZ,
    maxZ,
    chunkSize: worldChunkSize,
    chunks: []
};

for (const [key, buildings] of chunks.entries()) {

    const safeKey = key.replace(/[^0-9_-]/g, '_');

    const fileName = `chunk-${safeKey}.json`;

    const filePath = path.join(
        outputDir,
        fileName
    );

    fs.writeFileSync(
        filePath,
        JSON.stringify(buildings),
        'utf8'
    );

    const [cx, cz] = key.split('_').map(Number);

    manifest.chunks.push({
        key,
        cx,
        cz,
        count: buildings.length,
        file: `/data/city-chunks/${fileName}`
    });
}

manifest.chunks.sort((a, b) =>
    a.key.localeCompare(b.key)
);

const manifestPath = path.join(
    outputDir,
    'manifest.json'
);

fs.writeFileSync(
    manifestPath,
    JSON.stringify(manifest),
    'utf8'
);

console.log(`Chunks created: ${manifest.chunks.length}`);
console.log(`Buildings written: ${records.length}`);
console.log(`Manifest: ${manifestPath}`);

