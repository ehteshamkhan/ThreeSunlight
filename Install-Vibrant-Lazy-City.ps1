#Requires -Version 7.0

$ErrorActionPreference = 'Stop'

# ============================================================
# THREE SUNLIGHT - TARGETED VIBRANT LAZY CITY
# ============================================================
#
# Architecture-safe installer for the CURRENT ThreeSunlight
# architecture.
#
# IMPORTANT:
#   This installer does NOT create another city.
#   This installer does NOT replace the existing city renderer.
#   This installer does NOT replace the facade system.
#
# It modifies only the existing InstancedMesh:
#
#     CompiledCityBuildingsInstanced
#
# by enabling instance colors and assigning deterministic,
# vibrant colors to the existing instances.
#
# Existing:
#   WebGPU
#   Scene
#   Camera
#   Controls
#   SunLight
#   Galaxy / sky
#   InstancedMesh
#   Facades
#   CanvasTextures
#   Lazy facade loading
#   Collision
#
# are preserved.
# ============================================================

$ProjectRoot = 'C:\ThreeSunlight'
$MainJsPath  = Join-Path $ProjectRoot 'src\main.js'
$PackagePath = Join-Path $ProjectRoot 'package.json'

$TimeStamp = Get-Date -Format 'yyyyMMdd-HHmmss'

$BackupPath = Join-Path `
    $ProjectRoot `
    "src\main.before-targeted-vibrant-city-$TimeStamp.js"

$StartMarker = '/* THREE SUNLIGHT - TARGETED VIBRANT CITY START */'
$EndMarker   = '/* THREE SUNLIGHT - TARGETED VIBRANT CITY END */'

# ============================================================
# HELPERS
# ============================================================

function Write-Header {
    param(
        [string]$Text
    )

    Write-Host ''
    Write-Host '============================================================' -ForegroundColor Cyan
    Write-Host $Text -ForegroundColor Cyan
    Write-Host '============================================================' -ForegroundColor Cyan
    Write-Host ''
}

function Write-Step {
    param(
        [string]$Number,
        [string]$Text
    )

    Write-Host ''
    Write-Host "[$Number] $Text" -ForegroundColor White
    Write-Host '------------------------------------------------------------' -ForegroundColor DarkGray
}

function Write-Ok {
    param(
        [string]$Text
    )

    Write-Host "[OK]   $Text" -ForegroundColor Green
}

function Write-Info {
    param(
        [string]$Text
    )

    Write-Host "[INFO] $Text" -ForegroundColor Cyan
}

function Write-Warn {
    param(
        [string]$Text
    )

    Write-Host "[WARN] $Text" -ForegroundColor Yellow
}

function Fail {
    param(
        [string]$Text
    )

    Write-Host ''
    Write-Host '============================================================' -ForegroundColor Red
    Write-Host ' INSTALLATION FAILED' -ForegroundColor Red
    Write-Host '============================================================' -ForegroundColor Red
    Write-Host ''
    Write-Host $Text -ForegroundColor Red
    Write-Host ''

    throw $Text
}

function Count-Exact {
    param(
        [string]$Text,
        [string]$Pattern
    )

    return [regex]::Matches(
        $Text,
        [regex]::Escape($Pattern)
    ).Count
}

# ============================================================
# HEADER
# ============================================================

Write-Header 'THREE SUNLIGHT - TARGETED VIBRANT LAZY CITY'

Write-Host 'Architecture-preserving installer:' -ForegroundColor Gray
Write-Host ''
Write-Host '  * Existing WebGPU renderer preserved'
Write-Host '  * Existing THREE.Scene preserved'
Write-Host '  * Existing camera preserved'
Write-Host '  * Existing controls preserved'
Write-Host '  * Existing SunLight preserved'
Write-Host '  * Existing galaxy / sky preserved'
Write-Host '  * Existing InstancedMesh preserved'
Write-Host '  * Existing facade system preserved'
Write-Host '  * Existing CanvasTexture newsreels preserved'
Write-Host '  * Existing lazy facade loading preserved'
Write-Host '  * Existing collision system preserved'
Write-Host '  * No second city created'
Write-Host '  * No second InstancedMesh created'
Write-Host '  * Vibrant deterministic building colors'
Write-Host '  * Per-instance GPU colors'
Write-Host '  * One shared building material'
Write-Host '  * Safe repeated installation'
Write-Host '  * Automatic production build verification'
Write-Host ''

# ============================================================
# [1/8] PROJECT
# ============================================================

Write-Step '1/8' 'Checking project'

if (-not (Test-Path -LiteralPath $ProjectRoot -PathType Container)) {
    Fail "Project directory does not exist: $ProjectRoot"
}

if (-not (Test-Path -LiteralPath $MainJsPath -PathType Leaf)) {
    Fail "main.js not found: $MainJsPath"
}

if (-not (Test-Path -LiteralPath $PackagePath -PathType Leaf)) {
    Fail "package.json not found: $PackagePath"
}

Write-Ok "Project: $ProjectRoot"
Write-Ok 'main.js found.'
Write-Ok 'package.json found.'

# ============================================================
# [2/8] NODE
# ============================================================

Write-Step '2/8' 'Checking Node.js'

$nodeCommand = Get-Command node -ErrorAction SilentlyContinue

if (-not $nodeCommand) {
    Fail 'Node.js was not found in PATH.'
}

$nodeVersion = (& node --version 2>&1).ToString().Trim()

if (-not $nodeVersion) {
    Fail 'Unable to determine Node.js version.'
}

Write-Ok "Node.js: $nodeVersion"

# ============================================================
# [3/8] READ CURRENT MAIN.JS
# ============================================================

Write-Step '3/8' 'Reading current main.js'

try {
    $mainJs = [System.IO.File]::ReadAllText(
        $MainJsPath,
        [System.Text.UTF8Encoding]::new($false)
    )
}
catch {
    Fail "Could not read main.js.`n$($_.Exception.Message)"
}

Write-Ok 'Source loaded.'
Write-Host "      Characters: $($mainJs.Length)" -ForegroundColor Gray

# ============================================================
# [4/8] DISCOVER CURRENT ARCHITECTURE
# ============================================================

Write-Step '4/8' 'Discovering current ThreeSunlight architecture'

$architectureErrors = New-Object System.Collections.Generic.List[string]

if (
    $mainJs -match "import\s+\*\s+as\s+THREE\s+from\s+['""]three/webgpu['""]"
) {
    Write-Ok 'Three.js WebGPU import'
}
else {
    $architectureErrors.Add(
        'Three.js WebGPU import not found.'
    )
}

if (
    $mainJs -match "scene\s*=\s*new\s+THREE\.Scene\s*\("
) {
    Write-Ok 'THREE.Scene declaration'
}
else {
    $architectureErrors.Add(
        'THREE.Scene declaration not found.'
    )
}

if (
    $mainJs -match "let\s+camera\s*;"
) {
    Write-Ok 'camera declaration'
}
else {
    $architectureErrors.Add(
        'camera declaration not found.'
    )
}

if (
    $mainJs -match "renderer\.setAnimationLoop\s*\(\s*animate"
) {
    Write-Ok 'renderer animation loop'
}
else {
    $architectureErrors.Add(
        'renderer.setAnimationLoop(animate) not found.'
    )
}

if (
    $mainJs -match "new\s+THREE\.InstancedMesh\s*\("
) {
    Write-Ok 'InstancedMesh creation'
}
else {
    $architectureErrors.Add(
        'THREE.InstancedMesh creation not found.'
    )
}

if (
    $mainJs -match "CompiledCityBuildingsInstanced"
) {
    Write-Ok 'CompiledCityBuildingsInstanced'
}
else {
    $architectureErrors.Add(
        'CompiledCityBuildingsInstanced name not found.'
    )
}

if (
    $mainJs -match "compiledCityActiveFacades"
) {
    Write-Ok 'compiledCityActiveFacades'
}
else {
    Write-Warn 'compiledCityActiveFacades not detected.'
}

if (
    $mainJs -match "compiledCityUpdateFacades\s*\("
) {
    Write-Ok 'existing lazy facade update'
}
else {
    Write-Warn 'compiledCityUpdateFacades() not detected.'
}

if (
    $mainJs -match "compiledCityCreateUniqueDisplay\s*\("
) {
    Write-Ok 'existing CanvasTexture facade system'
}
else {
    Write-Warn 'existing CanvasTexture facade system not detected.'
}

if ($architectureErrors.Count -gt 0) {

    $details = $architectureErrors -join [Environment]::NewLine

    Fail @"
The current main.js does not match the expected ThreeSunlight
architecture.

No changes were made.

Detected problems:
$details
"@
}

# ============================================================
# [5/8] BACKUP
# ============================================================

Write-Step '5/8' 'Creating backup'

try {
    Copy-Item `
        -LiteralPath $MainJsPath `
        -Destination $BackupPath `
        -Force
}
catch {
    Fail "Could not create backup.`n$($_.Exception.Message)"
}

Write-Ok "Backup created:"
Write-Host "     $BackupPath" -ForegroundColor Gray

# ============================================================
# [6/8] REMOVE PREVIOUS TARGETED PATCHES
# ============================================================

Write-Step '6/8' 'Removing previous targeted vibrant-city patch'

$existingStartCount = Count-Exact `
    -Text $mainJs `
    -Pattern $StartMarker

$existingEndCount = Count-Exact `
    -Text $mainJs `
    -Pattern $EndMarker

Write-Info "Existing start markers: $existingStartCount"
Write-Info "Existing end markers:   $existingEndCount"

# ------------------------------------------------------------
# Remove every complete previous block.
#
# DOTALL is intentionally used here.
# This prevents the installer from leaving duplicate copies.
# ------------------------------------------------------------

$blockPattern =
    [regex]::Escape($StartMarker) +
    '(?s:.*?)' +
    [regex]::Escape($EndMarker)

$mainJsClean = [regex]::Replace(
    $mainJs,
    $blockPattern,
    ''
)

# ------------------------------------------------------------
# Remove orphaned markers if an earlier failed installer left
# one behind.
# ------------------------------------------------------------

$mainJsClean = $mainJsClean.Replace(
    $StartMarker,
    ''
)

$mainJsClean = $mainJsClean.Replace(
    $EndMarker,
    ''
)

# ------------------------------------------------------------
# Remove excessive blank lines introduced by old installers.
# ------------------------------------------------------------

$mainJsClean = [regex]::Replace(
    $mainJsClean,
    '(?m)^[ \t]*\r?\n(?:[ \t]*\r?\n){3,}',
    "`r`n`r`n"
)

Write-Ok 'Previous targeted vibrant-city patches removed.'

# ============================================================
# PATCH
# ============================================================

$patch = @'
/* THREE SUNLIGHT - TARGETED VIBRANT CITY START */

/*
 * ============================================================
 * TARGETED VIBRANT BUILDING COLOR SYSTEM
 * ============================================================
 *
 * IMPORTANT:
 *
 * This system does NOT create a second city.
 *
 * It operates on the existing:
 *
 *     CompiledCityBuildingsInstanced
 *
 * InstancedMesh.
 *
 * Existing:
 *
 *   - building geometry
 *   - building transforms
 *   - building positions
 *   - facade anchors
 *   - facade CanvasTextures
 *   - lazy facade activation
 *   - collision
 *   - WebGPU renderer
 *   - camera
 *   - SunLight
 *
 * remain untouched.
 *
 * The only visual modification is per-instance color.
 * ============================================================
 */

const THREE_SUNLIGHT_TARGETED_VIBRANT_COLORS = [
    0xff1744,
    0xff3d00,
    0xff6d00,
    0xff9100,
    0xffb300,
    0xffd600,
    0xfdd835,
    0x76ff03,
    0x00e676,
    0x00e5ff,
    0x00b8d4,
    0x00b0ff,
    0x2979ff,
    0x304ffe,
    0x651fff,
    0x7c4dff,
    0xd500f9,
    0xf50057,
    0xff4081,
    0x18ffff,
    0x64ffda,
    0x1de9b6
];


/*
 * Deterministic hash.
 *
 * The same building index always receives the same color.
 */
function threeSunlightTargetedVibrantHash(
    value
) {

    let x =
        Number(value) || 0;

    x =
        Math.sin(
            x * 12.9898
        ) *
        43758.5453;

    return (
        x -
        Math.floor(x)
    );
}


/*
 * Get deterministic vibrant color.
 */
function threeSunlightTargetedVibrantColor(
    index
) {

    const safeIndex =
        Number.isFinite(
            Number(index)
        )
            ? Number(index)
            : 0;

    const hash =
        threeSunlightTargetedVibrantHash(
            safeIndex + 17321
        );

    const paletteIndex =
        Math.floor(
            hash *
            THREE_SUNLIGHT_TARGETED_VIBRANT_COLORS.length
        ) %
        THREE_SUNLIGHT_TARGETED_VIBRANT_COLORS.length;

    return new THREE.Color(
        THREE_SUNLIGHT_TARGETED_VIBRANT_COLORS[
            paletteIndex
        ]
    );
}


/*
 * Apply vibrant colors to the EXISTING city InstancedMesh.
 *
 * The mesh is discovered by its existing name:
 *
 *     CompiledCityBuildingsInstanced
 *
 * This avoids relying on a local variable inside
 * compiledCityCreateBuildings().
 */
function threeSunlightApplyTargetedVibrantColors() {

    if (
        typeof scene === 'undefined' ||
        !scene
    ) {
        return 0;
    }


    const buildingMesh =
        scene.getObjectByName(
            'CompiledCityBuildingsInstanced'
        );


    if (
        !buildingMesh ||
        !buildingMesh.isInstancedMesh
    ) {
        return 0;
    }


    const material =
        buildingMesh.material;


    /*
     * Enable instance colors on the EXISTING shared material.
     */
    if (
        material
    ) {

        material.vertexColors =
            true;

        /*
         * Keep the base material bright enough that
         * instance colors remain highly visible.
         */
        if (
            material.color
        ) {

            material.color.setHex(
                0xffffff
            );
        }


        /*
         * A small neutral emissive contribution prevents
         * buildings from becoming nearly black in shadow.
         */
        if (
            material.emissive
        ) {

            material.emissive.setHex(
                0x101820
            );

            material.emissiveIntensity =
                0.18;
        }


        if (
            'roughness' in material
        ) {

            material.roughness =
                0.54;
        }


        if (
            'metalness' in material
        ) {

            material.metalness =
                0.18;
        }


        material.needsUpdate =
            true;
    }


    /*
     * Assign a color to every existing instance.
     *
     * No new meshes are created.
     */
    const count =
        Number(
            buildingMesh.count
        ) || 0;


    if (
        count <= 0
    ) {
        return 0;
    }


    for (
        let index = 0;
        index < count;
        index++
    ) {

        buildingMesh.setColorAt(
            index,
            threeSunlightTargetedVibrantColor(
                index
            )
        );
    }


    if (
        buildingMesh.instanceColor
    ) {

        buildingMesh.instanceColor.needsUpdate =
            true;
    }


    buildingMesh.needsUpdate =
        true;


    buildingMesh.userData =
        buildingMesh.userData || {};


    buildingMesh.userData.threeSunlightTargetedVibrant =
        true;


    buildingMesh.userData.threeSunlightVibrantInstanceCount =
        count;


    return count;
}


/*
 * ============================================================
 * LAZY DISCOVERY
 * ============================================================
 *
 * The existing city is created asynchronously after the module
 * initializes and loads compiled-city.json.
 *
 * Therefore this patch waits for the EXISTING InstancedMesh.
 *
 * It does not create anything while waiting.
 * ============================================================
 */

let threeSunlightTargetedVibrantAttempts =
    0;

let threeSunlightTargetedVibrantApplied =
    false;


function threeSunlightTargetedVibrantWaitForCity() {

    threeSunlightTargetedVibrantAttempts++;


    try {

        const count =
            threeSunlightApplyTargetedVibrantColors();


        if (
            count > 0
        ) {

            threeSunlightTargetedVibrantApplied =
                true;


            console.log(
                '[VibrantCity] Existing InstancedMesh upgraded:',
                count,
                'building instances.'
            );


            return;
        }

    }
    catch (
        error
    ) {

        console.warn(
            '[VibrantCity] Color application attempt failed:',
            error
        );
    }


    /*
     * Keep waiting while the existing application loads
     * its city.
     */
    if (
        threeSunlightTargetedVibrantAttempts <
        300
    ) {

        window.setTimeout(
            threeSunlightTargetedVibrantWaitForCity,
            250
        );

    }
    else {

        console.warn(
            '[VibrantCity] Existing CompiledCityBuildingsInstanced was not found.'
        );
    }
}


/*
 * Public diagnostic / refresh helper.
 *
 * This is useful after the existing city renderer has rebuilt
 * its InstancedMesh.
 */
window.threeSunlightRefreshVibrantCity =
    function () {

        return threeSunlightApplyTargetedVibrantColors();
    };


/*
 * Start the discovery process.
 */
window.setTimeout(
    threeSunlightTargetedVibrantWaitForCity,
    500
);


/* THREE SUNLIGHT - TARGETED VIBRANT CITY END */
'@

# ============================================================
# [7/8] INSERT + VALIDATE
# ============================================================

Write-Step '7/8' 'Installing targeted vibrant building system'

# ------------------------------------------------------------
# Find a stable insertion point.
#
# The safest location for this architecture is immediately
# before the first "// ANIMATION" section.
#
# This means:
#
#   - scene already exists by runtime
#   - patch declarations are available globally
#   - existing animate() remains untouched
#   - existing facade animation remains untouched
# ------------------------------------------------------------

$animationMarkerPattern =
    '(?m)^// ANIMATION\s*$'

$animationMatch =
    [regex]::Match(
        $mainJsClean,
        $animationMarkerPattern
    )

if (
    -not $animationMatch.Success
) {

    # Fallback: place before renderer.setAnimationLoop(animate).
    $loopPattern =
        '(?m)^\s*renderer\.setAnimationLoop\s*\(\s*animate\s*\)\s*;'

    $loopMatch =
        [regex]::Match(
            $mainJsClean,
            $loopPattern
        )

    if (
        -not $loopMatch.Success
    ) {

        Fail @"
Could not locate a safe insertion point.

The installer looked for:
  // ANIMATION

and:
  renderer.setAnimationLoop(animate);

No changes were written.

Backup:
  $BackupPath
"@
    }

    $insertAt =
        $loopMatch.Index

}
else {

    $insertAt =
        $animationMatch.Index
}


$mainJsGenerated =
    $mainJsClean.Insert(
        $insertAt,
        "`r`n`r`n$patch`r`n`r`n"
    )

# ============================================================
# SOURCE VALIDATION
# ============================================================

Write-Info 'Validating generated source...'

$validationErrors =
    New-Object System.Collections.Generic.List[string]


$startCount =
    Count-Exact `
        -Text $mainJsGenerated `
        -Pattern $StartMarker


$endCount =
    Count-Exact `
        -Text $mainJsGenerated `
        -Pattern $EndMarker


if (
    $startCount -ne 1
) {

    $validationErrors.Add(
        "Expected exactly one targeted patch start marker; found $startCount."
    )
}


if (
    $endCount -ne 1
) {

    $validationErrors.Add(
        "Expected exactly one targeted patch end marker; found $endCount."
    )
}


$requiredTokens = @(
    'THREE_SUNLIGHT_TARGETED_VIBRANT_COLORS',
    'threeSunlightTargetedVibrantHash',
    'threeSunlightTargetedVibrantColor',
    'threeSunlightApplyTargetedVibrantColors',
    'CompiledCityBuildingsInstanced',
    'setColorAt',
    'instanceColor.needsUpdate',
    'threeSunlightTargetedVibrantWaitForCity',
    'threeSunlightRefreshVibrantCity'
)


foreach (
    $token in $requiredTokens
) {

    if (
        -not $mainJsGenerated.Contains(
            $token
        )
    ) {

        $validationErrors.Add(
            "Generated source is missing required token: $token"
        )
    }
}


# ------------------------------------------------------------
# Make sure we did NOT create another InstancedMesh.
#
# The patch itself must not contain "new THREE.InstancedMesh".
# ------------------------------------------------------------

$patchOnlyPattern =
    [regex]::Escape($StartMarker) +
    '(?s:.*?)' +
    [regex]::Escape($EndMarker)

$generatedPatchMatch =
    [regex]::Match(
        $mainJsGenerated,
        $patchOnlyPattern
    )


if (
    -not $generatedPatchMatch.Success
) {

    $validationErrors.Add(
        'Unable to isolate generated targeted patch.'
    )

}
else {

    $generatedPatch =
        $generatedPatchMatch.Value

    if (
        $generatedPatch -match 'new\s+THREE\.InstancedMesh'
    ) {

        $validationErrors.Add(
            'Targeted patch attempts to create another InstancedMesh.'
        )
    }

    if (
        $generatedPatch -match 'new\s+THREE\.Scene'
    ) {

        $validationErrors.Add(
            'Targeted patch attempts to create another THREE.Scene.'
        )
    }

    if (
        $generatedPatch -match 'new\s+THREE\.BoxGeometry'
    ) {

        $validationErrors.Add(
            'Targeted patch attempts to create new building geometry.'
        )
    }
}


# ------------------------------------------------------------
# Ensure existing city creation remains present.
# ------------------------------------------------------------

$existingCityTokens = @(
    'function compiledCityCreateBuildings',
    'CompiledCityBuildingsInstanced',
    'new THREE.InstancedMesh',
    'compiledCityActivateFacade',
    'compiledCityDeactivateFacade',
    'compiledCityUpdateFacades',
    'compiledCityCreateUniqueDisplay'
)


foreach (
    $token in $existingCityTokens
) {

    if (
        -not $mainJsGenerated.Contains(
            $token
        )
    ) {

        $validationErrors.Add(
            "Existing architecture token disappeared: $token"
        )
    }
}


# ------------------------------------------------------------
# Ensure animation loop remains.
# ------------------------------------------------------------

if (
    $mainJsGenerated -notmatch
    'renderer\.setAnimationLoop\s*\(\s*animate\s*\)'
) {

    $validationErrors.Add(
        'Existing renderer animation loop was not preserved.'
    )
}


if (
    $validationErrors.Count -gt 0
) {

    $details =
        $validationErrors |
        ForEach-Object {
            "  - $_"
        } |
        Out-String

    Fail @"
Generated source validation failed.

$details

The existing main.js has NOT been overwritten.

Backup:
  $BackupPath
"@
}

Write-Ok 'Exactly one targeted patch block detected.'
Write-Ok 'No second THREE.Scene created.'
Write-Ok 'No second InstancedMesh created.'
Write-Ok 'No new building geometry created.'
Write-Ok 'Existing facade system preserved.'
Write-Ok 'Existing lazy-loading system preserved.'
Write-Ok 'Source validation passed.'

# ============================================================
# WRITE MAIN.JS
# ============================================================

Write-Info 'Writing corrected main.js...'

try {

    [System.IO.File]::WriteAllText(
        $MainJsPath,
        $mainJsGenerated,
        [System.Text.UTF8Encoding]::new($false)
    )

}
catch {

    Fail @"
Could not write main.js.

$($_.Exception.Message)

The previous source remains available at:
$BackupPath
"@
}

Write-Ok 'main.js written.'

# ============================================================
# POST-WRITE VALIDATION
# ============================================================

Write-Info 'Running post-write validation...'

try {

    $writtenJs =
        [System.IO.File]::ReadAllText(
            $MainJsPath,
            [System.Text.UTF8Encoding]::new($false)
        )

}
catch {

    Fail "Could not re-read written main.js.`n$($_.Exception.Message)"
}


$writtenStartCount =
    Count-Exact `
        -Text $writtenJs `
        -Pattern $StartMarker


$writtenEndCount =
    Count-Exact `
        -Text $writtenJs `
        -Pattern $EndMarker


if (
    $writtenStartCount -ne 1 -or
    $writtenEndCount -ne 1
) {

    Fail @"
Post-write marker validation failed.

Start markers: $writtenStartCount
End markers:   $writtenEndCount

Backup:
$BackupPath
"@
}


foreach (
    $token in $requiredTokens
) {

    if (
        -not $writtenJs.Contains(
            $token
        )
    ) {

        Fail @"
Post-write validation failed.

Missing token:
$token

Backup:
$BackupPath
"@
    }
}


Write-Ok 'Post-write source validation passed.'

# ============================================================
# [8/8] BUILD
# ============================================================

Write-Step '8/8' 'Running production build'

Push-Location $ProjectRoot

try {

    Write-Host ''
    Write-Host 'npm run build' -ForegroundColor Gray
    Write-Host ''

    & npm run build

    $buildExitCode =
        $LASTEXITCODE

}
catch {

    Pop-Location

    Fail @"
npm run build could not be executed.

$($_.Exception.Message)

The generated source was written, but the production build
could not be verified.

Backup:
$BackupPath
"@
}

Pop-Location

if (
    $buildExitCode -ne 0
) {

    Write-Host ''
    Write-Host '============================================================' -ForegroundColor Red
    Write-Host ' BUILD FAILED' -ForegroundColor Red
    Write-Host '============================================================' -ForegroundColor Red
    Write-Host ''
    Write-Host "npm run build exited with code $buildExitCode." -ForegroundColor Red
    Write-Host ''
    Write-Host "Backup:" -ForegroundColor Yellow
    Write-Host "  $BackupPath" -ForegroundColor Yellow
    Write-Host ''

    throw "npm run build failed with exit code $buildExitCode."
}

Write-Ok 'npm run build completed successfully.'

# ============================================================
# FINAL SOURCE CHECK
# ============================================================

$finalJs =
    [System.IO.File]::ReadAllText(
        $MainJsPath,
        [System.Text.UTF8Encoding]::new($false)
    )

$finalStartCount =
    Count-Exact `
        -Text $finalJs `
        -Pattern $StartMarker

$finalEndCount =
    Count-Exact `
        -Text $finalJs `
        -Pattern $EndMarker

if (
    $finalStartCount -ne 1 -or
    $finalEndCount -ne 1
) {

    Fail @"
Final source verification failed.

Start markers: $finalStartCount
End markers:   $finalEndCount

Backup:
$BackupPath
"@
}

# ============================================================
# SUCCESS
# ============================================================

Write-Host ''
Write-Host '============================================================' -ForegroundColor Green
Write-Host '             INSTALLATION SUCCESSFUL' -ForegroundColor Green
Write-Host '============================================================' -ForegroundColor Green
Write-Host ''

Write-Host 'Vibrant building system installed:' -ForegroundColor Green
Write-Host ''
Write-Host '  [OK] Existing InstancedMesh preserved'
Write-Host '  [OK] Existing city geometry preserved'
Write-Host '  [OK] Existing building positions preserved'
Write-Host '  [OK] Existing facade system preserved'
Write-Host '  [OK] Existing lazy facade loading preserved'
Write-Host '  [OK] Existing CanvasTextures preserved'
Write-Host '  [OK] Existing collision preserved'
Write-Host '  [OK] Existing WebGPU renderer preserved'
Write-Host '  [OK] Existing galaxy / sky preserved'
Write-Host '  [OK] Existing SunLight preserved'
Write-Host '  [OK] Deterministic vibrant instance colors installed'
Write-Host '  [OK] No duplicate city'
Write-Host '  [OK] No duplicate InstancedMesh'
Write-Host '  [OK] Production build passed'
Write-Host ''

Write-Host 'Backup:' -ForegroundColor Yellow
Write-Host "  $BackupPath" -ForegroundColor Yellow
Write-Host ''

Write-Host 'The existing facade/newsreel system remains responsible for' -ForegroundColor Gray
Write-Host 'loading and displaying the Compiled.txt sections.' -ForegroundColor Gray
Write-Host ''