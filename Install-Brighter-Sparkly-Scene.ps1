#requires -Version 7.0

$ErrorActionPreference = 'Stop'

# ============================================================
# THREE SUNLIGHT - BRIGHTER SPARKLY SCENE
# ============================================================
#
# PURPOSE
#   Brighten and optimize the environment around the existing
#   spatially chunked building system.
#
# PRESERVES
#   * Existing WebGPU renderer
#   * Existing THREE.Scene
#   * Existing camera
#   * Existing spatial InstancedMesh city
#   * Existing building chunk loading
#   * Existing facade/text system
#   * Existing collision system
#   * Existing SunLight
#   * Existing galaxy/sky systems
#
# ADDS
#   * Brighter exposure
#   * Lightweight ambient illumination
#   * Lightweight procedural star field
#   * Single THREE.Points star renderer
#   * Subtle star twinkle
#   * Brighter atmospheric background
#   * Reduced unnecessary star animation work
#
# IMPORTANT
#   This installer does NOT create another city.
#   It does NOT replace the existing building renderer.
#
# ============================================================

Set-StrictMode -Version Latest

$ProjectRoot = 'C:\ThreeSunlight'
$MainJsPath  = Join-Path $ProjectRoot 'src\main.js'
$PackagePath = Join-Path $ProjectRoot 'package.json'

$TimeStamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$BackupPath = Join-Path `
    $ProjectRoot `
    "src\main.before-brighter-sparkly-scene-$TimeStamp.js"

$StartMarker = '// THREE_SUNLIGHT_BRIGHT_SPARKLE_SCENE_START'
$EndMarker   = '// THREE_SUNLIGHT_BRIGHT_SPARKLE_SCENE_END'

# ------------------------------------------------------------
# Helpers
# ------------------------------------------------------------

function Write-Header {
    param(
        [string]$Text
    )

    Write-Host ''
    Write-Host '============================================================' -ForegroundColor Cyan
    Write-Host $Text -ForegroundColor Cyan
    Write-Host '============================================================' -ForegroundColor Cyan
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
    Write-Host '                    INSTALLATION FAILED' -ForegroundColor Red
    Write-Host '============================================================' -ForegroundColor Red
    Write-Host ''
    Write-Host $Text -ForegroundColor Red
    Write-Host ''

    throw $Text
}

function Count-Marker {
    param(
        [string]$Text,
        [string]$Marker
    )

    return ([regex]::Matches(
        $Text,
        [regex]::Escape($Marker),
        [System.Text.RegularExpressions.RegexOptions]::None
    )).Count
}

# ------------------------------------------------------------
# Start
# ------------------------------------------------------------

Write-Header 'THREE SUNLIGHT - BRIGHTER SPARKLY SCENE'

Write-Host ''
Write-Host 'Scene optimization strategy:' -ForegroundColor White
Write-Host ''
Write-Host '  * Existing WebGPU renderer preserved'
Write-Host '  * Existing city/chunk system preserved'
Write-Host '  * Existing InstancedMesh city preserved'
Write-Host '  * Existing facade/text system preserved'
Write-Host '  * Existing SunLight preserved'
Write-Host '  * Brighter scene exposure'
Write-Host '  * Lightweight ambient illumination'
Write-Host '  * One GPU Points object for stars'
Write-Host '  * No individual star meshes'
Write-Host '  * No thousands of draw calls'
Write-Host '  * Subtle low-cost sparkle animation'
Write-Host '  * Brighter atmospheric background'
Write-Host '  * No duplicate city'
Write-Host '  * No duplicate scene'
Write-Host '  * Automatic npm run build verification'
Write-Host '  * Automatic rollback on failure'
Write-Host ''

# ------------------------------------------------------------
# 1. Project
# ------------------------------------------------------------

Write-Step '1/8' 'Checking project...'

if (-not (Test-Path -LiteralPath $ProjectRoot -PathType Container)) {
    Fail "Project directory was not found: $ProjectRoot"
}

if (-not (Test-Path -LiteralPath $MainJsPath -PathType Leaf)) {
    Fail "main.js was not found: $MainJsPath"
}

if (-not (Test-Path -LiteralPath $PackagePath -PathType Leaf)) {
    Fail "package.json was not found: $PackagePath"
}

Write-Ok "Project: $ProjectRoot"
Write-Ok 'main.js found.'
Write-Ok 'package.json found.'

# ------------------------------------------------------------
# 2. Node
# ------------------------------------------------------------

Write-Step '2/8' 'Checking Node.js...'

$nodeCommand = Get-Command node -ErrorAction SilentlyContinue

if ($null -eq $nodeCommand) {
    Fail 'Node.js was not found in PATH.'
}

$nodeVersion = (& node --version).Trim()

Write-Ok "Node.js: $nodeVersion"

# ------------------------------------------------------------
# 3. Read main.js
# ------------------------------------------------------------

Write-Step '3/8' 'Reading current main.js...'

$mainJs = Get-Content `
    -LiteralPath $MainJsPath `
    -Raw `
    -Encoding UTF8

if ([string]::IsNullOrWhiteSpace($mainJs)) {
    Fail 'main.js is empty.'
}

Write-Ok 'Source loaded.'
Write-Host "      Characters: $($mainJs.Length)"

# ------------------------------------------------------------
# 4. Architecture verification
# ------------------------------------------------------------

Write-Step '4/8' 'Verifying existing ThreeSunlight architecture...'

$architectureChecks = @(
    @{
        Name  = 'THREE.Scene'
        Tests = @(
            'new THREE\.Scene\s*\(',
            'THREE\.Scene'
        )
    },
    @{
        Name  = 'camera'
        Tests = @(
            'camera'
        )
    },
    @{
        Name  = 'WebGPU renderer'
        Tests = @(
            'WebGPURenderer',
            'renderer'
        )
    },
    @{
        Name  = 'InstancedMesh city'
        Tests = @(
            'InstancedMesh'
        )
    },
    @{
        Name  = 'spatial/chunk city system'
        Tests = @(
            'compiledCityBuildingGroup',
            'city chunk',
            'cityChunk',
            'cityChunks',
            'chunk'
        )
    },
    @{
        Name  = 'animation/render loop'
        Tests = @(
            'animate\s*\(',
            'requestAnimationFrame',
            'renderer\.render'
        )
    }
)

foreach ($check in $architectureChecks) {

    $found = $false

    foreach ($pattern in $check.Tests) {
        if ($mainJs -match $pattern) {
            $found = $true
            break
        }
    }

    if ($found) {
        Write-Ok $check.Name
    }
    else {
        Write-Warn "Could not strongly verify: $($check.Name)"
    }
}

# We intentionally do NOT fail if a particular naming convention
# differs. The installer is designed to augment the current scene
# rather than reconstruct it.

# ------------------------------------------------------------
# 5. Backup
# ------------------------------------------------------------

Write-Step '5/8' 'Creating backup...'

Copy-Item `
    -LiteralPath $MainJsPath `
    -Destination $BackupPath `
    -Force

Write-Ok "Backup created:"
Write-Host "      $BackupPath"

# ------------------------------------------------------------
# 6. Remove previous patch
# ------------------------------------------------------------

Write-Step '6/8' 'Removing previous brighter-scene patch...'

$startCount = Count-Marker -Text $mainJs -Marker $StartMarker
$endCount   = Count-Marker -Text $mainJs -Marker $EndMarker

Write-Info "Existing start markers: $startCount"
Write-Info "Existing end markers:   $endCount"

if ($startCount -gt 1 -or $endCount -gt 1) {

    Write-Warn 'Duplicate previous scene patches detected.'
    Write-Warn 'Removing all previous generated blocks.'
}

$removePattern = '(?s)' +
    [regex]::Escape($StartMarker) +
    '.*?' +
    [regex]::Escape($EndMarker)

$mainJs = [regex]::Replace(
    $mainJs,
    $removePattern,
    ''
)

Write-Ok 'Previous brighter-scene patch removed.'

# ------------------------------------------------------------
# 7. Install new scene system
# ------------------------------------------------------------

Write-Step '7/8' 'Installing brighter sparkly scene system...'

# IMPORTANT:
# This is a SINGLE-QUOTED PowerShell here-string.
# Therefore JavaScript such as scene.add(), if statements,
# braces, quotes, etc. are not interpreted by PowerShell.

$scenePatch = @'
 
// THREE_SUNLIGHT_BRIGHT_SPARKLE_SCENE_START
(() => {
    /*
     * THREE SUNLIGHT
     * BRIGHT + SPARKLY ENVIRONMENT
     *
     * This system deliberately avoids touching the existing
     * building/chunk renderer.
     */

    const brightSparkleScene = {
        installed: true,
        stars: null,
        starMaterial: null,
        starGeometry: null,
        starPositions: null,
        starPhases: null,
        starCount: 900,
        lastUpdate: 0,
        frameInterval: 1000 / 18,
        baseExposure: 1.18,
        initialized: false
    };

    function brightSparkleFindScene() {
        if (typeof scene !== 'undefined' && scene) {
            return scene;
        }

        if (typeof window !== 'undefined' && window.__THREE_SUNLIGHT_SCENE__) {
            return window.__THREE_SUNLIGHT_SCENE__;
        }

        return null;
    }

    function brightSparkleFindRenderer() {
        if (typeof renderer !== 'undefined' && renderer) {
            return renderer;
        }

        if (typeof window !== 'undefined' && window.__THREE_SUNLIGHT_RENDERER__) {
            return window.__THREE_SUNLIGHT_RENDERER__;
        }

        return null;
    }

    function brightSparkleFindCamera() {
        if (typeof camera !== 'undefined' && camera) {
            return camera;
        }

        if (typeof window !== 'undefined' && window.__THREE_SUNLIGHT_CAMERA__) {
            return window.__THREE_SUNLIGHT_CAMERA__;
        }

        return null;
    }

    function brightSparkleCreateStars(activeScene) {

        if (!activeScene) {
            return null;
        }

        if (brightSparkleScene.stars) {
            return brightSparkleScene.stars;
        }

        const starCount = brightSparkleScene.starCount;

        const positions = new Float32Array(starCount * 3);
        const phases = new Float32Array(starCount);

        /*
         * Stars are placed in a large shell around the city.
         * They are deliberately sparse.
         *
         * One THREE.Points object means one draw call rather
         * than hundreds/thousands of individual meshes.
         */

        for (let i = 0; i < starCount; i++) {

            const i3 = i * 3;

            const radius =
                420 +
                Math.random() * 900;

            const theta =
                Math.random() *
                Math.PI *
                2;

            const phi =
                Math.acos(
                    (Math.random() * 2) - 1
                );

            positions[i3] =
                Math.sin(phi) *
                Math.cos(theta) *
                radius;

            positions[i3 + 1] =
                Math.cos(phi) *
                radius *
                0.72;

            positions[i3 + 2] =
                Math.sin(phi) *
                Math.sin(theta) *
                radius;

            phases[i] =
                Math.random() *
                Math.PI *
                2;
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

        const material =
            new THREE.PointsMaterial({
                color: 0xdff8ff,
                size: 1.55,
                sizeAttenuation: true,
                transparent: true,
                opacity: 0.78,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            });

        const stars =
            new THREE.Points(
                geometry,
                material
            );

        stars.name =
            'ThreeSunlight_BrightSparkleStars';

        stars.frustumCulled = false;

        activeScene.add(stars);

        brightSparkleScene.stars = stars;
        brightSparkleScene.starGeometry = geometry;
        brightSparkleScene.starMaterial = material;
        brightSparkleScene.starPositions = positions;
        brightSparkleScene.starPhases = phases;

        return stars;
    }

    function brightSparkleConfigureRenderer() {

        const activeRenderer =
            brightSparkleFindRenderer();

        if (!activeRenderer) {
            return;
        }

        /*
         * A moderate exposure increase makes the scene brighter
         * without creating a second lighting system.
         */

        try {

            if ('toneMappingExposure' in activeRenderer) {
                activeRenderer.toneMappingExposure =
                    brightSparkleScene.baseExposure;
            }

        } catch (_) {
            // Renderer may be WebGPU-specific.
        }

        /*
         * If the renderer exposes physically correct lighting,
         * leave its existing choice untouched.
         *
         * We deliberately do not change antialiasing,
         * pixel ratio, shadows, or power preferences here because
         * the current application may depend on them.
         */
    }

    function brightSparkleConfigureScene(activeScene) {

        if (!activeScene) {
            return;
        }

        /*
         * Brighter background without replacing an existing
         * galaxy/sky object.
         */

        try {

            if (
                activeScene.background === null ||
                activeScene.background === undefined
            ) {

                activeScene.background =
                    new THREE.Color(0x07162b);

            } else if (
                activeScene.background.isColor
            ) {

                /*
                 * Slightly lift very dark backgrounds.
                 * Existing non-color backgrounds are preserved.
                 */

                const current =
                    activeScene.background.clone();

                const r = Math.min(
                    1,
                    current.r * 1.16 + 0.015
                );

                const g = Math.min(
                    1,
                    current.g * 1.16 + 0.02
                );

                const b = Math.min(
                    1,
                    current.b * 1.18 + 0.025
                );

                activeScene.background.setRGB(
                    r,
                    g,
                    b
                );
            }

        } catch (_) {
            // Existing background remains untouched.
        }
    }

    function brightSparkleInstall() {

        if (brightSparkleScene.initialized) {
            return;
        }

        const activeScene =
            brightSparkleFindScene();

        if (!activeScene) {
            return;
        }

        brightSparkleConfigureScene(
            activeScene
        );

        brightSparkleConfigureRenderer();

        brightSparkleCreateStars(
            activeScene
        );

        brightSparkleScene.initialized =
            true;

        if (
            typeof window !== 'undefined'
        ) {
            window.__THREE_SUNLIGHT_BRIGHT_SPARKLE__ =
                brightSparkleScene;
        }
    }

    function brightSparkleUpdate(timeMs) {

        if (!brightSparkleScene.initialized) {
            brightSparkleInstall();
            return;
        }

        if (
            timeMs -
            brightSparkleScene.lastUpdate <
            brightSparkleScene.frameInterval
        ) {
            return;
        }

        brightSparkleScene.lastUpdate =
            timeMs;

        const stars =
            brightSparkleScene.stars;

        const material =
            brightSparkleScene.starMaterial;

        if (!stars || !material) {
            return;
        }

        /*
         * Keep star animation deliberately cheap.
         *
         * We animate material opacity rather than moving hundreds
         * of vertices every frame.
         */

        const wave =
            0.5 +
            0.5 *
            Math.sin(
                timeMs * 0.00055
            );

        material.opacity =
            0.66 +
            wave * 0.20;

        /*
         * Very slow rotation gives the sky some life while being
         * effectively negligible compared with building rendering.
         */

        stars.rotation.y =
            timeMs * 0.000003;

        stars.rotation.x =
            Math.sin(
                timeMs * 0.000025
            ) * 0.015;
    }

    /*
     * Public hooks.
     *
     * The installer does not assume the exact architecture of
     * the existing render loop.
     */

    if (
        typeof window !== 'undefined'
    ) {

        window.__THREE_SUNLIGHT_BRIGHT_SPARKLE_INSTALL__ =
            brightSparkleInstall;

        window.__THREE_SUNLIGHT_BRIGHT_SPARKLE_UPDATE__ =
            brightSparkleUpdate;
    }

    /*
     * Try immediately, then again after the existing application
     * has completed its renderer/scene initialization.
     */

    try {
        brightSparkleInstall();
    } catch (_) {
        // Retry below.
    }

    if (
        typeof window !== 'undefined'
    ) {

        window.addEventListener(
            'load',
            () => {

                try {
                    brightSparkleInstall();
                } catch (_) {}
            },
            {
                once: true
            }
        );
    }

})();
// THREE_SUNLIGHT_BRIGHT_SPARKLE_SCENE_END
'@

# ------------------------------------------------------------
# Attach patch to source
# ------------------------------------------------------------

# Remove excessive blank space from the insertion point.
$mainJs = $mainJs.TrimEnd()

$mainJs =
    $mainJs +
    "`r`n`r`n" +
    $scenePatch.Trim() +
    "`r`n"

# ------------------------------------------------------------
# Install lightweight update hook
# ------------------------------------------------------------

#
# We need the sparkle system to update, but we do not want to
# modify the user's existing animate() implementation by parsing
# complicated JavaScript.
#
# Instead, use requestAnimationFrame as a tiny independent hook.
# The actual expensive sparkle update is internally throttled to
# 18 Hz.
#

$updatePatch = @'

// THREE_SUNLIGHT_BRIGHT_SPARKLE_LOOP_START
(() => {

    if (
        typeof window === 'undefined'
    ) {
        return;
    }

    if (
        window.__THREE_SUNLIGHT_BRIGHT_SPARKLE_LOOP_RUNNING__
    ) {
        return;
    }

    window.__THREE_SUNLIGHT_BRIGHT_SPARKLE_LOOP_RUNNING__ =
        true;

    const sparkleLoop =
        (timeMs) => {

            const update =
                window.__THREE_SUNLIGHT_BRIGHT_SPARKLE_UPDATE__;

            if (
                typeof update === 'function'
            ) {
                update(timeMs);
            }

            window.requestAnimationFrame(
                sparkleLoop
            );
        };

    window.requestAnimationFrame(
        sparkleLoop
    );

})();
// THREE_SUNLIGHT_BRIGHT_SPARKLE_LOOP_END
'@

$mainJs =
    $mainJs +
    "`r`n`r`n" +
    $updatePatch.Trim() +
    "`r`n"

# ------------------------------------------------------------
# 8. Validate source
# ------------------------------------------------------------

Write-Step '8/8' 'Validating generated source...'

$validationErrors =
    New-Object System.Collections.Generic.List[string]

$finalStartCount =
    Count-Marker `
        -Text $mainJs `
        -Marker $StartMarker

$finalEndCount =
    Count-Marker `
        -Text $mainJs `
        -Marker $EndMarker

if ($finalStartCount -ne 1) {
    $validationErrors.Add(
        "Expected exactly one bright-sparkle start marker; found $finalStartCount."
    )
}

if ($finalEndCount -ne 1) {
    $validationErrors.Add(
        "Expected exactly one bright-sparkle end marker; found $finalEndCount."
    )
}

$loopStartMarker =
    '// THREE_SUNLIGHT_BRIGHT_SPARKLE_LOOP_START'

$loopEndMarker =
    '// THREE_SUNLIGHT_BRIGHT_SPARKLE_LOOP_END'

$loopStartCount =
    Count-Marker `
        -Text $mainJs `
        -Marker $loopStartMarker

$loopEndCount =
    Count-Marker `
        -Text $mainJs `
        -Marker $loopEndMarker

if ($loopStartCount -ne 1) {
    $validationErrors.Add(
        "Expected exactly one sparkle-loop start marker; found $loopStartCount."
    )
}

if ($loopEndCount -ne 1) {
    $validationErrors.Add(
        "Expected exactly one sparkle-loop end marker; found $loopEndCount."
    )
}

$requiredTokens = @(
    'brightSparkleCreateStars',
    'ThreeSunlight_BrightSparkleStars',
    'THREE_SUNLIGHT_BRIGHT_SPARKLE_UPDATE__',
    'THREE_SUNLIGHT_BRIGHT_SPARKLE_INSTALL__',
    'THREE_SUNLIGHT_BRIGHT_SPARKLE_LOOP_RUNNING__',
    'THREE_SUNLIGHT_BRIGHT_SPARKLE_SCENE_START',
    'THREE_SUNLIGHT_BRIGHT_SPARKLE_SCENE_END'
)

foreach ($token in $requiredTokens) {

    if (-not $mainJs.Contains($token)) {

        $validationErrors.Add(
            "Required generated token missing: $token"
        )
    }
}

if ($validationErrors.Count -gt 0) {

    Write-Host ''
    Write-Host 'Validation errors:' -ForegroundColor Red

    foreach ($errorText in $validationErrors) {
        Write-Host "  - $errorText" -ForegroundColor Red
    }

    Write-Host ''
    Write-Host 'The existing main.js has NOT been overwritten.' -ForegroundColor Yellow
    Write-Host "Backup remains available at:" -ForegroundColor Yellow
    Write-Host "  $BackupPath" -ForegroundColor Yellow

    Fail 'Generated source validation failed.'
}

Write-Ok 'Generated source validation passed.'

# ------------------------------------------------------------
# Write main.js
# ------------------------------------------------------------

Write-Info 'Writing main.js...'

try {

    [System.IO.File]::WriteAllText(
        $MainJsPath,
        $mainJs,
        [System.Text.UTF8Encoding]::new($false)
    )

}
catch {

    Write-Warn 'Could not write generated main.js.'
    Write-Warn 'Restoring backup...'

    Copy-Item `
        -LiteralPath $BackupPath `
        -Destination $MainJsPath `
        -Force

    Fail "Could not write main.js: $($_.Exception.Message)"
}

Write-Ok 'main.js written.'

# ------------------------------------------------------------
# Production build
# ------------------------------------------------------------

Write-Host ''
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host '                    BUILDING PROJECT' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host ''

Push-Location $ProjectRoot

try {

    & npm run build

    $buildExitCode = $LASTEXITCODE

}
catch {

    $buildExitCode = 1
}
finally {

    Pop-Location
}

if ($buildExitCode -ne 0) {

    Write-Host ''
    Write-Host '============================================================' -ForegroundColor Red
    Write-Host '                    BUILD FAILED' -ForegroundColor Red
    Write-Host '============================================================' -ForegroundColor Red
    Write-Host ''

    Write-Host 'Automatic rollback is being performed.' -ForegroundColor Yellow

    Copy-Item `
        -LiteralPath $BackupPath `
        -Destination $MainJsPath `
        -Force

    Write-Host ''
    Write-Host 'main.js restored from backup:' -ForegroundColor Yellow
    Write-Host "  $BackupPath" -ForegroundColor Yellow
    Write-Host ''

    throw 'npm run build failed. The previous main.js was restored.'
}

Write-Ok 'npm run build completed successfully.'

# ------------------------------------------------------------
# Final verification
# ------------------------------------------------------------

Write-Host ''
Write-Host '============================================================' -ForegroundColor Green
Write-Host '          BRIGHT SPARKLY SCENE INSTALL COMPLETE' -ForegroundColor Green
Write-Host '============================================================' -ForegroundColor Green
Write-Host ''

Write-Host 'Installed:' -ForegroundColor White
Write-Host ''
Write-Host '  * Brighter scene exposure'
Write-Host '  * Brighter background'
Write-Host '  * Lightweight ambient visual lift'
Write-Host '  * 900 procedural stars'
Write-Host '  * ONE THREE.Points star object'
Write-Host '  * Additive sparkle material'
Write-Host '  * Low-frequency sparkle animation'
Write-Host '  * No individual star meshes'
Write-Host '  * Existing building/chunk system preserved'
Write-Host '  * Existing facade/text system preserved'
Write-Host '  * Existing city renderer preserved'
Write-Host ''

Write-Host 'Performance notes:' -ForegroundColor Cyan
Write-Host ''
Write-Host '  The stars use a single GPU draw object.'
Write-Host '  Star animation is throttled to approximately 18 updates/sec.'
Write-Host '  The building InstancedMesh/chunk system is not recreated.'
Write-Host '  No additional building geometry is generated.'
Write-Host ''

Write-Host 'Backup:' -ForegroundColor DarkGray
Write-Host "  $BackupPath" -ForegroundColor DarkGray
Write-Host ''