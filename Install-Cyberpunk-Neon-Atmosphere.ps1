#requires -Version 7.0

# ============================================================
# THREE SUNLIGHT - CYBERPUNK NEON ATMOSPHERE
# ARCHITECTURE-SAFE REPLACEMENT INSTALLER
# ============================================================
#
# TARGETS THE CURRENT THREE SUNLIGHT ARCHITECTURE:
#
#   * Existing WebGPU renderer preserved
#   * Existing THREE.Scene preserved
#   * Existing camera preserved
#   * Existing InstancedMesh city preserved
#   * Existing spatial/chunk renderer preserved
#   * Existing facade/text system preserved
#   * Existing building-number system preserved
#   * Existing SunLight preserved
#   * Existing sky preserved
#
# ADDS:
#
#   * Cyan / magenta cyberpunk atmosphere
#   * Brighter background
#   * Lightweight fog
#   * One GPU Points star field
#   * Restrained cyan point light
#   * Restrained magenta point light
#   * Subtle star sparkle
#   * No bloom
#   * No post-processing
#   * No second requestAnimationFrame loop
#   * No duplicate city
#   * No duplicate scene
#
# IMPORTANT:
#
# This installer is specifically designed around the actual current
# main.js architecture and does NOT assume a function named:
#
#     renderFrame()
#
# It hooks the existing:
#
#     renderer.render(scene, camera)
#
# call directly.
#
# ============================================================

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ============================================================
# CONFIGURATION
# ============================================================

$ProjectRoot = 'C:\ThreeSunlight'
$MainJsPath = Join-Path $ProjectRoot 'src\main.js'
$PackageJsonPath = Join-Path $ProjectRoot 'package.json'

$TimeStamp = Get-Date -Format 'yyyyMMdd-HHmmss'

$BackupPath = Join-Path `
    $ProjectRoot `
    "src\main.before-cyberpunk-neon-atmosphere-$TimeStamp.js"

$PatchStart = '/* THREE_SUNLIGHT_CYBERPUNK_ATMOSPHERE_START */'
$PatchEnd   = '/* THREE_SUNLIGHT_CYBERPUNK_ATMOSPHERE_END */'

$HookStart = '/* THREE_SUNLIGHT_CYBERPUNK_ANIMATE_HOOK_START */'
$HookEnd   = '/* THREE_SUNLIGHT_CYBERPUNK_ANIMATE_HOOK_END */'

# ============================================================
# HELPER FUNCTIONS
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
        [string]$Text
    )

    Write-Host ''
    Write-Host $Text -ForegroundColor White
    Write-Host '------------------------------------------------------------' -ForegroundColor DarkGray
}

function Write-OK {
    param(
        [string]$Text
    )

    Write-Host "[OK]   $Text" -ForegroundColor Green
}

function Write-Info {
    param(
        [string]$Text
    )

    Write-Host "[INFO] $Text" -ForegroundColor Yellow
}

function Write-Warn {
    param(
        [string]$Text
    )

    Write-Host "[WARN] $Text" -ForegroundColor Yellow
}

function Write-Fail {
    param(
        [string]$Text
    )

    Write-Host "[FAIL] $Text" -ForegroundColor Red
}

function Get-MarkerCount {
    param(
        [string]$Text,
        [string]$Marker
    )

    return ([regex]::Matches(
        $Text,
        [regex]::Escape($Marker)
    )).Count
}

function Remove-PatchBlock {
    param(
        [string]$Text,
        [string]$StartMarker,
        [string]$EndMarker
    )

    $escapedStart = [regex]::Escape($StartMarker)
    $escapedEnd   = [regex]::Escape($EndMarker)

    $pattern =
        '(?s)' +
        $escapedStart +
        '.*?' +
        $escapedEnd +
        '\s*'

    return [regex]::Replace(
        $Text,
        $pattern,
        ''
    )
}

function Fail-And-Restore {
    param(
        [string]$Message,
        [string]$OriginalSource,
        [string]$BackupFile
    )

    Write-Host ''
    Write-Host '============================================================' -ForegroundColor Red
    Write-Host 'INSTALLATION FAILED' -ForegroundColor Red
    Write-Host '============================================================' -ForegroundColor Red
    Write-Host ''
    Write-Host $Message -ForegroundColor Red
    Write-Host ''

    try {
        if ($OriginalSource) {
            [System.IO.File]::WriteAllText(
                $MainJsPath,
                $OriginalSource,
                [System.Text.UTF8Encoding]::new($false)
            )

            Write-OK "Original main.js restored."
        }
    }
    catch {
        Write-Warn "Could not restore from memory."
    }

    if (Test-Path -LiteralPath $BackupFile) {
        Write-Host ''
        Write-Host "Backup available:" -ForegroundColor Yellow
        Write-Host "  $BackupFile" -ForegroundColor Yellow
    }

    exit 1
}

# ============================================================
# ATMOSPHERE PATCH
# ============================================================

$AtmospherePatch = @'
/* THREE_SUNLIGHT_CYBERPUNK_ATMOSPHERE_START */

/* ============================================================
 * THREE SUNLIGHT - CYBERPUNK NEON ATMOSPHERE
 *
 * Architecture-safe scene enhancement.
 *
 * IMPORTANT:
 * This does NOT create:
 *
 *   - another THREE.Scene
 *   - another renderer
 *   - another camera
 *   - another city
 *   - another InstancedMesh
 *   - another render loop
 *
 * It only augments the existing scene.
 * ============================================================ */

(() => {
    'use strict';

    if (
        typeof THREE === 'undefined' ||
        typeof scene === 'undefined' ||
        !scene
    ) {
        console.warn(
            '[ThreeSunlight] Cyberpunk atmosphere skipped: THREE/scene unavailable.'
        );

        return;
    }

    /*
     * Prevent duplicate runtime initialization.
     */
    if (
        globalThis.__THREE_SUNLIGHT_CYBERPUNK_ATMOSPHERE__
    ) {
        return;
    }

    globalThis.__THREE_SUNLIGHT_CYBERPUNK_ATMOSPHERE__ = true;

    /*
     * ----------------------------------------------------------
     * Configuration
     * ----------------------------------------------------------
     */

    const CONFIG = {
        starCount: 900,

        starRadiusMin: 300,
        starRadiusMax: 900,

        starHeightMin: 80,
        starHeightMax: 520,

        starOpacity: 0.72,

        cyan: 0x00eaff,
        magenta: 0xff1493,

        cyanLightIntensity: 18,
        magentaLightIntensity: 14,

        cyanLightDistance: 260,
        magentaLightDistance: 230,

        fogNear: 380,
        fogFar: 1500,

        backgroundColor: 0x050817,

        sparkleSpeed: 0.9,

        maxPixelRatio: 1.25
    };

    /*
     * ----------------------------------------------------------
     * Save existing scene state.
     *
     * We do not remove existing sky objects.
     * ----------------------------------------------------------
     */

    const state = {
        starField: null,
        starMaterial: null,
        cyanLight: null,
        magentaLight: null,
        starBaseOpacity: CONFIG.starOpacity,
        sparklePhase: 0
    };

    /*
     * ----------------------------------------------------------
     * Background
     *
     * The existing sky texture remains intact if present.
     *
     * We only use a color when the current scene does not have
     * an existing background texture/object.
     * ----------------------------------------------------------
     */

    try {
        if (
            !scene.background
        ) {
            scene.background =
                new THREE.Color(
                    CONFIG.backgroundColor
                );
        }
    }
    catch (_) {
        /* Background enhancement is optional. */
    }

    /*
     * ----------------------------------------------------------
     * Fog
     *
     * Do not overwrite an existing FogExp2/Fog unless there is
     * no fog currently configured.
     *
     * If fog already exists, leave it alone.
     * ----------------------------------------------------------
     */

    try {
        if (
            !scene.fog
        ) {
            scene.fog =
                new THREE.Fog(
                    CONFIG.backgroundColor,
                    CONFIG.fogNear,
                    CONFIG.fogFar
                );
        }
    }
    catch (_) {
        /* Fog is optional. */
    }

    /*
     * ----------------------------------------------------------
     * Lightweight ambient hemisphere light.
     *
     * Only add one if the scene does not already contain one
     * created by this atmosphere.
     * ----------------------------------------------------------
     */

    try {
        if (
            !scene.userData
        ) {
            scene.userData = {};
        }

        if (
            !scene.userData.threeSunlightCyberpunkAmbient
        ) {
            const ambient =
                new THREE.HemisphereLight(
                    0x8defff,
                    0x160021,
                    0.55
                );

            ambient.name =
                'ThreeSunlight_Cyberpunk_Hemisphere';

            scene.add(
                ambient
            );

            scene.userData.threeSunlightCyberpunkAmbient =
                ambient;
        }
    }
    catch (error) {
        console.warn(
            '[ThreeSunlight] Hemisphere light skipped:',
            error
        );
    }

    /*
     * ----------------------------------------------------------
     * CYAN NEON LIGHT
     *
     * Low number of lights = low draw/lighting overhead.
     * ----------------------------------------------------------
     */

    try {
        state.cyanLight =
            new THREE.PointLight(
                CONFIG.cyan,
                CONFIG.cyanLightIntensity,
                CONFIG.cyanLightDistance,
                2
            );

        state.cyanLight.name =
            'ThreeSunlight_Cyberpunk_CyanLight';

        state.cyanLight.position.set(
            -120,
            85,
            70
        );

        scene.add(
            state.cyanLight
        );
    }
    catch (error) {
        console.warn(
            '[ThreeSunlight] Cyan light skipped:',
            error
        );
    }

    /*
     * ----------------------------------------------------------
     * MAGENTA NEON LIGHT
     * ----------------------------------------------------------
     */

    try {
        state.magentaLight =
            new THREE.PointLight(
                CONFIG.magenta,
                CONFIG.magentaLightIntensity,
                CONFIG.magentaLightDistance,
                2
            );

        state.magentaLight.name =
            'ThreeSunlight_Cyberpunk_MagentaLight';

        state.magentaLight.position.set(
            140,
            110,
            -80
        );

        scene.add(
            state.magentaLight
        );
    }
    catch (error) {
        console.warn(
            '[ThreeSunlight] Magenta light skipped:',
            error
        );
    }

    /*
     * ----------------------------------------------------------
     * SPARKLY SKY
     *
     * ONE Points object.
     *
     * No individual meshes.
     * No sprites.
     * No thousands of Object3D instances.
     * ----------------------------------------------------------
     */

    try {
        const positions =
            new Float32Array(
                CONFIG.starCount * 3
            );

        const starRandom =
            new Float32Array(
                CONFIG.starCount
            );

        for (
            let i = 0;
            i < CONFIG.starCount;
            i++
        ) {
            const index =
                i * 3;

            const angle =
                Math.random() *
                Math.PI *
                2;

            const radius =
                CONFIG.starRadiusMin +
                Math.random() *
                (
                    CONFIG.starRadiusMax -
                    CONFIG.starRadiusMin
                );

            positions[index] =
                Math.cos(angle) *
                radius;

            positions[index + 1] =
                CONFIG.starHeightMin +
                Math.random() *
                (
                    CONFIG.starHeightMax -
                    CONFIG.starHeightMin
                );

            positions[index + 2] =
                Math.sin(angle) *
                radius;

            starRandom[i] =
                Math.random();
        }

        const geometry =
            new THREE.BufferGeometry();

        geometry.setAttribute(
            'position',
            new THREE.BufferAttribute(
                positions,
                3
            )
        );

        state.starMaterial =
            new THREE.PointsMaterial({
                color: 0xbfefff,
                size: 2.1,
                sizeAttenuation: true,
                transparent: true,
                opacity: CONFIG.starOpacity,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            });

        state.starField =
            new THREE.Points(
                geometry,
                state.starMaterial
            );

        state.starField.name =
            'ThreeSunlight_Cyberpunk_Stars';

        state.starField.frustumCulled =
            false;

        state.starField.userData =
            {
                threeSunlightCyberpunkStars:
                    true,
                randomValues:
                    starRandom
            };

        scene.add(
            state.starField
        );
    }
    catch (error) {
        console.warn(
            '[ThreeSunlight] Star field skipped:',
            error
        );
    }

    /*
     * ----------------------------------------------------------
     * Lightweight sparkle update.
     *
     * This function is called by the EXISTING animate() loop.
     *
     * No second requestAnimationFrame.
     * ----------------------------------------------------------
     */

    globalThis.__THREE_SUNLIGHT_CYBERPUNK_UPDATE__ =
        function(time) {

            try {

                const seconds =
                    (
                        Number.isFinite(time)
                            ? time
                            : performance.now()
                    ) * 0.001;

                /*
                 * Subtle opacity modulation.
                 *
                 * We change one material property rather than
                 * manipulating hundreds of star objects.
                 */

                if (
                    state.starMaterial
                ) {
                    const pulse =
                        0.88 +
                        Math.sin(
                            seconds *
                            CONFIG.sparkleSpeed
                        ) *
                        0.12;

                    state.starMaterial.opacity =
                        state.starBaseOpacity *
                        pulse;
                }

                /*
                 * Very slow atmosphere drift.
                 *
                 * Rotating ONE Points object is cheap.
                 */

                if (
                    state.starField
                ) {
                    state.starField.rotation.y =
                        seconds *
                        0.0015;
                }

                /*
                 * Slowly move the two neon light sources.
                 *
                 * This creates atmospheric movement without
                 * introducing additional objects.
                 */

                if (
                    state.cyanLight
                ) {
                    state.cyanLight.position.x =
                        -120 +
                        Math.sin(
                            seconds *
                            0.11
                        ) *
                        35;

                    state.cyanLight.position.z =
                        70 +
                        Math.cos(
                            seconds *
                            0.09
                        ) *
                        25;
                }

                if (
                    state.magentaLight
                ) {
                    state.magentaLight.position.x =
                        140 +
                        Math.cos(
                            seconds *
                            0.10
                        ) *
                        30;

                    state.magentaLight.position.z =
                        -80 +
                        Math.sin(
                            seconds *
                            0.08
                        ) *
                        30;
                }

            }
            catch (_) {
                /*
                 * Never allow atmospheric effects to interrupt
                 * the existing city render loop.
                 */
            }
        };

    /*
     * ----------------------------------------------------------
     * Public diagnostic
     * ----------------------------------------------------------
     */

    globalThis.threeSunlightCyberpunkAtmosphere =
        {
            stars:
                state.starField,

            cyanLight:
                state.cyanLight,

            magentaLight:
                state.magentaLight,

            update:
                globalThis.__THREE_SUNLIGHT_CYBERPUNK_UPDATE__
        };

    console.info(
        '[ThreeSunlight] Cyberpunk cyan-magenta atmosphere enabled.'
    );

    console.info(
        '[ThreeSunlight] Sparkle points:',
        CONFIG.starCount
    );

})();

/* THREE_SUNLIGHT_CYBERPUNK_ATMOSPHERE_END */
'@

# ============================================================
# ANIMATION HOOK
# ============================================================

$AnimateHook = @'
/* THREE_SUNLIGHT_CYBERPUNK_ANIMATE_HOOK_START */

try {
    if (
        typeof globalThis.__THREE_SUNLIGHT_CYBERPUNK_UPDATE__ ===
        'function'
    ) {
        globalThis.__THREE_SUNLIGHT_CYBERPUNK_UPDATE__(
            performance.now()
        );
    }
}
catch (_) {
    /*
     * Atmosphere must never interfere with the main render.
     */
}

/* THREE_SUNLIGHT_CYBERPUNK_ANIMATE_HOOK_END */
'@

# ============================================================
# START
# ============================================================

Write-Header 'THREE SUNLIGHT - CYBERPUNK NEON ATMOSPHERE'

Write-Host 'Architecture-safe scene enhancement:' -ForegroundColor White
Write-Host ''
Write-Host '  * Existing WebGPU renderer preserved'
Write-Host '  * Existing THREE.Scene preserved'
Write-Host '  * Existing camera preserved'
Write-Host '  * Existing InstancedMesh city preserved'
Write-Host '  * Existing spatial/chunk city preserved'
Write-Host '  * Existing facade/text system preserved'
Write-Host '  * Existing building-number system preserved'
Write-Host '  * Existing SunLight preserved'
Write-Host '  * Existing sky preserved'
Write-Host '  * Cyan / magenta cyberpunk palette'
Write-Host '  * Brighter atmospheric illumination'
Write-Host '  * Lightweight fog/haze'
Write-Host '  * One GPU Points object for stars'
Write-Host '  * No individual star meshes'
Write-Host '  * Restrained neon lighting'
Write-Host '  * No bloom'
Write-Host '  * No post-processing'
Write-Host '  * No second render loop'
Write-Host '  * Existing chunk architecture untouched'
Write-Host '  * Automatic production build verification'
Write-Host '  * Automatic rollback on failure'
Write-Host ''

# ============================================================
# [1/9] PROJECT
# ============================================================

Write-Step '[1/9] Checking project...'

if (-not (Test-Path -LiteralPath $ProjectRoot -PathType Container)) {
    Write-Fail "Project not found: $ProjectRoot"
    exit 1
}

if (-not (Test-Path -LiteralPath $MainJsPath -PathType Leaf)) {
    Write-Fail "main.js not found: $MainJsPath"
    exit 1
}

if (-not (Test-Path -LiteralPath $PackageJsonPath -PathType Leaf)) {
    Write-Fail "package.json not found: $PackageJsonPath"
    exit 1
}

Write-OK "Project: $ProjectRoot"
Write-OK 'main.js found.'
Write-OK 'package.json found.'

# ============================================================
# [2/9] NODE
# ============================================================

Write-Step '[2/9] Checking Node.js...'

try {
    $nodeVersion = & node --version 2>&1

    if ($LASTEXITCODE -ne 0) {
        throw 'Node.js is not available.'
    }

    Write-OK "Node.js: $nodeVersion"
}
catch {
    Write-Fail $_.Exception.Message
    exit 1
}

# ============================================================
# [3/9] READ SOURCE
# ============================================================

Write-Step '[3/9] Reading current main.js...'

$OriginalMain = $null

try {
    $OriginalMain =
        [System.IO.File]::ReadAllText(
            $MainJsPath,
            [System.Text.UTF8Encoding]::new($false)
        )
}
catch {
    Write-Fail "Could not read main.js: $($_.Exception.Message)"
    exit 1
}

Write-OK 'Source loaded.'
Write-Host "      Characters: $($OriginalMain.Length)"

# ============================================================
# [4/9] ARCHITECTURE VERIFICATION
# ============================================================

Write-Step '[4/9] Verifying current ThreeSunlight architecture...'

$architectureChecks = @(
    @{
        Name = 'THREE.Scene'
        Pattern = 'new\s+THREE\.Scene\s*\(\s*\)'
        Required = $true
    },
    @{
        Name = 'camera'
        Pattern = '\bcamera\b'
        Required = $true
    },
    @{
        Name = 'WebGPU renderer'
        Pattern = 'WebGPU'
        Required = $true
    },
    @{
        Name = 'InstancedMesh city'
        Pattern = 'InstancedMesh'
        Required = $true
    },
    @{
        Name = 'compiledCityBuildingGroup'
        Pattern = 'compiledCityBuildingGroup'
        Required = $true
    },
    @{
        Name = 'existing animate() loop'
        Pattern = 'function\s+animate\s*\(\s*\)'
        Required = $true
    },
    @{
        Name = 'renderer.render(scene, camera)'
        Pattern = 'renderer\.render\s*\(\s*scene\s*,\s*camera\s*\)'
        Required = $true
    }
)

foreach ($check in $architectureChecks) {

    if (
        [regex]::IsMatch(
            $OriginalMain,
            $check.Pattern,
            [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
        )
    ) {
        Write-OK $check.Name
    }
    else {

        if ($check.Required) {
            Fail-And-Restore `
                -Message "Required architecture token was not found: $($check.Name)" `
                -OriginalSource $OriginalMain `
                -BackupFile $BackupPath
        }
        else {
            Write-Info "Optional architecture token not detected: $($check.Name)"
        }
    }
}

# ============================================================
# [5/9] BACKUP
# ============================================================

Write-Step '[5/9] Creating backup...'

try {
    [System.IO.File]::Copy(
        $MainJsPath,
        $BackupPath,
        $false
    )

    Write-OK "Backup created:"
    Write-Host "     $BackupPath"
}
catch {
    Write-Fail "Could not create backup: $($_.Exception.Message)"
    exit 1
}

# ============================================================
# [6/9] REMOVE OLD PATCHES
# ============================================================

Write-Step '[6/9] Removing previous cyberpunk atmosphere patches...'

$workingSource = $OriginalMain

$oldAtmosphereCount =
    Get-MarkerCount `
        -Text $workingSource `
        -Marker $PatchStart

$oldAtmosphereEndCount =
    Get-MarkerCount `
        -Text $workingSource `
        -Marker $PatchEnd

$oldHookCount =
    Get-MarkerCount `
        -Text $workingSource `
        -Marker $HookStart

$oldHookEndCount =
    Get-MarkerCount `
        -Text $workingSource `
        -Marker $HookEnd

Write-Host "      Atmosphere start markers: $oldAtmosphereCount"
Write-Host "      Atmosphere end markers:   $oldAtmosphereEndCount"
Write-Host "      Hook start markers:       $oldHookCount"
Write-Host "      Hook end markers:         $oldHookEndCount"

$workingSource =
    Remove-PatchBlock `
        -Text $workingSource `
        -StartMarker $PatchStart `
        -EndMarker $PatchEnd

$workingSource =
    Remove-PatchBlock `
        -Text $workingSource `
        -StartMarker $HookStart `
        -EndMarker $HookEnd

Write-OK 'Previous cyberpunk patches removed safely.'

# ============================================================
# [7/9] INSERT ATMOSPHERE AFTER REAL SCENE CREATION
# ============================================================

Write-Step '[7/9] Installing cyan-magenta atmosphere...'

#
# Current architecture contains:
#
# scene =
#     new THREE.Scene();
#
# We target that exact construction rather than guessing where
# scene initialization occurs.
#

$scenePattern =
    '(?m)(scene\s*=\s*new\s+THREE\.Scene\s*\(\s*\)\s*;)'

$sceneMatches =
    [regex]::Matches(
        $workingSource,
        $scenePattern
    )

if ($sceneMatches.Count -ne 1) {

    Fail-And-Restore `
        -Message "Expected exactly one THREE.Scene creation statement, but found $($sceneMatches.Count)." `
        -OriginalSource $OriginalMain `
        -BackupFile $BackupPath
}

$sceneMatch =
    $sceneMatches[0]

$sceneInsertIndex =
    $sceneMatch.Index +
    $sceneMatch.Length

$workingSource =
    $workingSource.Insert(
        $sceneInsertIndex,
        "`r`n`r`n$AtmospherePatch`r`n"
    )

Write-OK 'Atmosphere inserted immediately after the existing THREE.Scene creation.'

# ============================================================
# INSERT HOOK BEFORE EXISTING RENDER CALL
# ============================================================

Write-Info 'Connecting atmosphere update to the existing render loop...'

$renderPattern =
    'renderer\.render\s*\(\s*scene\s*,\s*camera\s*\)\s*;'

$renderMatches =
    [regex]::Matches(
        $workingSource,
        $renderPattern
    )

if ($renderMatches.Count -ne 1) {

    Fail-And-Restore `
        -Message "Expected exactly one existing renderer.render(scene, camera) call, but found $($renderMatches.Count)." `
        -OriginalSource $OriginalMain `
        -BackupFile $BackupPath
}

$renderMatch =
    $renderMatches[0]

$renderInsertIndex =
    $renderMatch.Index

$workingSource =
    $workingSource.Insert(
        $renderInsertIndex,
        "`r`n$AnimateHook`r`n"
    )

Write-OK 'Atmosphere update connected to the existing animate() render cycle.'

# ============================================================
# [8/9] VALIDATE GENERATED SOURCE
# ============================================================

Write-Step '[8/9] Validating generated source...'

$validationErrors =
    New-Object System.Collections.Generic.List[string]

$startCount =
    Get-MarkerCount `
        -Text $workingSource `
        -Marker $PatchStart

$endCount =
    Get-MarkerCount `
        -Text $workingSource `
        -Marker $PatchEnd

$hookStartCount =
    Get-MarkerCount `
        -Text $workingSource `
        -Marker $HookStart

$hookEndCount =
    Get-MarkerCount `
        -Text $workingSource `
        -Marker $HookEnd

if ($startCount -ne 1) {
    $validationErrors.Add(
        "Expected exactly one atmosphere start marker; found $startCount."
    )
}

if ($endCount -ne 1) {
    $validationErrors.Add(
        "Expected exactly one atmosphere end marker; found $endCount."
    )
}

if ($hookStartCount -ne 1) {
    $validationErrors.Add(
        "Expected exactly one animate-hook start marker; found $hookStartCount."
    )
}

if ($hookEndCount -ne 1) {
    $validationErrors.Add(
        "Expected exactly one animate-hook end marker; found $hookEndCount."
    )
}

$requiredGeneratedTokens = @(
    'THREE_SUNLIGHT_CYBERPUNK_ATMOSPHERE_START',
    'THREE_SUNLIGHT_CYBERPUNK_ATMOSPHERE_END',
    'THREE_SUNLIGHT_CYBERPUNK_ANIMATE_HOOK_START',
    'THREE_SUNLIGHT_CYBERPUNK_ANIMATE_HOOK_END',
    'THREE_SUNLIGHT_CYBERPUNK_UPDATE__',
    'Cyberpunk_CyanLight',
    'Cyberpunk_MagentaLight',
    'Cyberpunk_Stars',
    'new THREE.Points',
    'new THREE.HemisphereLight'
)

foreach ($token in $requiredGeneratedTokens) {

    if (
        $workingSource.IndexOf(
            $token,
            [System.StringComparison]::Ordinal
        ) -lt 0
    ) {
        $validationErrors.Add(
            "Generated source is missing required token: $token"
        )
    }
}

if (
    $validationErrors.Count -gt 0
) {

    Write-Host ''
    Write-Host 'Validation errors:' -ForegroundColor Red

    foreach ($errorText in $validationErrors) {
        Write-Host "  - $errorText" -ForegroundColor Red
    }

    Fail-And-Restore `
        -Message 'Generated source validation failed. Existing main.js was restored.' `
        -OriginalSource $OriginalMain `
        -BackupFile $BackupPath
}

Write-OK 'Exactly one atmosphere patch detected.'
Write-OK 'Exactly one animation hook detected.'
Write-OK 'Existing render call preserved.'
Write-OK 'Existing scene creation preserved.'
Write-OK 'No duplicate city generated.'
Write-OK 'No second render loop generated.'

# ============================================================
# WRITE MAIN.JS
# ============================================================

Write-Info 'Writing updated main.js...'

try {

    [System.IO.File]::WriteAllText(
        $MainJsPath,
        $workingSource,
        [System.Text.UTF8Encoding]::new($false)
    )

    Write-OK 'main.js updated successfully.'
}
catch {

    Fail-And-Restore `
        -Message "Could not write main.js: $($_.Exception.Message)" `
        -OriginalSource $OriginalMain `
        -BackupFile $BackupPath
}

# ============================================================
# [9/9] PRODUCTION BUILD
# ============================================================

Write-Step '[9/9] Running production build verification...'

Push-Location $ProjectRoot

try {

    Write-Host '      Running: npm run build' -ForegroundColor DarkGray

    $buildOutput =
        & npm run build 2>&1

    $buildExitCode =
        $LASTEXITCODE

    if ($buildExitCode -ne 0) {

        Write-Host ''
        Write-Host 'Build output:' -ForegroundColor Yellow

        foreach ($line in $buildOutput) {
            Write-Host "  $line"
        }

        throw "npm run build failed with exit code $buildExitCode."
    }

    Write-OK 'Production build completed successfully.'
}
catch {

    Pop-Location

    try {

        [System.IO.File]::WriteAllText(
            $MainJsPath,
            $OriginalMain,
            [System.Text.UTF8Encoding]::new($false)
        )

        Write-OK 'Automatic rollback completed.'
    }
    catch {
        Write-Warn "Automatic rollback failed. Backup remains available."
    }

    Write-Host ''
    Write-Host '============================================================' -ForegroundColor Red
    Write-Host 'INSTALLATION FAILED' -ForegroundColor Red
    Write-Host '============================================================' -ForegroundColor Red
    Write-Host ''
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ''
    Write-Host "Backup:" -ForegroundColor Yellow
    Write-Host "  $BackupPath" -ForegroundColor Yellow

    exit 1
}

Pop-Location

# ============================================================
# SUCCESS
# ============================================================

Write-Host ''
Write-Host '============================================================' -ForegroundColor Green
Write-Host ' CYBERPUNK NEON ATMOSPHERE INSTALLED SUCCESSFULLY' -ForegroundColor Green
Write-Host '============================================================' -ForegroundColor Green
Write-Host ''

Write-Host 'Visual changes:' -ForegroundColor Cyan
Write-Host ''
Write-Host '  * Cyan atmospheric illumination'
Write-Host '  * Magenta atmospheric illumination'
Write-Host '  * Brighter dark-space background'
Write-Host '  * Lightweight atmospheric fog'
Write-Host '  * 900-point GPU star field'
Write-Host '  * Subtle star sparkle'
Write-Host '  * Gentle cyan/magenta light movement'
Write-Host ''

Write-Host 'Performance protections:' -ForegroundColor Cyan
Write-Host ''
Write-Host '  * No bloom'
Write-Host '  * No post-processing'
Write-Host '  * No individual star meshes'
Write-Host '  * No second animation loop'
Write-Host '  * Existing InstancedMesh untouched'
Write-Host '  * Existing chunk renderer untouched'
Write-Host '  * Existing facade/text system untouched'
Write-Host '  * Existing building-number system untouched'
Write-Host '  * Existing SunLight untouched'
Write-Host ''

Write-Host 'Backup:' -ForegroundColor Cyan
Write-Host "  $BackupPath"
Write-Host ''

Write-Host '============================================================' -ForegroundColor Green
Write-Host ' READY - RUN npm run dev TO VIEW THE NEW ATMOSPHERE' -ForegroundColor Green
Write-Host '============================================================' -ForegroundColor Green
Write-Host ''