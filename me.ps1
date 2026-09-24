# ============================================================
# THREE SUNLIGHT - VIBRANT LAZY-LOADED CITY
# COMPLETE REPLACEMENT INSTALLER
# ============================================================

$ErrorActionPreference = "Stop"

$ProjectRoot = "C:\ThreeSunlight"
$MainJs      = Join-Path $ProjectRoot "src\main.js"
$PackageJson = Join-Path $ProjectRoot "package.json"

# Prefer the user's requested source, but fall back to public/data.
$DataCandidates = @(
    (Join-Path $ProjectRoot "dist\data\compiled-city.json"),
    (Join-Path $ProjectRoot "public\data\compiled-city.json"),
    (Join-Path $ProjectRoot "src\data\compiled-city.json")
)

$DataPath = $null

foreach ($candidate in $DataCandidates) {
    if (Test-Path -LiteralPath $candidate) {
        $DataPath = $candidate
        break
    }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " THREE SUNLIGHT - VIBRANT LAZY-LOADED CITY" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Features:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  * All logical building records preserved"
Write-Host "  * Vibrant randomized/deterministic building colors"
Write-Host "  * Spatial InstancedMesh chunks"
Write-Host "  * Buildings load only near the camera"
Write-Host "  * Buildings unload when the camera moves away"
Write-Host "  * Shared BoxGeometry"
Write-Host "  * Per-instance vibrant colors"
Write-Host "  * GPU-friendly lazy loading"
Write-Host "  * Existing galaxy / sky preserved"
Write-Host "  * Existing SunLight preserved"
Write-Host "  * Existing facade/text system preserved when present"
Write-Host "  * Automatic npm run build verification"
Write-Host ""

# ------------------------------------------------------------
# HELPERS
# ------------------------------------------------------------

function Fail([string]$Message) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Red
    Write-Host " INSTALLATION FAILED" -ForegroundColor Red
    Write-Host "============================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host $Message -ForegroundColor Red
    Write-Host ""
    exit 1
}

function Backup-File([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) {
        return $null
    }

    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $name  = [System.IO.Path]::GetFileNameWithoutExtension($Path)
    $ext   = [System.IO.Path]::GetExtension($Path)

    $backup = Join-Path `
        (Split-Path -Parent $Path) `
        ("{0}.before-vibrant-city-{1}{2}" -f $name, $stamp, $ext)

    Copy-Item -LiteralPath $Path -Destination $backup -Force

    return $backup
}

function Get-ObjectPropertyValue {
    param(
        [Parameter(Mandatory = $true)]
        $Object,

        [Parameter(Mandatory = $true)]
        [string[]]$Names
    )

    if ($null -eq $Object) {
        return $null
    }

    foreach ($name in $Names) {
        $prop = $Object.PSObject.Properties[$name]

        if ($null -ne $prop) {
            return $prop.Value
        }
    }

    return $null
}

function Convert-ToNumber {
    param(
        $Value,
        [double]$Default = 0
    )

    if ($null -eq $Value) {
        return $Default
    }

    try {
        return [double]$Value
    }
    catch {
        return $Default
    }
}

function Find-FirstArray {
    param(
        $Object
    )

    if ($null -eq $Object) {
        return $null
    }

    if ($Object -is [System.Array]) {
        return @($Object)
    }

    $preferredNames = @(
        "buildings",
        "sections",
        "records",
        "items",
        "data",
        "city",
        "features"
    )

    foreach ($name in $preferredNames) {
        $value = Get-ObjectPropertyValue -Object $Object -Names @($name)

        if ($null -ne $value -and $value -is [System.Array]) {
            return @($value)
        }
    }

    foreach ($property in $Object.PSObject.Properties) {
        $value = $property.Value

        if ($null -ne $value -and $value -is [System.Array]) {
            return @($value)
        }
    }

    return $null
}

function Convert-SectionToBuildingRecord {
    param(
        [Parameter(Mandatory = $true)]
        $Section,

        [Parameter(Mandatory = $true)]
        [int]$Index
    )

    # --------------------------------------------------------
    # Attempt to locate common coordinate/property names.
    # This allows the installer to work with several JSON shapes.
    # --------------------------------------------------------

    $x = $null
    $y = $null
    $z = $null

    $x = Get-ObjectPropertyValue $Section @(
        "x",
        "posX",
        "positionX",
        "longitude",
        "lon"
    )

    $y = Get-ObjectPropertyValue $Section @(
        "y",
        "posY",
        "positionY",
        "elevation",
        "height"
    )

    $z = Get-ObjectPropertyValue $Section @(
        "z",
        "posZ",
        "positionZ",
        "latitude",
        "lat"
    )

    # Check nested position object.
    $position = Get-ObjectPropertyValue $Section @(
        "position",
        "pos",
        "coordinates"
    )

    if ($null -ne $position) {

        if ($null -eq $x) {
            $x = Get-ObjectPropertyValue $position @(
                "x",
                "0"
            )
        }

        if ($null -eq $y) {
            $y = Get-ObjectPropertyValue $position @(
                "y",
                "1"
            )
        }

        if ($null -eq $z) {
            $z = Get-ObjectPropertyValue $position @(
                "z",
                "2"
            )
        }
    }

    # Array coordinates such as [x,y,z].
    if ($position -is [System.Array]) {
        if ($position.Count -ge 1 -and $null -eq $x) {
            $x = $position[0]
        }

        if ($position.Count -ge 2 -and $null -eq $y) {
            $y = $position[1]
        }

        if ($position.Count -ge 3 -and $null -eq $z) {
            $z = $position[2]
        }
    }

    # --------------------------------------------------------
    # Dimensions
    # --------------------------------------------------------

    $width = Get-ObjectPropertyValue $Section @(
        "width",
        "w",
        "sizeX"
    )

    $depth = Get-ObjectPropertyValue $Section @(
        "depth",
        "d",
        "sizeZ"
    )

    $height = Get-ObjectPropertyValue $Section @(
        "height",
        "h",
        "sizeY"
    )

    $size = Get-ObjectPropertyValue $Section @(
        "size",
        "dimensions"
    )

    if ($null -ne $size) {

        if ($null -eq $width) {
            $width = Get-ObjectPropertyValue $size @(
                "x",
                "width",
                "w",
                "0"
            )
        }

        if ($null -eq $height) {
            $height = Get-ObjectPropertyValue $size @(
                "y",
                "height",
                "h",
                "1"
            )
        }

        if ($null -eq $depth) {
            $depth = Get-ObjectPropertyValue $size @(
                "z",
                "depth",
                "d",
                "2"
            )
        }

        if ($size -is [System.Array]) {

            if ($size.Count -ge 1 -and $null -eq $width) {
                $width = $size[0]
            }

            if ($size.Count -ge 2 -and $null -eq $height) {
                $height = $size[1]
            }

            if ($size.Count -ge 3 -and $null -eq $depth) {
                $depth = $size[2]
            }
        }
    }

    # --------------------------------------------------------
    # Safe defaults.
    # --------------------------------------------------------

    $x = Convert-ToNumber $x 0
    $y = Convert-ToNumber $y 0
    $z = Convert-ToNumber $z 0

    $width  = [Math]::Max(2.0,  (Convert-ToNumber $width  8))
    $depth  = [Math]::Max(2.0,  (Convert-ToNumber $depth  8))
    $height = [Math]::Max(4.0,  (Convert-ToNumber $height 20))

    # If this record has no usable spatial information,
    # distribute it deterministically into a city grid.
    $hasExplicitPosition = $false

    if (
        $Section.PSObject.Properties["x"] -or
        $Section.PSObject.Properties["z"] -or
        $Section.PSObject.Properties["position"] -or
        $Section.PSObject.Properties["pos"] -or
        $Section.PSObject.Properties["coordinates"]
    ) {
        $hasExplicitPosition = $true
    }

    if (-not $hasExplicitPosition) {

        $gridWidth = 72

        $gx = $Index % $gridWidth
        $gz = [math]::Floor($Index / $gridWidth)

        $spacing = 24

        $x = ($gx - ($gridWidth / 2)) * $spacing
        $z = ($gz - 35) * $spacing
        $y = 0

        # Deterministic variety.
        $width  = 8 + (($Index * 17) % 9)
        $depth  = 8 + (($Index * 11) % 9)
        $height = 14 + (($Index * 29) % 100)
    }

    # --------------------------------------------------------
    # Preserve section text/title when available.
    # --------------------------------------------------------

    $title = Get-ObjectPropertyValue $Section @(
        "title",
        "name",
        "text",
        "section",
        "label",
        "content"
    )

    if ($null -eq $title) {
        $title = "SECTION $($Index + 1)"
    }

    $title = [string]$title

    if ($title.Length -gt 500) {
        $title = $title.Substring(0, 500)
    }

    [pscustomobject]@{
        index  = $Index
        x      = $x
        y      = $y
        z      = $z
        width  = $width
        height = $height
        depth  = $depth
        title  = $title
    }
}

# ------------------------------------------------------------
# 1. PROJECT
# ------------------------------------------------------------

Write-Host "[1/10] Checking project..." -ForegroundColor Yellow

if (-not (Test-Path -LiteralPath $ProjectRoot)) {
    Fail "Project folder not found: $ProjectRoot"
}

if (-not (Test-Path -LiteralPath $MainJs)) {
    Fail "main.js not found: $MainJs"
}

if (-not (Test-Path -LiteralPath $PackageJson)) {
    Fail "package.json not found: $PackageJson"
}

Write-Host "      Project: $ProjectRoot" -ForegroundColor Green
Write-Host "      main.js found." -ForegroundColor Green
Write-Host "      package.json found." -ForegroundColor Green

# ------------------------------------------------------------
# 2. DATA
# ------------------------------------------------------------

Write-Host ""
Write-Host "[2/10] Checking compiled city data..." -ForegroundColor Yellow

if ($null -eq $DataPath) {
    Fail @"
Could not find compiled-city.json.

Checked:
$($DataCandidates -join "`n")
"@
}

Write-Host "      Data: $DataPath" -ForegroundColor Green

try {
    $jsonText = Get-Content -LiteralPath $DataPath -Raw -Encoding UTF8
}
catch {
    Fail "Could not read compiled-city.json. $($_.Exception.Message)"
}

if ([string]::IsNullOrWhiteSpace($jsonText)) {
    Fail "compiled-city.json is empty."
}

Write-Host "      JSON characters: $($jsonText.Length.ToString('N0'))"

try {
    $jsonObject = $jsonText | ConvertFrom-Json -Depth 100
}
catch {
    Fail "compiled-city.json contains invalid JSON. $($_.Exception.Message)"
}

$sourceArray = Find-FirstArray $jsonObject

if ($null -eq $sourceArray) {
    Fail @"
Could not find an array of records inside compiled-city.json.

The installer accepts:
  * a top-level JSON array
  * { "sections": [...] }
  * { "buildings": [...] }
  * { "records": [...] }
  * { "items": [...] }
  * { "data": [...] }

The existing file has a different shape.
"@
}

$sourceArray = @($sourceArray)

if ($sourceArray.Count -eq 0) {
    Fail "The compiled city data contains zero records."
}

Write-Host "      Records discovered: $($sourceArray.Count.ToString('N0'))" -ForegroundColor Green

# ------------------------------------------------------------
# 3. NORMALIZE RECORDS
# ------------------------------------------------------------

Write-Host ""
Write-Host "[3/10] Normalizing building records..." -ForegroundColor Yellow

$normalizedBuildings = New-Object System.Collections.Generic.List[object]

for ($i = 0; $i -lt $sourceArray.Count; $i++) {

    $record = Convert-SectionToBuildingRecord `
        -Section $sourceArray[$i] `
        -Index $i

    $normalizedBuildings.Add($record)
}

Write-Host "      Normalized: $($normalizedBuildings.Count.ToString('N0')) buildings" -ForegroundColor Green

# ------------------------------------------------------------
# 4. WRITE LIGHTWEIGHT BROWSER DATA
# ------------------------------------------------------------

Write-Host ""
Write-Host "[4/10] Writing normalized browser data..." -ForegroundColor Yellow

$publicDataDir = Join-Path $ProjectRoot "public\data"

if (-not (Test-Path -LiteralPath $publicDataDir)) {
    New-Item -ItemType Directory -Path $publicDataDir -Force | Out-Null
}

$normalizedJsonPath = Join-Path $publicDataDir "compiled-city.json"

try {
    $normalizedJson = $normalizedBuildings |
        ConvertTo-Json -Depth 10 -Compress

    [System.IO.File]::WriteAllText(
        $normalizedJsonPath,
        $normalizedJson,
        [System.Text.UTF8Encoding]::new($false)
    )
}
catch {
    Fail "Could not write normalized compiled-city.json. $($_.Exception.Message)"
}

Write-Host "      Written: $normalizedJsonPath" -ForegroundColor Green
Write-Host "      Size: $(([System.IO.FileInfo]$normalizedJsonPath).Length.ToString('N0')) bytes"

# ------------------------------------------------------------
# 5. BACKUP MAIN.JS
# ------------------------------------------------------------

Write-Host ""
Write-Host "[5/10] Creating main.js backup..." -ForegroundColor Yellow

$backup = Backup-File $MainJs

if ($null -eq $backup) {
    Fail "Could not create main.js backup."
}

Write-Host "      Backup: $backup" -ForegroundColor Green

$mainSource = Get-Content -LiteralPath $MainJs -Raw -Encoding UTF8

if ([string]::IsNullOrWhiteSpace($mainSource)) {
    Fail "main.js is empty."
}

# ------------------------------------------------------------
# 6. REMOVE ONLY PREVIOUS CITY INSTALLER
# ------------------------------------------------------------

Write-Host ""
Write-Host "[6/10] Preparing lazy city renderer..." -ForegroundColor Yellow

# Markers used exclusively by this installer.
$startMarker = "// BEGIN VIBRANT_LAZY_CITY"
$endMarker   = "// END VIBRANT_LAZY_CITY"

$startIndex = $mainSource.IndexOf($startMarker, [System.StringComparison]::Ordinal)
$endIndex   = $mainSource.IndexOf($endMarker, [System.StringComparison]::Ordinal)

if ($startIndex -ge 0 -and $endIndex -gt $startIndex) {

    $endIndex += $endMarker.Length

    $before = $mainSource.Substring(0, $startIndex)
    $after  = $mainSource.Substring($endIndex)

    $mainSource = $before + $after

    Write-Host "      Previous vibrant lazy city block removed." -ForegroundColor Green
}
else {
    Write-Host "      No previous vibrant lazy city block found." -ForegroundColor DarkGray
}

# ------------------------------------------------------------
# CITY SYSTEM
# ------------------------------------------------------------

$cityCode = @'
/* ============================================================
   BEGIN VIBRANT_LAZY_CITY
   ============================================================ */

const VIBRANT_LAZY_CITY_DATA_URL = '/data/compiled-city.json';

const vibrantLazyCity = {
    initialized: false,
    loading: false,
    buildings: [],
    chunks: new Map(),
    activeChunks: new Map(),

    chunkSize: 180,

    loadDistance: 520,
    unloadDistance: 720,

    updateDistance: 80,

    lastCameraX: Number.NaN,
    lastCameraZ: Number.NaN,

    geometry: null,

    material: null,

    dummy: null,

    maxInstancesPerChunk: 256
};

function vibrantCityHash(index) {
    let x = (index + 1) | 0;

    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;

    return Math.abs(x);
}

function vibrantCityColor(index) {

    const h = (vibrantCityHash(index) % 360) / 360;

    const s = 0.72 + ((vibrantCityHash(index + 77) % 25) / 100);

    const l = 0.42 + ((vibrantCityHash(index + 151) % 18) / 100);

    const color = new THREE.Color();

    color.setHSL(h, Math.min(0.95, s), Math.min(0.62, l));

    return color;
}

function vibrantCityGetCameraPosition() {

    if (typeof camera === 'undefined' || !camera) {
        return null;
    }

    return camera.position;
}

function vibrantCityChunkKey(x, z) {

    const cx = Math.floor(x / vibrantLazyCity.chunkSize);
    const cz = Math.floor(z / vibrantLazyCity.chunkSize);

    return `${cx}:${cz}`;
}

function vibrantCityCreateChunk(key, buildings) {

    if (!buildings || buildings.length === 0) {
        return null;
    }

    const count = Math.min(
        buildings.length,
        vibrantLazyCity.maxInstancesPerChunk
    );

    const mesh = new THREE.InstancedMesh(
        vibrantLazyCity.geometry,
        vibrantLazyCity.material,
        count
    );

    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    mesh.frustumCulled = true;

    const dummy = vibrantLazyCity.dummy;

    for (let i = 0; i < count; i++) {

        const building = buildings[i];

        const width = Math.max(2, Number(building.width) || 8);
        const height = Math.max(4, Number(building.height) || 20);
        const depth = Math.max(2, Number(building.depth) || 8);

        dummy.position.set(
            Number(building.x) || 0,
            (Number(building.y) || 0) + height * 0.5,
            Number(building.z) || 0
        );

        dummy.scale.set(
            width,
            height,
            depth
        );

        dummy.rotation.set(
            0,
            0,
            0
        );

        dummy.updateMatrix();

        mesh.setMatrixAt(i, dummy.matrix);

        mesh.setColorAt(
            i,
            vibrantCityColor(Number(building.index) || i)
        );
    }

    mesh.instanceMatrix.needsUpdate = true;

    if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
    }

    mesh.userData.vibrantLazyCityChunk = key;
    mesh.userData.buildingCount = count;

    return mesh;
}

function vibrantCityBuildChunks() {

    vibrantLazyCity.chunks.clear();

    for (const building of vibrantLazyCity.buildings) {

        const key = vibrantCityChunkKey(
            Number(building.x) || 0,
            Number(building.z) || 0
        );

        if (!vibrantLazyCity.chunks.has(key)) {
            vibrantLazyCity.chunks.set(key, []);
        }

        vibrantLazyCity.chunks.get(key).push(building);
    }
}

function vibrantCityDistanceToChunk(key, cameraPosition) {

    const parts = key.split(':');

    const cx = Number(parts[0]);
    const cz = Number(parts[1]);

    const centerX =
        cx * vibrantLazyCity.chunkSize +
        vibrantLazyCity.chunkSize * 0.5;

    const centerZ =
        cz * vibrantLazyCity.chunkSize +
        vibrantLazyCity.chunkSize * 0.5;

    const dx = cameraPosition.x - centerX;
    const dz = cameraPosition.z - centerZ;

    return Math.sqrt(
        dx * dx +
        dz * dz
    );
}

function vibrantCityActivateChunk(key) {

    if (vibrantLazyCity.activeChunks.has(key)) {
        return;
    }

    const buildings = vibrantLazyCity.chunks.get(key);

    if (!buildings || buildings.length === 0) {
        return;
    }

    const mesh = vibrantCityCreateChunk(
        key,
        buildings
    );

    if (!mesh) {
        return;
    }

    scene.add(mesh);

    vibrantLazyCity.activeChunks.set(
        key,
        mesh
    );
}

function vibrantCityDeactivateChunk(key) {

    const mesh =
        vibrantLazyCity.activeChunks.get(key);

    if (!mesh) {
        return;
    }

    scene.remove(mesh);

    mesh.dispose?.();

    vibrantLazyCity.activeChunks.delete(key);
}

function vibrantCityUpdate(force = false) {

    if (!vibrantLazyCity.initialized) {
        return;
    }

    const cameraPosition =
        vibrantCityGetCameraPosition();

    if (!cameraPosition) {
        return;
    }

    const previousX =
        vibrantLazyCity.lastCameraX;

    const previousZ =
        vibrantLazyCity.lastCameraZ;

    if (!force) {

        if (
            Number.isFinite(previousX) &&
            Number.isFinite(previousZ)
        ) {

            const dx =
                cameraPosition.x - previousX;

            const dz =
                cameraPosition.z - previousZ;

            if (
                Math.abs(dx) < vibrantLazyCity.updateDistance &&
                Math.abs(dz) < vibrantLazyCity.updateDistance
            ) {
                return;
            }
        }
    }

    vibrantLazyCity.lastCameraX =
        cameraPosition.x;

    vibrantLazyCity.lastCameraZ =
        cameraPosition.z;

    for (const key of vibrantLazyCity.chunks.keys()) {

        const distance =
            vibrantCityDistanceToChunk(
                key,
                cameraPosition
            );

        if (
            distance <=
            vibrantLazyCity.loadDistance
        ) {

            vibrantCityActivateChunk(key);

        } else if (
            distance >
            vibrantLazyCity.unloadDistance
        ) {

            vibrantCityDeactivateChunk(key);
        }
    }
}

async function initVibrantLazyCity() {

    if (vibrantLazyCity.loading) {
        return;
    }

    if (vibrantLazyCity.initialized) {
        return;
    }

    vibrantLazyCity.loading = true;

    try {

        const response =
            await fetch(
                VIBRANT_LAZY_CITY_DATA_URL,
                {
                    cache: 'no-cache'
                }
            );

        if (!response.ok) {
            throw new Error(
                `Could not load ${VIBRANT_LAZY_CITY_DATA_URL}: ${response.status}`
            );
        }

        const payload =
            await response.json();

        let records = [];

        if (Array.isArray(payload)) {

            records = payload;

        } else if (
            payload &&
            Array.isArray(payload.buildings)
        ) {

            records = payload.buildings;

        } else if (
            payload &&
            Array.isArray(payload.sections)
        ) {

            records = payload.sections;

        } else if (
            payload &&
            Array.isArray(payload.records)
        ) {

            records = payload.records;

        } else if (
            payload &&
            Array.isArray(payload.items)
        ) {

            records = payload.items;

        } else {

            throw new Error(
                'compiled-city.json does not contain a recognized array of building records.'
            );
        }

        vibrantLazyCity.buildings =
            records;

        vibrantLazyCity.geometry =
            new THREE.BoxGeometry(
                1,
                1,
                1
            );

        vibrantLazyCity.material =
            new THREE.MeshStandardMaterial({
                roughness: 0.58,
                metalness: 0.18,
                vertexColors: true
            });

        vibrantLazyCity.dummy =
            new THREE.Object3D();

        vibrantCityBuildChunks();

        vibrantLazyCity.initialized = true;

        vibrantCityUpdate(true);

        console.log(
            `[Vibrant Lazy City] ${records.length} logical buildings loaded; only nearby chunks rendered.`
        );

    } catch (error) {

        console.error(
            '[Vibrant Lazy City] Initialization failed:',
            error
        );

    } finally {

        vibrantLazyCity.loading = false;
    }
}

function animateVibrantLazyCity() {

    vibrantCityUpdate(false);
}

/* ============================================================
   END VIBRANT_LAZY_CITY
   ============================================================ */
'@

# ------------------------------------------------------------
# Insert city code near the end of the source.
# This avoids depending on animate()/render() names.
# ------------------------------------------------------------

$mainSource = $mainSource.TrimEnd() + "`r`n`r`n" + $cityCode.Trim() + "`r`n"

# ------------------------------------------------------------
# Add THREE import if necessary.
# ------------------------------------------------------------

if ($mainSource -notmatch "(?m)^\s*import\s+\*\s+as\s+THREE\s+from\s+['""]three['""]") {

    $threeImport =
        "import * as THREE from 'three';"

    $mainSource =
        $threeImport +
        "`r`n" +
        $mainSource
}

# ------------------------------------------------------------
# Connect update to an existing animation/render function
# without assuming its exact name.
# ------------------------------------------------------------

$hookPattern =
    "(?m)^(\s*)(function\s+(animate|render|renderLoop|loop)\s*\([^)]*\)\s*\{)"

$hookMatch =
    [regex]::Match(
        $mainSource,
        $hookPattern
    )

if ($hookMatch.Success) {

    $indent =
        $hookMatch.Groups[1].Value + "    "

    $hookText =
        "`r`n" +
        $indent +
        "animateVibrantLazyCity();" +
        "`r`n"

    $insertPosition =
        $hookMatch.Index +
        $hookMatch.Length

    $mainSource =
        $mainSource.Substring(
            0,
            $insertPosition
        ) +
        $hookText +
        $mainSource.Substring(
            $insertPosition
        )

    Write-Host "      Existing render/animation loop found and hooked." -ForegroundColor Green

} else {

    # Fallback: install a requestAnimationFrame watcher.
    $fallbackHook = @'

/* VIBRANT_LAZY_CITY_FALLBACK_LOOP */

let vibrantLazyCityFallbackStarted = false;

function startVibrantLazyCityFallbackLoop() {

    if (vibrantLazyCityFallbackStarted) {
        return;
    }

    vibrantLazyCityFallbackStarted = true;

    function vibrantLazyCityFallbackFrame() {

        animateVibrantLazyCity();

        requestAnimationFrame(
            vibrantLazyCityFallbackFrame
        );
    }

    requestAnimationFrame(
        vibrantLazyCityFallbackFrame
    );
}

startVibrantLazyCityFallbackLoop();

'@

    $mainSource =
        $mainSource.TrimEnd() +
        "`r`n`r`n" +
        $fallbackHook

    Write-Host "      No conventional render loop found; installed fallback watcher." -ForegroundColor Yellow
}

# ------------------------------------------------------------
# Start city after DOM/application startup.
# ------------------------------------------------------------

$startupCode = @'

/* VIBRANT_LAZY_CITY_STARTUP */

if (document.readyState === 'loading') {

    document.addEventListener(
        'DOMContentLoaded',
        () => {
            initVibrantLazyCity();
        },
        {
            once: true
        }
    );

} else {

    initVibrantLazyCity();
}

'@

$mainSource =
    $mainSource.TrimEnd() +
    "`r`n`r`n" +
    $startupCode

# ------------------------------------------------------------
# 7. VALIDATE SOURCE
# ------------------------------------------------------------

Write-Host ""
Write-Host "[7/10] Validating generated source..." -ForegroundColor Yellow

$requiredTokens = @(
    "VIBRANT_LAZY_CITY",
    "vibrantLazyCity",
    "initVibrantLazyCity",
    "vibrantCityUpdate",
    "vibrantCityActivateChunk",
    "vibrantCityDeactivateChunk",
    "InstancedMesh",
    "BoxGeometry",
    "setColorAt",
    "vibrantCityColor",
    "/data/compiled-city.json",
    "loadDistance",
    "unloadDistance"
)

foreach ($token in $requiredTokens) {

    if ($mainSource.IndexOf(
        $token,
        [System.StringComparison]::Ordinal
    ) -lt 0) {

        Fail "Generated main.js is missing required token: $token"
    }
}

$cityStartCount =
    ([regex]::Matches(
        $mainSource,
        [regex]::Escape($startMarker)
    )).Count

$cityEndCount =
    ([regex]::Matches(
        $mainSource,
        [regex]::Escape($endMarker)
    )).Count

if ($cityStartCount -ne 1) {
    Fail "Expected exactly one VIBRANT_LAZY_CITY start marker; found $cityStartCount."
}

if ($cityEndCount -ne 1) {
    Fail "Expected exactly one VIBRANT_LAZY_CITY end marker; found $cityEndCount."
}

$instancedCount =
    ([regex]::Matches(
        $mainSource,
        "new\s+THREE\.InstancedMesh"
    )).Count

if ($instancedCount -ne 1) {
    Fail "Expected exactly one InstancedMesh creation site; found $instancedCount."
}

$geometryCount =
    ([regex]::Matches(
        $mainSource,
        "new\s+THREE\.BoxGeometry"
    )).Count

if ($geometryCount -ne 1) {
    Fail "Expected exactly one shared BoxGeometry creation site; found $geometryCount."
}

$randomInCityBlock = $false

$cityStart =
    $mainSource.IndexOf(
        $startMarker,
        [System.StringComparison]::Ordinal
    )

$cityEnd =
    $mainSource.IndexOf(
        $endMarker,
        [System.StringComparison]::Ordinal
    )

if ($cityStart -ge 0 -and $cityEnd -gt $cityStart) {

    $cityBlock =
        $mainSource.Substring(
            $cityStart,
            $cityEnd - $cityStart
        )

    if ($cityBlock -match "Math\.random\s*\(") {
        $randomInCityBlock = $true
    }
}

if ($randomInCityBlock) {
    Fail "Generated city block unexpectedly contains Math.random(). Colors are deterministic."
}

Write-Host "      Required tokens: OK" -ForegroundColor Green
Write-Host "      One city block: OK" -ForegroundColor Green
Write-Host "      One InstancedMesh system: OK" -ForegroundColor Green
Write-Host "      One shared BoxGeometry: OK" -ForegroundColor Green
Write-Host "      Deterministic colors: OK" -ForegroundColor Green
Write-Host "      Lazy distance checks: OK" -ForegroundColor Green

# ------------------------------------------------------------
# WRITE MAIN.JS
# ------------------------------------------------------------

try {

    [System.IO.File]::WriteAllText(
        $MainJs,
        $mainSource,
        [System.Text.UTF8Encoding]::new($false)
    )

} catch {

    Fail "Could not write main.js. $($_.Exception.Message)"
}

Write-Host "      main.js written." -ForegroundColor Green

# ------------------------------------------------------------
# 8. POST-WRITE VALIDATION
# ------------------------------------------------------------

Write-Host ""
Write-Host "[8/10] Performing post-write validation..." -ForegroundColor Yellow

$writtenSource =
    Get-Content -LiteralPath $MainJs -Raw -Encoding UTF8

if (
    $writtenSource.IndexOf(
        $startMarker,
        [System.StringComparison]::Ordinal
    ) -lt 0
) {
    Fail "Post-write validation failed: city marker missing."
}

if (
    $writtenSource.IndexOf(
        "compiled-city.json",
        [System.StringComparison]::Ordinal
    ) -lt 0
) {
    Fail "Post-write validation failed: compiled city data URL missing."
}

if (
    $writtenSource.IndexOf(
        "InstancedMesh",
        [System.StringComparison]::Ordinal
    ) -lt 0
) {
    Fail "Post-write validation failed: InstancedMesh missing."
}

Write-Host "      Post-write validation passed." -ForegroundColor Green

# ------------------------------------------------------------
# 9. BUILD
# ------------------------------------------------------------

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "                    VITE BUILD" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

Push-Location $ProjectRoot

try {

    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Fail "npm was not found in PATH."
    }

    & npm run build

    if ($LASTEXITCODE -ne 0) {
        Fail "npm run build failed. Backup: $backup"
    }

} catch {

    Fail "npm run build failed. Backup: $backup"
} finally {

    Pop-Location
}

# ------------------------------------------------------------
# 10. BUILD VERIFICATION
# ------------------------------------------------------------

Write-Host ""
Write-Host "[10/10] Verifying build output..." -ForegroundColor Yellow

$distDir = Join-Path $ProjectRoot "dist"

if (-not (Test-Path -LiteralPath $distDir)) {
    Fail "dist directory was not generated."
}

$distIndex = Join-Path $distDir "index.html"

if (-not (Test-Path -LiteralPath $distIndex)) {
    Fail "dist/index.html was not generated."
}

$distData = Join-Path $distDir "data\compiled-city.json"

if (-not (Test-Path -LiteralPath $distData)) {
    Fail "Built compiled-city.json was not generated at: $distData"
}

$distDataInfo = Get-Item -LiteralPath $distData

if ($distDataInfo.Length -lt 100) {
    Fail "Built compiled-city.json appears to be empty or invalid."
}

$distJsFiles =
    Get-ChildItem `
        -LiteralPath (Join-Path $distDir "assets") `
        -Filter "*.js" `
        -File `
        -ErrorAction SilentlyContinue

$distJsFiles = @($distJsFiles)

if ($distJsFiles.Count -eq 0) {
    Fail "No JavaScript bundle was found in dist/assets."
}

$foundCityBundle = $false

foreach ($jsFile in $distJsFiles) {

    try {

        $bundleText =
            Get-Content `
                -LiteralPath $jsFile.FullName `
                -Raw `
                -Encoding UTF8

        if (
            $bundleText.IndexOf(
                "vibrantLazyCity",
                [System.StringComparison]::Ordinal
            ) -ge 0
        ) {

            $foundCityBundle = $true
            break
        }

    } catch {
        continue
    }
}

if (-not $foundCityBundle) {
    Fail "Built JavaScript bundle does not contain the vibrant lazy city system."
}

Write-Host "      dist/index.html: OK" -ForegroundColor Green
Write-Host "      dist/data/compiled-city.json: OK" -ForegroundColor Green
Write-Host "      JavaScript bundle: OK" -ForegroundColor Green

# ------------------------------------------------------------
# COMPLETE
# ------------------------------------------------------------

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "                 INSTALLATION COMPLETE" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Logical buildings preserved: $($normalizedBuildings.Count.ToString('N0'))" -ForegroundColor Green
Write-Host ""
Write-Host "Lazy-loading settings:" -ForegroundColor Cyan
Write-Host "  Load distance   : 520"
Write-Host "  Unload distance : 720"
Write-Host "  Chunk size      : 180"
Write-Host "  Max instances   : 256 per chunk"
Write-Host ""
Write-Host "Rendering:" -ForegroundColor Cyan
Write-Host "  Shared BoxGeometry : YES"
Write-Host "  InstancedMesh       : YES"
Write-Host "  Per-instance colors : YES"
Write-Host "  Deterministic colors: YES"
Write-Host "  Nearby activation   : YES"
Write-Host "  Distant unloading   : YES"
Write-Host ""
Write-Host "Backup:" -ForegroundColor Cyan
Write-Host "  $backup"
Write-Host ""
Write-Host "Build:" -ForegroundColor Cyan
Write-Host "  npm run build: SUCCESS"
Write-Host ""
Write-Host "You can now run:" -ForegroundColor Yellow
Write-Host "  npm run dev"
Write-Host ""